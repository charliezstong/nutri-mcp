import { z } from 'zod';

export const getProductInsightsSchema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export const getAIQuestionsSchema = z.object({
  barcode: z.string().optional().describe('Product barcode (optional, for product-specific questions)'),
  count: z.number().int().min(1).max(10).default(5).describe('Number of questions to fetch'),
});

export const qualityCheckSchema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export type GetProductInsightsInput = z.infer<typeof getProductInsightsSchema>;
export type GetAIQuestionsInput = z.infer<typeof getAIQuestionsSchema>;
