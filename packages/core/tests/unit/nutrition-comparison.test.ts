import { describe, it, expect } from 'vitest';
import { NutritionService } from '../../src/services/nutrition.service.js';
import { ComparisonService } from '../../src/services/comparison.service.js';
import { makeProduct, nutrient } from '../helpers/products.js';

const nutrition = new NutritionService();
const comparison = new ComparisonService();

describe('NutritionService', () => {
  it('computes UK FSA traffic lights per 100 g', () => {
    const lights = nutrition.trafficLights([
      nutrient('fat', 30), nutrient('saturated_fat', 1), nutrient('sugars', 10), nutrient('salt', 2),
    ]);
    expect(lights).toEqual({ fat: 'high', saturated_fat: 'low', sugars: 'medium', salt: 'high' });
  });

  it('derives salt from sodium when salt is missing', () => {
    expect(nutrition.trafficLights([nutrient('sodium', 800, 'mg')]).salt).toBe('high');
  });

  it('reports concerns for high values and benefits for >= 10% DV', () => {
    const nutrients = [nutrient('sugars', 50), nutrient('fiber', 8, 'g', 28.6), nutrient('iron', 1, 'mg', 5.6)];
    expect(nutrition.identifyConcerns(nutrients).map((c) => c.nutrient)).toEqual(['sugars']);
    expect(nutrition.identifyBenefits(nutrients)).toEqual([expect.objectContaining({ nutrient: 'fiber', level: 'excellent' })]);
  });

  it('falls back to kJ for calories', () => {
    expect(nutrition.getCalories([nutrient('energy_kj', 418.4, 'kJ')])).toBe(100);
  });
});

describe('ComparisonService', () => {
  const a = makeProduct({ barcode: 'A', name: 'A', nutrients: [nutrient('fat', 30), nutrient('sugars', 50), nutrient('protein', 6)] });
  const b = makeProduct({ barcode: 'B', name: 'B', nutrients: [nutrient('fat', 10), nutrient('sugars', 20)] });

  it('treats lower fat as better and never lets missing data win', () => {
    const result = comparison.compare([a, b]);
    const fat = result.comparison.nutritionComparison.find((c) => c.nutrientId === 'fat')!;
    expect(fat.better).toBe('B');
    const protein = result.comparison.nutritionComparison.find((c) => c.nutrientId === 'protein')!;
    expect(protein.values.find((v) => v.barcode === 'B')!.value).toBeNull();
    expect(protein.better).toBeUndefined();
  });

  it('ignores a Nutri-Score that only one product has', () => {
    const withGrade = { ...a, nutriScore: { grade: 'E' as const, positive: [], negative: [] } };
    const result = comparison.compare([withGrade, b]);
    expect(result.comparison.winner?.barcode).toBe('B');
    expect(result.comparison.winner?.reason).not.toMatch(/Nutri-Score/);
  });

  it('ranks products without data last', () => {
    const ranking = comparison.rankByNutrient([a, b], 'protein', false);
    expect(ranking.map((r) => r.barcode)).toEqual(['A', 'B']);
    expect(ranking[1]!.value).toBeNull();
  });
});
