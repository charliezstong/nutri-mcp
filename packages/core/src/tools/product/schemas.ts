import { z } from 'zod';

/**
 * Schema for barcode parameter
 */
export const barcodeSchema = z.object({
  barcode: z.string()
    .min(6, 'Barcode must be at least 6 characters')
    .max(14, 'Barcode must be at most 14 characters')
    .regex(/^\d+$/, 'Barcode must contain only digits'),
});

/**
 * Schema for product search
 */
export const searchProductsSchema = z.object({
  query: z.string().min(1).max(200).optional(),
  brand: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

/**
 * Schema for advanced search with filters
 */
export const advancedSearchSchema = z.object({
  query: z.string().min(1).max(200).optional(),
  brand: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  nutriScoreMin: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
  nutriScoreMax: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
  novaMax: z.number().int().min(1).max(4).optional(),
  allergenFree: z.array(z.string()).optional(),
  vegan: z.boolean().optional(),
  vegetarian: z.boolean().optional(),
  organic: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type BarcodeInput = z.infer<typeof barcodeSchema>;
export type SearchProductsInput = z.infer<typeof searchProductsSchema>;
export type AdvancedSearchInput = z.infer<typeof advancedSearchSchema>;
