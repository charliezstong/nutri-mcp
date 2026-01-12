import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getOpenFoodFactsProvider } from '../../providers/openfoodfacts/index.js';
import { getLogger } from '../../transport/logger.js';
import { formatErrorForMcp, ProductNotFoundError } from '../../errors/index.js';
import { barcodeSchema, searchProductsSchema } from './schemas.js';

const logger = getLogger().child('product-tools');

/**
 * Register product-related MCP tools
 */
export function registerProductTools(server: McpServer): void {
  const offProvider = getOpenFoodFactsProvider();

  // Tool: getProductByBarcode
  server.tool(
    'getProductByBarcode',
    'Get detailed product information by barcode (EAN-8, EAN-13, UPC-A)',
    barcodeSchema.shape,
    async ({ barcode }) => {
      logger.debug(`getProductByBarcode called`, { barcode });

      try {
        const product = await offProvider.getProductByBarcode(barcode);

        if (!product) {
          throw new ProductNotFoundError(barcode);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(product, null, 2),
          }],
        };
      } catch (error) {
        logger.error('getProductByBarcode failed', { barcode, error });
        return formatErrorForMcp(error);
      }
    },
  );

  // Tool: searchProducts
  server.tool(
    'searchProducts',
    'Search for food products by name, brand, or category',
    searchProductsSchema.shape,
    async ({ query, brand, category, page, pageSize }) => {
      logger.debug(`searchProducts called`, { query, brand, category, page, pageSize });

      try {
        const result = await offProvider.searchProducts(
          { query, brand, category },
          { page, pageSize },
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        logger.error('searchProducts failed', { query, error });
        return formatErrorForMcp(error);
      }
    },
  );

  logger.info('Product tools registered: getProductByBarcode, searchProducts');
}
