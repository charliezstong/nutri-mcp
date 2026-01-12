import { z } from 'zod';

export const analyzeNutritionSchema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export const getNutriScoreSchema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export const getEcoScoreSchema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export const calculateDailyIntakeSchema = z.object({
  barcode: z.string().describe('Product barcode'),
  servings: z.number().default(1).describe('Number of servings'),
});

export const getMacroBreakdownSchema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export const getNutrientDensitySchema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export const analyzeMealSchema = z.object({
  barcodes: z.array(z.string()).describe('Array of product barcodes in the meal'),
});

export type AnalyzeNutritionInput = z.infer<typeof analyzeNutritionSchema>;
export type CalculateDailyIntakeInput = z.infer<typeof calculateDailyIntakeSchema>;
export type AnalyzeMealInput = z.infer<typeof analyzeMealSchema>;
