import type { Product, ProductSummary } from '../../types/product.types.js';
import type { Nutrient } from '../../types/nutrition.types.js';
import { DAILY_VALUES } from '../../config/constants.js';
import type { NutritionixFullFood, NutritionixBrandedFood, NutritionixCommonFood } from './types.js';
import { NUTRITIONIX_NUTRIENT_MAP } from './types.js';

/**
 * Map Nutritionix full food to normalized Product
 */
export function mapNutritionixProduct(nix: NutritionixFullFood): Product {
  return {
    barcode: nix.upc || '',
    nixItemId: nix.nix_item_id,
    name: nix.food_name,
    brand: nix.brand_name || nix.nix_brand_name,
    categories: [],
    labels: [],
    quantity: `${nix.serving_qty} ${nix.serving_unit}`,
    servingSize: {
      amount: nix.serving_qty,
      unit: nix.serving_unit,
      grams: nix.serving_weight_grams,
      description: `${nix.serving_qty} ${nix.serving_unit}`,
    },
    nutrients: mapNutritionixNutrients(nix),
    allergens: [],
    traces: [],
    additives: [],
    countries: ['United States'],
    images: nix.photo
      ? {
          thumbnail: nix.photo.thumb,
          front: nix.photo.highres,
        }
      : undefined,
    sources: ['nutritionix'],
    dataQuality: {
      score: 75,
      completeness: 60,
      warnings: [],
    },
  };
}

/**
 * Map Nutritionix search result to ProductSummary
 */
export function mapNutritionixSearchResult(
  item: NutritionixBrandedFood | NutritionixCommonFood,
  type: 'branded' | 'common',
): ProductSummary {
  if (type === 'branded') {
    const branded = item as NutritionixBrandedFood;
    return {
      barcode: branded.nix_item_id,
      name: branded.food_name,
      brand: branded.brand_name,
      categories: [],
      thumbnail: branded.photo?.thumb,
      sources: ['nutritionix'],
    };
  }

  const common = item as NutritionixCommonFood;
  return {
    barcode: common.tag_id,
    name: common.food_name,
    categories: [],
    thumbnail: common.photo?.thumb,
    sources: ['nutritionix'],
  };
}

/**
 * Map Nutritionix nutrients to normalized array
 */
function mapNutritionixNutrients(nix: NutritionixFullFood): Nutrient[] {
  const nutrients: Nutrient[] = [];

  // Map from full_nutrients array if available
  if (nix.full_nutrients) {
    for (const n of nix.full_nutrients) {
      const standardId = NUTRITIONIX_NUTRIENT_MAP[n.attr_id];
      if (!standardId) continue;

      const dailyValue = getDailyValue(standardId);
      nutrients.push({
        id: standardId as Nutrient['id'],
        name: standardId.replace(/_/g, ' '),
        value: n.value,
        unit: getUnitForNutrient(standardId),
        perServing: n.value,
        dailyValuePercent: dailyValue ? Math.round((n.value / dailyValue) * 100) : undefined,
        source: 'nutritionix',
      });
    }
  } else {
    // Fall back to direct properties
    const directNutrients: Array<{ id: string; name: string; value: number | undefined; unit: Nutrient['unit'] }> = [
      { id: 'energy_kcal', name: 'Calories', value: nix.nf_calories, unit: 'kcal' },
      { id: 'fat', name: 'Total Fat', value: nix.nf_total_fat, unit: 'g' },
      { id: 'saturated_fat', name: 'Saturated Fat', value: nix.nf_saturated_fat, unit: 'g' },
      { id: 'cholesterol', name: 'Cholesterol', value: nix.nf_cholesterol, unit: 'mg' },
      { id: 'sodium', name: 'Sodium', value: nix.nf_sodium, unit: 'mg' },
      { id: 'carbohydrates', name: 'Carbohydrates', value: nix.nf_total_carbohydrate, unit: 'g' },
      { id: 'fiber', name: 'Dietary Fiber', value: nix.nf_dietary_fiber, unit: 'g' },
      { id: 'sugars', name: 'Sugars', value: nix.nf_sugars, unit: 'g' },
      { id: 'protein', name: 'Protein', value: nix.nf_protein, unit: 'g' },
      { id: 'potassium', name: 'Potassium', value: nix.nf_potassium, unit: 'mg' },
    ];

    for (const n of directNutrients) {
      if (n.value !== undefined && n.value !== null) {
        const dailyValue = getDailyValue(n.id);
        nutrients.push({
          id: n.id as Nutrient['id'],
          name: n.name,
          value: n.value,
          unit: n.unit,
          perServing: n.value,
          dailyValuePercent: dailyValue ? Math.round((n.value / dailyValue) * 100) : undefined,
          source: 'nutritionix',
        });
      }
    }
  }

  return nutrients;
}

function getUnitForNutrient(id: string): Nutrient['unit'] {
  const unitMap: Record<string, Nutrient['unit']> = {
    energy_kcal: 'kcal',
    energy_kj: 'kJ',
    protein: 'g',
    fat: 'g',
    saturated_fat: 'g',
    trans_fat: 'g',
    carbohydrates: 'g',
    sugars: 'g',
    fiber: 'g',
    cholesterol: 'mg',
    sodium: 'mg',
    potassium: 'mg',
    calcium: 'mg',
    iron: 'mg',
    magnesium: 'mg',
    zinc: 'mg',
    vitamin_a: 'mcg',
    vitamin_c: 'mg',
    vitamin_d: 'mcg',
    vitamin_e: 'mg',
    vitamin_k: 'mcg',
    vitamin_b1: 'mg',
    vitamin_b2: 'mg',
    vitamin_b3: 'mg',
    vitamin_b5: 'mg',
    vitamin_b6: 'mg',
    vitamin_b9: 'mcg',
    vitamin_b12: 'mcg',
  };
  return unitMap[id] || 'g';
}

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
  };

  const key = dvMap[nutrientId];
  return key ? DAILY_VALUES[key] : undefined;
}
