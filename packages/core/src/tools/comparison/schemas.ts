import { z } from 'zod';

export const compareProductsSchema = z.object({
  barcodes: z.array(z.string()).min(2).max(5).describe('Array of 2-5 product barcodes to compare'),
});

export const findHealthierAlternativeSchema = z.object({
  barcode: z.string().describe('Barcode of original product'),
  alternativeBarcodes: z.array(z.string()).describe('Barcodes of potential alternatives'),
});

export const compareNutrientDensitySchema = z.object({
  barcodes: z.array(z.string()).min(2).describe('Array of product barcodes to compare'),
});

export const rankByNutrientSchema = z.object({
  barcodes: z.array(z.string()).min(2).describe('Array of product barcodes'),
  nutrient: z.string().describe('Nutrient ID to rank by (e.g., protein, fiber, sodium)'),
  ascending: z.boolean().default(true).describe('Sort ascending (true) or descending (false)'),
});

export type CompareProductsInput = z.infer<typeof compareProductsSchema>;
export type FindHealthierAlternativeInput = z.infer<typeof findHealthierAlternativeSchema>;
export type RankByNutrientInput = z.infer<typeof rankByNutrientSchema>;
