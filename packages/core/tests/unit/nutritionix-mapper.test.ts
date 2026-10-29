import { describe, it, expect } from 'vitest';
import { mapNutritionixProduct } from '../../src/providers/nutritionix/mapper.js';
import type { NutritionixFullFood } from '../../src/providers/nutritionix/types.js';

const egg = {
  food_name: 'egg',
  serving_qty: 1,
  serving_unit: 'large',
  serving_weight_grams: 50,
  nf_calories: 71.5,
  nf_total_fat: 4.76,
  nf_saturated_fat: 1.56,
  nf_cholesterol: 186,
  nf_sodium: 71,
  nf_total_carbohydrate: 0.36,
  nf_dietary_fiber: 0,
  nf_sugars: 0.19,
  nf_protein: 6.28,
  full_nutrients: [
    { attr_id: 208, value: 71.5 },
    { attr_id: 203, value: 6.28 },
  ],
} as NutritionixFullFood;

describe('Nutritionix mapper', () => {
  it('normalizes per-serving values to per 100 g', () => {
    const product = mapNutritionixProduct(egg);
    const energy = product.nutrients.find((n) => n.id === 'energy_kcal')!;
    expect(energy.perServing).toBe(71.5);
    expect(energy.per100g).toBe(143);
    expect(energy.value).toBe(143);
    expect(product.servingSize?.grams).toBe(50);
  });

  it('falls back to nf_* fields without full_nutrients', () => {
    const product = mapNutritionixProduct({ ...egg, full_nutrients: undefined as never });
    expect(product.nutrients.find((n) => n.id === 'sodium')).toMatchObject({ unit: 'mg', perServing: 71, value: 142 });
  });
});
