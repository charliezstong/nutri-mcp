import type { Product, ProductSummary } from '../../types/product.types.js';
import type { Nutrient } from '../../types/nutrition.types.js';
import { DAILY_VALUES } from '../../config/constants.js';
import type { USDAFoodDetailsResponse, USDAFoodItem, USDANutrient } from './types.js';
import { USDA_NUTRIENT_MAP } from './types.js';

/**
 * Map USDA food details to normalized Product
 */
export function mapUSDAProduct(usda: USDAFoodDetailsResponse): Product {
  return {
    barcode: usda.gtinUpc || '',
    fdcId: String(usda.fdcId),
    name: usda.description,
    brand: usda.brandOwner || usda.brandName,
    categories: usda.dataType ? [usda.dataType] : [],
    labels: [],
    quantity: usda.servingSize ? `${usda.servingSize} ${usda.servingSizeUnit || 'g'}` : undefined,
    servingSize: usda.servingSize
      ? {
          amount: usda.servingSize,
          unit: usda.servingSizeUnit || 'g',
          grams: usda.servingSize,
        }
      : undefined,
    nutrients: mapUSDANutrients(usda.foodNutrients),
    ingredientsText: usda.ingredients,
    allergens: [],
    traces: [],
    additives: [],
    countries: ['United States'],
    sources: ['usda'],
    lastUpdated: usda.publicationDate ? new Date(usda.publicationDate) : undefined,
    dataQuality: {
      score: 80,
      completeness: 70,
      warnings: [],
    },
  };
}

/**
 * Map USDA search result to ProductSummary
 */
export function mapUSDASearchResult(usda: USDAFoodItem): ProductSummary {
  return {
    barcode: usda.gtinUpc || String(usda.fdcId),
    name: usda.description,
    brand: usda.brandOwner || usda.brandName,
    categories: usda.foodCategory ? [usda.foodCategory] : [],
    sources: ['usda'],
  };
}

/**
 * Map USDA nutrients to normalized Nutrient array
 */
function mapUSDANutrients(nutrients: USDANutrient[]): Nutrient[] {
  const result: Nutrient[] = [];

  for (const n of nutrients) {
    const standardId = USDA_NUTRIENT_MAP[n.nutrientId];
    if (!standardId) continue;

    const dailyValue = getDailyValue(standardId);

    result.push({
      id: standardId as Nutrient['id'],
      name: n.nutrientName,
      value: n.value,
      unit: mapUSDAUnit(n.unitName),
      per100g: n.value,
      dailyValuePercent: dailyValue ? Math.round((n.value / dailyValue) * 100) : undefined,
      source: 'usda',
    });
  }

  return result;
}

/**
 * Map USDA unit name to standard unit
 */
function mapUSDAUnit(unit: string): Nutrient['unit'] {
  const unitMap: Record<string, Nutrient['unit']> = {
    G: 'g',
    g: 'g',
    MG: 'mg',
    mg: 'mg',
    UG: 'mcg',
    µg: 'mcg',
    mcg: 'mcg',
    KCAL: 'kcal',
    kcal: 'kcal',
    kJ: 'kJ',
    IU: 'IU',
  };
  return unitMap[unit] || 'g';
}

/**
 * Get daily value for a nutrient
 */
function getDailyValue(nutrientId: string): number | undefined {
  const dvMap: Record<string, keyof typeof DAILY_VALUES> = {
    energy_kcal: 'calories',
    protein: 'protein',
    fat: 'totalFat',
    saturated_fat: 'saturatedFat',
    carbohydrates: 'totalCarbohydrate',
    sugars: 'totalSugars',
    fiber: 'dietaryFiber',
    sodium: 'sodium',
    cholesterol: 'cholesterol',
    calcium: 'calcium',
    iron: 'iron',
    potassium: 'potassium',
    magnesium: 'magnesium',
    zinc: 'zinc',
    vitamin_a: 'vitaminA',
    vitamin_c: 'vitaminC',
    vitamin_d: 'vitaminD',
    vitamin_e: 'vitaminE',
    vitamin_k: 'vitaminK',
    vitamin_b1: 'thiamin',
    vitamin_b2: 'riboflavin',
    vitamin_b3: 'niacin',
    vitamin_b6: 'vitaminB6',
    vitamin_b9: 'folate',
    vitamin_b12: 'vitaminB12',
  };

  const key = dvMap[nutrientId];
  return key ? DAILY_VALUES[key] : undefined;
}
