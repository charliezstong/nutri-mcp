import type { Product, ProductSummary, Allergen, Additive } from '../../types/product.types.js';
import type { Nutrient, NutriScore, EcoScore } from '../../types/nutrition.types.js';
import type { NovaGroup, AllergenId } from '../../types/common.types.js';
import { ALLERGEN_MAP, DAILY_VALUES } from '../../config/constants.js';
import type { OFFProduct } from './client.js';

/**
 * Map Open Food Facts product to normalized Product
 */
export function mapOFFProduct(off: OFFProduct): Product {
  return {
    barcode: off.code,
    name: off.product_name || 'Unknown Product',
    brand: off.brands,
    genericName: off.generic_name,
    categories: parseTagList(off.categories_tags),
    labels: parseTagList(off.labels_tags),
    quantity: off.quantity,
    servingSize: off.serving_size
      ? { amount: parseFloat(off.serving_size) || 0, unit: 'g', description: off.serving_size }
      : undefined,
    nutrients: mapNutrients(off.nutriments),
    nutriScore: mapNutriScore(off),
    ecoScore: mapEcoScore(off),
    novaGroup: off.nova_group as NovaGroup | undefined,
    ingredientsText: off.ingredients_text,
    allergens: mapAllergens(off.allergens_tags, 'confirmed'),
    traces: mapAllergens(off.traces_tags, 'traces'),
    additives: mapAdditives(off.additives_tags),
    countries: parseTagList(off.countries_tags),
    packaging: off.packaging ? [off.packaging] : [],
    origins: off.origins ? [off.origins] : [],
    images: {
      front: off.image_front_url,
      nutrition: off.image_nutrition_url,
      ingredients: off.image_ingredients_url,
      thumbnail: off.image_url,
    },
    sources: ['openfoodfacts'],
    lastUpdated: off.last_modified_t ? new Date(off.last_modified_t * 1000) : undefined,
    dataQuality: {
      score: (off.completeness || 0) * 100,
      completeness: (off.completeness || 0) * 100,
      warnings: [],
    },
  };
}

/**
 * Map Open Food Facts product to ProductSummary
 */
export function mapOFFSearchResult(off: OFFProduct): ProductSummary {
  return {
    barcode: off.code,
    name: off.product_name || 'Unknown Product',
    brand: off.brands,
    categories: parseTagList(off.categories_tags).slice(0, 3),
    nutriScoreGrade: off.nutriscore_grade?.toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E' | undefined,
    novaGroup: off.nova_group as NovaGroup | undefined,
    thumbnail: off.image_url,
    sources: ['openfoodfacts'],
  };
}

/**
 * Parse tag list from Open Food Facts format
 */
function parseTagList(tags?: string[]): string[] {
  if (!tags) return [];
  return tags
    .map((tag) => tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' '))
    .filter(Boolean);
}

/**
 * Map nutriments to normalized Nutrient array
 */
function mapNutrients(nutriments?: Record<string, number | string>): Nutrient[] {
  if (!nutriments) return [];

  const nutrients: Nutrient[] = [];
  const nutrientMap: Record<string, { id: string; name: string; unit: string; dvKey?: keyof typeof DAILY_VALUES }> = {
    'energy-kcal_100g': { id: 'energy_kcal', name: 'Energy', unit: 'kcal', dvKey: 'calories' },
    'energy-kj_100g': { id: 'energy_kj', name: 'Energy', unit: 'kJ' },
    'fat_100g': { id: 'fat', name: 'Fat', unit: 'g', dvKey: 'totalFat' },
    'saturated-fat_100g': { id: 'saturated_fat', name: 'Saturated Fat', unit: 'g', dvKey: 'saturatedFat' },
    'carbohydrates_100g': { id: 'carbohydrates', name: 'Carbohydrates', unit: 'g', dvKey: 'totalCarbohydrate' },
    'sugars_100g': { id: 'sugars', name: 'Sugars', unit: 'g', dvKey: 'totalSugars' },
    'fiber_100g': { id: 'fiber', name: 'Fiber', unit: 'g', dvKey: 'dietaryFiber' },
    'proteins_100g': { id: 'protein', name: 'Protein', unit: 'g', dvKey: 'protein' },
    'salt_100g': { id: 'salt', name: 'Salt', unit: 'g' },
    'sodium_100g': { id: 'sodium', name: 'Sodium', unit: 'mg', dvKey: 'sodium' },
    'cholesterol_100g': { id: 'cholesterol', name: 'Cholesterol', unit: 'mg', dvKey: 'cholesterol' },
    'calcium_100g': { id: 'calcium', name: 'Calcium', unit: 'mg', dvKey: 'calcium' },
    'iron_100g': { id: 'iron', name: 'Iron', unit: 'mg', dvKey: 'iron' },
    'potassium_100g': { id: 'potassium', name: 'Potassium', unit: 'mg', dvKey: 'potassium' },
    'vitamin-a_100g': { id: 'vitamin_a', name: 'Vitamin A', unit: 'mcg', dvKey: 'vitaminA' },
    'vitamin-c_100g': { id: 'vitamin_c', name: 'Vitamin C', unit: 'mg', dvKey: 'vitaminC' },
    'vitamin-d_100g': { id: 'vitamin_d', name: 'Vitamin D', unit: 'mcg', dvKey: 'vitaminD' },
  };

  for (const [offKey, meta] of Object.entries(nutrientMap)) {
    const value = nutriments[offKey];
    if (value !== undefined && typeof value === 'number') {
      const dailyValue = meta.dvKey ? DAILY_VALUES[meta.dvKey] : undefined;
      nutrients.push({
        id: meta.id as Nutrient['id'],
        name: meta.name,
        value,
        unit: meta.unit as Nutrient['unit'],
        per100g: value,
        dailyValuePercent: dailyValue ? Math.round((value / dailyValue) * 100) : undefined,
        source: 'openfoodfacts',
      });
    }
  }

  return nutrients;
}

/**
 * Map Nutri-Score data
 */
function mapNutriScore(off: OFFProduct): NutriScore | undefined {
  if (!off.nutriscore_grade) return undefined;

  return {
    grade: off.nutriscore_grade.toUpperCase() as NutriScore['grade'],
    score: off.nutriscore_score || 0,
    positive: [],
    negative: [],
  };
}

/**
 * Map Eco-Score data
 */
function mapEcoScore(off: OFFProduct): EcoScore | undefined {
  if (!off.ecoscore_grade) return undefined;

  return {
    grade: off.ecoscore_grade.toUpperCase() as EcoScore['grade'],
    score: off.ecoscore_score || 0,
    components: [],
  };
}

/**
 * Map allergens from OFF tags
 */
function mapAllergens(
  tags: string[] | undefined,
  certainty: Allergen['certainty'],
): Allergen[] {
  if (!tags) return [];

  return tags
    .map((tag) => {
      const standardId = ALLERGEN_MAP[tag as keyof typeof ALLERGEN_MAP];
      if (!standardId) return null;

      return {
        id: standardId as AllergenId,
        name: standardId.replace(/_/g, ' '),
        certainty,
      };
    })
    .filter((a): a is Allergen => a !== null);
}

/**
 * Map additives from OFF tags
 */
function mapAdditives(tags: string[] | undefined): Additive[] {
  if (!tags) return [];

  return tags.map((tag) => {
    // Format: en:e621
    const code = tag.replace(/^en:/, '').toUpperCase();
    return {
      code,
      name: code,
      riskLevel: 'unknown' as const,
    };
  });
}
