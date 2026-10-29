import type { Product, ProductSummary } from '../../types/product.types.js';
import type { Nutrient, NutrientId } from '../../types/nutrition.types.js';
import { dailyValuePercent } from '../../services/daily-values.js';
import { round } from '../../utils/text.js';
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
 * Map Nutritionix nutrients to normalized array. Nutritionix reports values
 * per serving; `value`/`per100g` are normalized to 100 g when the serving
 * weight is known so they compare with other sources.
 */
function mapNutritionixNutrients(nix: NutritionixFullFood): Nutrient[] {
  const raw: Array<{ id: string; name: string; value: number | undefined | null; unit: Nutrient['unit'] }> = [];

  if (nix.full_nutrients) {
    for (const n of nix.full_nutrients) {
      const standardId = NUTRITIONIX_NUTRIENT_MAP[n.attr_id];
      if (!standardId) continue;
      raw.push({ id: standardId, name: standardId.replace(/_/g, ' '), value: n.value, unit: getUnitForNutrient(standardId) });
    }
  } else {
    raw.push(
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
    );
  }

  const grams = nix.serving_weight_grams;
  const seen = new Set<string>();
  const nutrients: Nutrient[] = [];

  for (const n of raw) {
    if (typeof n.value !== 'number' || seen.has(n.id)) continue;
    seen.add(n.id);
    const per100g = grams ? round((n.value * 100) / grams) : undefined;
    const value = per100g ?? round(n.value);
    nutrients.push({
      id: n.id as NutrientId,
      name: n.name,
      value,
      unit: n.unit,
      per100g,
      perServing: round(n.value),
      dailyValuePercent: dailyValuePercent(n.id as NutrientId, value, n.unit),
      source: 'nutritionix',
    });
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
