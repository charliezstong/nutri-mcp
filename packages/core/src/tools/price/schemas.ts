import { z } from 'zod';

export const getProductPricesSchema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export const searchPricesSchema = z.object({
  barcode: z.string().optional().describe('Product barcode (optional)'),
  country: z.string().optional().describe('Country code (e.g., US, FR, ES)'),
  currency: z.string().optional().describe('Currency code (e.g., USD, EUR)'),
});

export const getPriceStatsSchema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export const findBestPriceSchema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export const comparePricesSchema = z.object({
  barcodes: z.array(z.string()).min(2).describe('Array of product barcodes to compare prices'),
});

export const getRecentPricesSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20).describe('Number of recent prices to fetch'),
});

export type GetProductPricesInput = z.infer<typeof getProductPricesSchema>;
export type SearchPricesInput = z.infer<typeof searchPricesSchema>;
export type ComparePricesInput = z.infer<typeof comparePricesSchema>;
