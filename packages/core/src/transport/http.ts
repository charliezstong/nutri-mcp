import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getEnv } from '../config/env.js';
import { getLogger } from './logger.js';

const logger = getLogger().child('http-transport');

interface SSEClient {
  id: string;
  response: ServerResponse;
}

/**
 * HTTP/SSE Transport for MCP
 */
export class HttpTransport {
  private server: ReturnType<typeof createHttpServer> | null = null;
  private clients: Map<string, SSEClient> = new Map();

  constructor(_mcpServer: McpServer) {
    // MCP server reference kept for future full protocol implementation
    void _mcpServer;
  }

  /**
   * Start HTTP server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const port = getEnv().HTTP_PORT;

      this.server = createHttpServer((req, res) => {
        this.handleRequest(req, res).catch((error) => {
          logger.error('Request handling error', error);
          res.writeHead(500);
          res.end('Internal Server Error');
        });
      });

      this.server.on('error', (error) => {
        logger.error('HTTP server error', error);
        reject(error);
      });

      this.server.listen(port, () => {
        logger.info(`HTTP server listening on port ${port}`);
        logger.info(`SSE endpoint: http://localhost:${port}/sse`);
        logger.info(`MCP endpoint: http://localhost:${port}/mcp`);
        resolve();
      });
    });
  }

  /**
   * Stop HTTP server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close all SSE connections
      for (const client of this.clients.values()) {
        client.response.end();
      }
      this.clients.clear();

      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle incoming HTTP request
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    switch (url.pathname) {
      case '/':
        this.handleRoot(res);
        break;
      case '/health':
        this.handleHealth(res);
        break;
      case '/sse':
        await this.handleSSE(req, res);
        break;
      case '/mcp':
        await this.handleMCP(req, res);
        break;
      default:
        res.writeHead(404);
        res.end('Not Found');
    }
  }

  /**
   * Handle root endpoint
   */
  private handleRoot(res: ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'nutri-mcp',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        sse: '/sse',
        mcp: '/mcp',
      },
    }));
  }

  /**
   * Handle health check
   */
  private handleHealth(res: ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      clients: this.clients.size,
    }));
  }

  /**
   * Handle SSE connection
   */
  private async handleSSE(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Send connection established event
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

    const client: SSEClient = { id: clientId, response: res };
    this.clients.set(clientId, client);

    logger.info(`SSE client connected: ${clientId}`);

    // Handle client disconnect
    req.on('close', () => {
      this.clients.delete(clientId);
      logger.info(`SSE client disconnected: ${clientId}`);
    });

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(':keepalive\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
    });
  }

  /**
   * Handle MCP JSON-RPC request
   */
  private async handleMCP(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end('Method Not Allowed');
      return;
    }

    try {
      const body = await this.readBody(req);
      const request = JSON.parse(body);

      logger.debug('MCP request received', { method: request.method });

      // For now, return a basic response
      // Full implementation would route to MCP server
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          message: 'HTTP transport ready. Use SSE for full MCP protocol.',
        },
      }));
    } catch (error) {
      logger.error('MCP request error', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
        },
      }));
    }
  }

  /**
   * Broadcast event to all SSE clients
   */
  broadcast(event: string, data: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients.values()) {
      client.response.write(message);
    }
  }

  /**
   * Read request body
   */
  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString()));
      req.on('error', reject);
    });
  }
}

export function createHttpTransport(mcpServer: McpServer): HttpTransport {
  return new HttpTransport(mcpServer);
}
