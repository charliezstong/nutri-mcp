import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getEnv } from './config/env.js';
import { getLogger } from './transport/logger.js';
import {
  registerProductTools,
  registerNutritionTools,
  registerAllergenTools,
  registerComparisonTools,
  registerPriceTools,
  registerRecipeTools,
  registerInsightsTools,
} from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

const logger = getLogger();

/**
 * Create and configure the MCP server
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'nutri-mcp',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  });

  // Register all tools
  registerProductTools(server);
  registerNutritionTools(server);
  registerAllergenTools(server);
  registerComparisonTools(server);
  registerPriceTools(server);
  registerRecipeTools(server);
  registerInsightsTools(server);

  // Register resources and prompts
  registerResources(server);
  registerPrompts(server);

  logger.info('Nutri-MCP server created', {
    version: '1.0.0',
    transport: getEnv().TRANSPORT,
  });

  return server;
}
