import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getProductService } from '../../services/product.service.js';
import { getPriceService } from '../../services/price.service.js';
import {
  barcodeInput,
  barcodeListInput,
  countryInput,
  currencyInput,
  priceOutput,
  registerJsonTool,
} from '../shared.js';

const NOTE = 'Crowdsourced prices from Open Prices (prices.openfoodfacts.org); coverage varies by country and store.';

const currencyStatsOutput = z.object({
  currency: z.string(),
  count: z.number(),
  min: z.number(),
  max: z.number(),
  avg: z.number(),
  median: z.number(),
  latest: z.object({ price: z.number(), date: z.string() }),
});

const filterInputs = {
  currency: currencyInput.optional(),
  country: countryInput.optional(),
};

export function registerPriceTools(server: McpServer): void {
  const productService = getProductService();
  const priceService = getPriceService();

  registerJsonTool(
    server,
    'getProductPrices',
    {
      title: 'Get product prices',
      description: 'Most recent crowdsourced prices for a product (newest first), with store and location.',
      inputSchema: z.object({
        barcode: barcodeInput,
        ...filterInputs,
        limit: z.number().int().min(1).max(100).default(20).describe('Maximum number of prices'),
      }),
      outputSchema: z.object({
        barcode: z.string(),
        count: z.number(),
        prices: z.array(priceOutput),
        note: z.string(),
      }),
    },
    async ({ barcode, currency, country, limit }) => {
      const prices = await priceService.getProductPrices(barcode, { currency, country, limit });
      return { barcode, count: prices.length, prices, note: NOTE };
    },
  );

  registerJsonTool(
    server,
    'searchPrices',
    {
      title: 'Search prices',
      description: 'Search crowdsourced prices by product, currency, country, date and discount status.',
      inputSchema: z.object({
        barcode: barcodeInput.optional(),
        ...filterInputs,
        discountedOnly: z.boolean().default(false),
        since: z.iso.date().optional().describe('Only prices on or after this date (YYYY-MM-DD)'),
        limit: z.number().int().min(1).max(100).default(20),
      }),
      outputSchema: z.object({
        count: z.number(),
        prices: z.array(priceOutput),
        note: z.string(),
      }),
    },
    async ({ barcode, currency, country, discountedOnly, since, limit }) => {
      const prices = await priceService.searchPrices({ barcode, currency, country, discountedOnly, dateFrom: since, limit });
      return { count: prices.length, prices, note: NOTE };
    },
  );

  registerJsonTool(
    server,
    'getPriceStats',
    {
      title: 'Get price statistics',
      description: 'Min, max, average, median and latest price for a product, computed separately for each currency.',
      inputSchema: z.object({ barcode: barcodeInput, ...filterInputs }),
      outputSchema: z.object({
        barcode: z.string(),
        available: z.boolean(),
        priceCount: z.number(),
        byCurrency: z.array(currencyStatsOutput),
        firstDate: z.string().optional(),
        lastDate: z.string().optional(),
        note: z.string(),
      }),
    },
    async ({ barcode, currency, country }) => {
      const stats = await priceService.getPriceStats(barcode, { currency, country });
      return stats
        ? { ...stats, available: true, note: `${NOTE} Statistics use up to the 100 most recent prices.` }
        : { barcode, available: false, priceCount: 0, byCurrency: [], note: NOTE };
    },
  );

  registerJsonTool(
    server,
    'findBestPrice',
    {
      title: 'Find best price',
      description: 'Lowest recent price for a product in each currency, with the store where it was seen.',
      inputSchema: z.object({ barcode: barcodeInput, ...filterInputs }),
      outputSchema: z.object({
        barcode: z.string(),
        available: z.boolean(),
        bestPrices: z.array(priceOutput),
        note: z.string(),
      }),
    },
    async ({ barcode, currency, country }) => {
      const bestPrices = await priceService.findBestPrices(barcode, { currency, country });
      return { barcode, available: bestPrices.length > 0, bestPrices, note: NOTE };
    },
  );

  registerJsonTool(
    server,
    'comparePrices',
    {
      title: 'Compare prices',
      description: 'Compare median and best prices of several products in one currency, including price per kg/L to find the best value.',
      inputSchema: z.object({
        barcodes: barcodeListInput(2, 10).describe('Product barcodes'),
        currency: currencyInput.optional().describe('Currency to compare in (default: the most common one)'),
      }),
      outputSchema: z.object({
        available: z.boolean(),
        currency: z.string().optional(),
        products: z.array(z.looseObject({
          barcode: z.string(),
          name: z.string(),
          bestPrice: priceOutput.nullable(),
          medianPrice: z.number().nullable(),
          pricePerKgOrL: z.number().optional(),
        })),
        cheapest: z.string().nullable(),
        bestValue: z.string().nullable(),
        missing: z.array(z.string()),
        note: z.string(),
      }),
    },
    async ({ barcodes, currency }) => {
      const { found, missing } = await productService.getMany(barcodes);
      if (found.length < 2) {
        throw new Error(`Need at least 2 known products to compare prices; not found: ${missing.join(', ')}`);
      }
      const comparison = await priceService.comparePrices(found, currency);
      return comparison
        ? { available: true, ...comparison, missing, note: NOTE }
        : { available: false, products: [], cheapest: null, bestValue: null, missing, note: NOTE };
    },
  );

  registerJsonTool(
    server,
    'getRecentPrices',
    {
      title: 'Get recent prices',
      description: 'Prices most recently added by the Open Prices community, optionally filtered by currency or country.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(20),
        ...filterInputs,
      }),
      outputSchema: z.object({ count: z.number(), prices: z.array(priceOutput), note: z.string() }),
    },
    async ({ limit, currency, country }) => {
      const prices = await priceService.getRecentPrices(limit, { currency, country });
      return { count: prices.length, prices, note: NOTE };
    },
  );

  registerJsonTool(
    server,
    'getPriceHistory',
    {
      title: 'Get price history',
      description: 'Monthly median price of a product over the last months, per currency, to spot price trends.',
      inputSchema: z.object({
        barcode: barcodeInput,
        months: z.number().int().min(1).max(60).default(12),
        currency: currencyInput.optional(),
      }),
      outputSchema: z.object({
        barcode: z.string(),
        months: z.number(),
        points: z.array(z.object({
          month: z.string(),
          currency: z.string(),
          count: z.number(),
          median: z.number(),
          min: z.number(),
          max: z.number(),
        })),
        trend: z.enum(['increasing', 'decreasing', 'stable', 'insufficient_data']),
        note: z.string(),
      }),
    },
    async ({ barcode, months, currency }) => {
      const points = await priceService.getPriceHistory(barcode, months, currency);
      const main = currency ?? points.reduce<Record<string, number>>((acc, p) => {
        acc[p.currency] = (acc[p.currency] ?? 0) + p.count;
        return acc;
      }, {});
      const mainCurrency = typeof main === 'string'
        ? main
        : Object.entries(main).sort((a, b) => b[1] - a[1])[0]?.[0];
      const series = points.filter((p) => p.currency === mainCurrency);

      let trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data' = 'insufficient_data';
      if (series.length >= 2) {
        const first = series[0]!.median;
        const last = series[series.length - 1]!.median;
        const change = (last - first) / first;
        trend = change > 0.05 ? 'increasing' : change < -0.05 ? 'decreasing' : 'stable';
      }
      return { barcode, months, points, trend, note: NOTE };
    },
  );

  registerJsonTool(
    server,
    'findDeals',
    {
      title: 'Find deals',
      description: 'Recently reported discounted prices (promotions), optionally for one product, currency or country.',
      inputSchema: z.object({
        barcode: barcodeInput.optional(),
        ...filterInputs,
        limit: z.number().int().min(1).max(100).default(20),
      }),
      outputSchema: z.object({
        count: z.number(),
        deals: z.array(z.looseObject({
          price: priceOutput,
          savings: z.number().optional(),
          savingsPercent: z.number().optional(),
        })),
        note: z.string(),
      }),
    },
    async ({ barcode, currency, country, limit }) => {
      const prices = await priceService.searchPrices({ barcode, currency, country, discountedOnly: true, limit });
      const deals = prices.map((price) => {
        const before = price.priceWithoutDiscount;
        return before && before > price.price
          ? {
              price,
              savings: Math.round((before - price.price) * 100) / 100,
              savingsPercent: Math.round(((before - price.price) / before) * 100),
            }
          : { price };
      });
      return { count: deals.length, deals, note: NOTE };
    },
  );
}
