import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getProductService } from '../../services/product.service.js';
import { getPriceService } from '../../services/price.service.js';
import { getLogger } from '../../transport/logger.js';
import { formatErrorForMcp } from '../../errors/index.js';
import {
  getProductPricesSchema,
  searchPricesSchema,
  getPriceStatsSchema,
  findBestPriceSchema,
  comparePricesSchema,
  getRecentPricesSchema,
} from './schemas.js';

const logger = getLogger().child('price-tools');

export function registerPriceTools(server: McpServer): void {
  const productService = getProductService();
  const priceService = getPriceService();

  // getProductPrices
  server.tool(
    'getProductPrices',
    'Get crowdsourced prices for a product',
    getProductPricesSchema.shape,
    async ({ barcode }) => {
      try {
        const prices = await priceService.getProductPrices(barcode);
        const product = await productService.getByBarcode(barcode);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product?.name ?? barcode,
              priceCount: prices.length,
              prices: prices.slice(0, 10), // Limit to 10 most recent
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // searchPrices
  server.tool(
    'searchPrices',
    'Search prices with optional filters (country, currency)',
    searchPricesSchema.shape,
    async ({ barcode, country, currency }) => {
      try {
        const prices = await priceService.searchPrices({ barcode, country, currency });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              filters: { barcode, country, currency },
              count: prices.length,
              prices: prices.slice(0, 20),
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // getPriceStats
  server.tool(
    'getPriceStats',
    'Get price statistics (min, max, average, median) for a product',
    getPriceStatsSchema.shape,
    async ({ barcode }) => {
      try {
        const stats = await priceService.getPriceStats(barcode);
        const product = await productService.getByBarcode(barcode);

        if (!stats) {
          return {
            content: [{
              type: 'text',
              text: `No price data available for ${product?.name ?? barcode}`,
            }],
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product?.name ?? barcode,
              ...stats,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // findBestPrice
  server.tool(
    'findBestPrice',
    'Find the lowest price for a product',
    findBestPriceSchema.shape,
    async ({ barcode }) => {
      try {
        const bestPrice = await priceService.findBestPrice(barcode);
        const product = await productService.getByBarcode(barcode);

        if (!bestPrice) {
          return {
            content: [{
              type: 'text',
              text: `No price data available for ${product?.name ?? barcode}`,
            }],
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product?.name ?? barcode,
              bestPrice,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // comparePrices
  server.tool(
    'comparePrices',
    'Compare prices between multiple products',
    comparePricesSchema.shape,
    async ({ barcodes }) => {
      try {
        const products = await Promise.all(
          barcodes.map((b) => productService.getByBarcode(b)),
        );

        const found = products.filter((p) => p !== null);
        if (found.length < 2) {
          return {
            content: [{ type: 'text', text: 'Need at least 2 valid products to compare prices' }],
            isError: true,
          };
        }

        const comparison = await priceService.comparePrices(found);

        if (!comparison) {
          return {
            content: [{ type: 'text', text: 'No price data available for comparison' }],
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(comparison, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // getRecentPrices
  server.tool(
    'getRecentPrices',
    'Get recently added prices from the community',
    getRecentPricesSchema.shape,
    async ({ limit }) => {
      try {
        const prices = await priceService.getRecentPrices(limit);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              count: prices.length,
              prices,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  logger.info('Price tools registered: getProductPrices, searchPrices, getPriceStats, findBestPrice, comparePrices, getRecentPrices');
}
