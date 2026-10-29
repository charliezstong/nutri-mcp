#!/usr/bin/env node

import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server.js';
import { getEnv } from './config/env.js';
import { getLogger } from './transport/logger.js';
import { createHttpTransport } from './transport/http.js';
import { VERSION } from './version.js';

const logger = getLogger();

async function main(): Promise<void> {
  const env = getEnv();

  logger.info(`Starting Nutri-MCP ${VERSION}`, {
    transport: env.TRANSPORT,
    usdaEnabled: env.ENABLE_USDA && !!env.USDA_API_KEY,
    nutritionixEnabled: env.ENABLE_NUTRITIONIX && !!env.NUTRITIONIX_APP_ID && !!env.NUTRITIONIX_APP_KEY,
  });

  if (!env.OFF_CONTACT_EMAIL) {
    logger.debug('OFF_CONTACT_EMAIL not set; Open Food Facts asks API users to identify themselves');
  }

  if (env.TRANSPORT === 'stdio') {
    // Serves both 2025-era (initialize) and 2026-07-28 clients
    const handle = serveStdio(() => createServer());
    const shutdown = (): void => {
      void handle.close().finally(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    logger.info('Nutri-MCP server running on stdio');
  } else {
    const http = createHttpTransport(() => createServer());
    await http.start();
    const shutdown = (): void => {
      void http.stop().finally(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
});

main().catch((error: unknown) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
