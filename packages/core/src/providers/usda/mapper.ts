import type { Product, ProductSummary } from '../../types/product.types.js';
import type { Nutrient, NutrientId } from '../../types/nutrition.types.js';
import { dailyValuePercent } from '../../services/daily-values.js';
import { round } from '../../utils/text.js';
import type { USDAFoodDetailsResponse, USDAFoodItem, USDAFoodNutrient, USDANutrient } from './types.js';
import { USDA_NUTRIENT_MAP } from './types.js';

/**
 * Map USDA food details to normalized Product
 */
export function mapUSDAProduct(usda: USDAFoodDetailsResponse): Product {
  const servingGrams = usda.servingSize && ['g', 'ml'].includes((usda.servingSizeUnit ?? 'g').toLowerCase())
    ? usda.servingSize
    : undefined;

  return {
    barcode: usda.gtinUpc || '',
    fdcId: String(usda.fdcId),
    name: usda.description,
    brand: usda.brandOwner || usda.brandName,
    categories: [usda.brandedFoodCategory ?? usda.foodCategory?.description].filter((c): c is string => !!c),
    labels: [],
    quantity: usda.packageWeight,
    servingSize: usda.servingSize
      ? {
          amount: usda.servingSize,
          unit: usda.servingSizeUnit || 'g',
          grams: servingGrams,
        }
      : undefined,
    nutrients: mapUSDANutrients(usda.foodNutrients, servingGrams),
    ingredientsText: usda.ingredients,
    allergens: [],
    traces: [],
    additives: [],
    countries: ['United States'],
    url: `https://fdc.nal.usda.gov/food-details/${usda.fdcId}/nutrients`,
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
 * Map USDA nutrients to normalized Nutrient array. Handles both the flat
 * search shape and the nested details shape. When two USDA nutrient ids map
 * to the same standard id (e.g. energy 1008 and 2047), the first one wins.
 */
export function mapUSDANutrients(
  nutrients: (USDANutrient | USDAFoodNutrient)[] | undefined,
  servingGrams?: number,
): Nutrient[] {
  const result: Nutrient[] = [];
  const seen = new Set<string>();

  for (const raw of nutrients ?? []) {
    const flat = 'nutrient' in raw
      ? { id: raw.nutrient.id, name: raw.nutrient.name, unitName: raw.nutrient.unitName, value: raw.amount }
      : { id: raw.nutrientId, name: raw.nutrientName, unitName: raw.unitName, value: raw.value };

    const standardId = USDA_NUTRIENT_MAP[flat.id] as NutrientId | undefined;
    if (!standardId || seen.has(standardId) || typeof flat.value !== 'number') continue;
    seen.add(standardId);

    const unit = mapUSDAUnit(flat.unitName);
    const value = round(flat.value);
    result.push({
      id: standardId,
      name: flat.name,
      value,
      unit,
      per100g: value,
      perServing: servingGrams ? round((value * servingGrams) / 100) : undefined,
      dailyValuePercent: dailyValuePercent(standardId, value, unit),
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
    MG: 'mg',
    UG: 'mcg',
    MCG: 'mcg',
    KCAL: 'kcal',
    KJ: 'kJ',
    IU: 'IU',
  };
  // "µg" (micro sign) upper-cases to Greek "ΜG", so normalize it first
  const normalized = unit.replace(/[µμ]/g, 'u').toUpperCase();
  return unitMap[normalized] ?? 'g';
}
