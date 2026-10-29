import { describe, it, expect } from 'vitest';
import { mapUSDAProduct, mapUSDANutrients } from '../../src/providers/usda/mapper.js';
import type { USDAFoodDetailsResponse } from '../../src/providers/usda/types.js';
import { fixture } from '../helpers/fetch-stub.js';

describe('USDA mapper', () => {
  const details = fixture<USDAFoodDetailsResponse>('usda-food-2041155.json');

  it('reads the nested nutrient shape returned by /food/{fdcId}', () => {
    const product = mapUSDAProduct(details);
    expect(product.nutrients.length).toBeGreaterThan(5);
    const sodium = product.nutrients.find((n) => n.id === 'sodium')!;
    expect(sodium).toMatchObject({ value: 41, unit: 'mg', source: 'usda' });
    expect(product.nutrients.find((n) => n.id === 'vitamin_d')?.unit).toBe('mcg');
  });

  it('uses the package weight as quantity and the branded category', () => {
    const product = mapUSDAProduct(details);
    expect(product.quantity).toBe('13 oz/371 g');
    expect(product.categories).toEqual(['Nut & Seed Butters']);
    expect(product.servingSize?.grams).toBe(37);
  });

  it('reads the flat nutrient shape returned by /foods/search', () => {
    const nutrients = mapUSDANutrients([
      { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'KCAL', value: 100 },
      { nutrientId: 2047, nutrientName: 'Energy (Atwater)', nutrientNumber: '957', unitName: 'KCAL', value: 99 },
    ]);
    expect(nutrients).toHaveLength(1);
    expect(nutrients[0]).toMatchObject({ id: 'energy_kcal', value: 100, unit: 'kcal' });
  });
});
