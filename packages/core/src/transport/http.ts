import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createMcpHandler, type McpHttpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { getEnv } from '../config/env.js';
import { getAllCircuitBreakerStats } from '../resilience/circuit-breaker.js';
import { getProductService } from '../services/product.service.js';
import { SERVER_NAME, VERSION } from '../version.js';
import { getLogger } from './logger.js';
import type { McpServer } from '@modelcontextprotocol/server';

const logger = getLogger().child('http-transport');

const ALLOWED_HEADERS = [
  'Content-Type', 'Accept', 'Authorization', 'Last-Event-ID',
  'Mcp-Protocol-Version', 'Mcp-Session-Id', 'Mcp-Method', 'Mcp-Name',
].join(', ');

const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

/**
 * Streamable HTTP transport (stateless). Serves both 2025-era clients
 * (initialize handshake) and 2026-07-28 clients from the same factory.
 *
 * Endpoints: POST/GET/DELETE /mcp, GET /health, GET /
 */
export class HttpTransport {
  private server: Server | null = null;
  private readonly mcpHandler: McpHttpHandler;
  private readonly nodeHandler: ReturnType<typeof toNodeHandler>;
  private readonly allowedOrigins: string[];

  constructor(factory: () => McpServer) {
    this.mcpHandler = createMcpHandler(factory, {
      onerror: (error) => logger.warn('MCP handler error', error),
    });
    this.nodeHandler = toNodeHandler(this.mcpHandler, {
      onerror: (error) => logger.error('MCP request failed', error),
    });
    this.allowedOrigins = (getEnv().ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }

  /**
   * The underlying fetch-style handler (useful for tests and serverless hosts)
   */
  get handler(): McpHttpHandler {
    return this.mcpHandler;
  }

  start(port = getEnv().HTTP_PORT, host = getEnv().HTTP_HOST): Promise<{ port: number }> {
    return new Promise((resolve, reject) => {
      this.server = createHttpServer((req, res) => {
        this.handleRequest(req, res).catch((error: unknown) => {
          logger.error('Request handling error', error);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
          }
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        });
      });

      this.server.once('error', reject);
      this.server.listen(port, host, () => {
        const address = this.server!.address();
        const actualPort = typeof address === 'object' && address ? address.port : port;
        logger.info(`HTTP server listening on http://${host}:${actualPort}/mcp`);
        resolve({ port: actualPort });
      });
    });
  }

  async stop(): Promise<void> {
    await this.mcpHandler.close();
    await new Promise<void>((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
      this.server.closeAllConnections?.();
    });
    logger.info('HTTP server stopped');
  }

  /**
   * Origins allowed to call the server from a browser. Requests without an
   * Origin header (CLIs, server-to-server) are always allowed.
   */
  private isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return true;
    if (this.allowedOrigins.includes('*') || this.allowedOrigins.includes(origin)) return true;
    return this.allowedOrigins.length === 0 && LOCALHOST_ORIGIN.test(origin);
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const origin = req.headers.origin;

    // DNS-rebinding protection required by the MCP Streamable HTTP spec
    if (!this.isOriginAllowed(origin)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Origin not allowed: ${origin}` }));
      return;
    }

    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
      res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, Mcp-Protocol-Version');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    switch (url.pathname) {
      case '/mcp':
        await this.nodeHandler(req, res);
        return;
      case '/health':
        this.json(res, 200, {
          status: 'healthy',
          version: VERSION,
          timestamp: new Date().toISOString(),
          sources: getProductService().enabledSources(),
          circuitBreakers: getAllCircuitBreakerStats(),
        });
        return;
      case '/':
        this.json(res, 200, {
          name: SERVER_NAME,
          version: VERSION,
          transport: 'streamable-http',
          endpoints: { mcp: '/mcp', health: '/health' },
        });
        return;
      default:
        this.json(res, 404, { error: 'Not Found' });
    }
  }

  private json(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  }
}

export function createHttpTransport(factory: () => McpServer): HttpTransport {
  return new HttpTransport(factory);
}
