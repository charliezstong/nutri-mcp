import { McpServer } from '@modelcontextprotocol/server';
import {
  registerProductTools,
  registerNutritionTools,
  registerAllergenTools,
  registerComparisonTools,
  registerPriceTools,
  registerRecipeTools,
  registerInsightsTools,
  registerSafetyTools,
} from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';
import { registerUiResources } from './ui/index.js';
import { getEnv } from './config/env.js';
import { SERVER_NAME, VERSION } from './version.js';

const ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#038141"/>' +
  '<path d="M32 50c-9 0-16-7-16-17 0-8 6-15 14-16-1 3 0 6 2 8 2-5 7-9 13-9-1 4-3 7-6 9 5 2 9 7 9 13 0 7-7 12-16 12z" fill="#fff"/></svg>';

export const SERVER_ICON = {
  src: `data:image/svg+xml;base64,${Buffer.from(ICON_SVG).toString('base64')}`,
  mimeType: 'image/svg+xml',
  sizes: ['any'],
};

const INSTRUCTIONS = `Nutrition data for packaged foods, keyed by barcode (EAN/UPC).
- Start with searchProducts to find barcodes, then getProductByBarcode for full details.
- Nutrient values are per 100 g (or 100 ml) unless a field says per serving; %DV uses FDA Daily Values.
- Allergen and diet answers are based on label data that may be incomplete: say so for severe allergies.
- Prices are crowdsourced (Open Prices) and never mixed across currencies.
- checkRecalls covers US FDA recalls only.`;

/**
 * Create and configure an MCP server instance. Called once per stdio
 * connection and once per HTTP request (the HTTP transport is stateless).
 */
export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      title: 'Nutri-MCP',
      version: VERSION,
      description: 'Nutrition, allergen, price and recall data for food products',
      websiteUrl: 'https://github.com/charliezstong/nutri-mcp',
      icons: [SERVER_ICON],
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      instructions: INSTRUCTIONS,
    },
  );

  registerProductTools(server);
  registerNutritionTools(server);
  registerAllergenTools(server);
  registerComparisonTools(server);
  registerPriceTools(server);
  registerRecipeTools(server);
  registerInsightsTools(server);
  if (getEnv().ENABLE_RECALLS) {
    registerSafetyTools(server);
  }

  registerResources(server);
  registerUiResources(server);
  registerPrompts(server);

  return server;
}
