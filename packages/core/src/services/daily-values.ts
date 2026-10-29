import { DAILY_VALUES, type DailyValueKey } from '../config/constants.js';
import type { NutrientId } from '../types/nutrition.types.js';
import type { NutrientUnit } from '../types/common.types.js';
import { round } from '../utils/text.js';

/**
 * Nutrient id -> FDA Daily Value key and the unit that Daily Value is in.
 * Total sugars has no Daily Value (only added sugars does).
 */
const DV_MAP: Partial<Record<NutrientId, { key: DailyValueKey; unit: NutrientUnit }>> = {
  energy_kcal: { key: 'calories', unit: 'kcal' },
  fat: { key: 'totalFat', unit: 'g' },
  saturated_fat: { key: 'saturatedFat', unit: 'g' },
  cholesterol: { key: 'cholesterol', unit: 'mg' },
  sodium: { key: 'sodium', unit: 'mg' },
  carbohydrates: { key: 'totalCarbohydrate', unit: 'g' },
  fiber: { key: 'dietaryFiber', unit: 'g' },
  added_sugars: { key: 'addedSugars', unit: 'g' },
  protein: { key: 'protein', unit: 'g' },
  vitamin_a: { key: 'vitaminA', unit: 'mcg' },
  vitamin_c: { key: 'vitaminC', unit: 'mg' },
  vitamin_d: { key: 'vitaminD', unit: 'mcg' },
  vitamin_e: { key: 'vitaminE', unit: 'mg' },
  vitamin_k: { key: 'vitaminK', unit: 'mcg' },
  vitamin_b1: { key: 'thiamin', unit: 'mg' },
  vitamin_b2: { key: 'riboflavin', unit: 'mg' },
  vitamin_b3: { key: 'niacin', unit: 'mg' },
  vitamin_b5: { key: 'pantothenicAcid', unit: 'mg' },
  vitamin_b6: { key: 'vitaminB6', unit: 'mg' },
  vitamin_b9: { key: 'folate', unit: 'mcg' },
  vitamin_b12: { key: 'vitaminB12', unit: 'mcg' },
  calcium: { key: 'calcium', unit: 'mg' },
  iron: { key: 'iron', unit: 'mg' },
  potassium: { key: 'potassium', unit: 'mg' },
  magnesium: { key: 'magnesium', unit: 'mg' },
  zinc: { key: 'zinc', unit: 'mg' },
  phosphorus: { key: 'phosphorus', unit: 'mg' },
  selenium: { key: 'selenium', unit: 'mcg' },
  copper: { key: 'copper', unit: 'mg' },
  manganese: { key: 'manganese', unit: 'mg' },
};

const UNIT_TO_GRAMS: Partial<Record<NutrientUnit, number>> = {
  g: 1,
  mg: 1e-3,
  mcg: 1e-6,
};

/**
 * Convert a value between mass units (g, mg, mcg). Returns undefined for
 * non-mass units unless they are identical.
 */
export function convertUnit(value: number, from: NutrientUnit, to: NutrientUnit): number | undefined {
  if (from === to) return value;
  const fromFactor = UNIT_TO_GRAMS[from];
  const toFactor = UNIT_TO_GRAMS[to];
  if (fromFactor === undefined || toFactor === undefined) return undefined;
  return (value * fromFactor) / toFactor;
}

/**
 * Percent of the FDA Daily Value provided by `value` (in `unit`).
 */
export function dailyValuePercent(id: NutrientId, value: number, unit: NutrientUnit): number | undefined {
  const dv = DV_MAP[id];
  if (!dv) return undefined;
  const converted = convertUnit(value, unit, dv.unit);
  if (converted === undefined) return undefined;
  return round((converted / DAILY_VALUES[dv.key]) * 100, 1);
}
