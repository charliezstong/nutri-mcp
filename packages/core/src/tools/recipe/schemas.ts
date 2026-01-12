import { z } from 'zod';

export const suggestRecipesSchema = z.object({
  barcode: z.string().describe('Product barcode to base recipes on'),
  dietaryRestrictions: z.array(z.string()).optional().describe('Dietary restrictions (e.g., vegan, gluten-free)'),
});

export const substituteIngredientSchema = z.object({
  ingredient: z.string().describe('Ingredient to find substitutes for'),
  reason: z.enum(['allergy', 'diet', 'availability', 'preference']).optional().describe('Reason for substitution'),
});

export const analyzeMealPlanSchema = z.object({
  meals: z.array(z.object({
    name: z.string(),
    barcodes: z.array(z.string()),
  })).describe('Array of meals with their product barcodes'),
});

export const calculateMealCostSchema = z.object({
  barcodes: z.array(z.string()).describe('Product barcodes in the meal'),
});

export type SuggestRecipesInput = z.infer<typeof suggestRecipesSchema>;
export type SubstituteIngredientInput = z.infer<typeof substituteIngredientSchema>;
export type AnalyzeMealPlanInput = z.infer<typeof analyzeMealPlanSchema>;
