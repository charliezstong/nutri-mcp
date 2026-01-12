import { z } from 'zod';

const allergenIdSchema = z.enum([
  'gluten', 'dairy', 'eggs', 'fish', 'shellfish', 'tree_nuts',
  'peanuts', 'soy', 'celery', 'mustard', 'sesame', 'sulfites',
  'lupin', 'mollusks', 'wheat',
]);

const dietTypeSchema = z.enum([
  'vegan', 'vegetarian', 'pescatarian', 'keto', 'paleo',
  'gluten_free', 'dairy_free', 'low_sodium', 'low_sugar',
  'halal', 'kosher',
]);

export const checkAllergenSchema = z.object({
  barcode: z.string().describe('Product barcode'),
  allergen: allergenIdSchema.describe('Allergen to check'),
});

export const checkMultipleAllergensSchema = z.object({
  barcode: z.string().describe('Product barcode'),
  allergens: z.array(allergenIdSchema).describe('List of allergens to check'),
});

export const checkBig9Schema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export const checkEU14Schema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export const getAllAllergensSchema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export const crossContaminationSchema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export const checkDietComplianceSchema = z.object({
  barcode: z.string().describe('Product barcode'),
  diet: dietTypeSchema.describe('Diet type to check compliance'),
});

export const getAdditivesInfoSchema = z.object({
  barcode: z.string().describe('Product barcode'),
});

export type CheckAllergenInput = z.infer<typeof checkAllergenSchema>;
export type CheckMultipleAllergensInput = z.infer<typeof checkMultipleAllergensSchema>;
export type CheckDietComplianceInput = z.infer<typeof checkDietComplianceSchema>;
