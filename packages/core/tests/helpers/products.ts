import type { Product } from '../../src/types/product.types.js';
import type { Nutrient } from '../../src/types/nutrition.types.js';

export function nutrient(id: string, value: number, unit = 'g', dailyValuePercent?: number): Nutrient {
  return { id: id as Nutrient['id'], name: id, value, per100g: value, unit: unit as Nutrient['unit'], dailyValuePercent, source: 'openfoodfacts' };
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    barcode: '0000000000000',
    name: 'Test product',
    categories: [],
    labels: [],
    nutrients: [],
    allergens: [],
    traces: [],
    additives: [],
    countries: [],
    sources: ['openfoodfacts'],
    dataQuality: { score: 50, completeness: 50, warnings: [] },
    ...overrides,
  };
}
