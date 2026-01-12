#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { getEnv } from './config/env.js';
import { getLogger } from './transport/logger.js';
import { createHttpTransport } from './transport/http.js';

const logger = getLogger();

async function main(): Promise<void> {
  const env = getEnv();

  logger.info('Starting Nutri-MCP server...', {
    transport: env.TRANSPORT,
    logLevel: env.LOG_LEVEL,
    usdaEnabled: !!env.USDA_API_KEY,
    nutritionixEnabled: !!env.NUTRITIONIX_APP_ID && !!env.NUTRITIONIX_APP_KEY,
  });

  const server = createServer();

  if (env.TRANSPORT === 'stdio') {
    // Stdio transport for Claude Code, VS Code, etc.
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('Nutri-MCP server running on stdio transport');
  } else {
    // HTTP transport
    const httpTransport = createHttpTransport(server);
    await httpTransport.start();
    logger.info(`Nutri-MCP server running on HTTP transport (port ${env.HTTP_PORT})`);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
  process.exit(1);
});

// Start server
main().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
