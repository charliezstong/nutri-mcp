import type { DataSource, NutrientUnit, NutriScoreGrade, GreenScoreGrade } from './common.types.js';

/**
 * Standard nutrient identifiers
 */
export type NutrientId =
  // Energy
  | 'energy'
  | 'energy_kcal'
  | 'energy_kj'
  // Macronutrients
  | 'fat'
  | 'saturated_fat'
  | 'trans_fat'
  | 'monounsaturated_fat'
  | 'polyunsaturated_fat'
  | 'cholesterol'
  | 'carbohydrates'
  | 'sugars'
  | 'added_sugars'
  | 'fiber'
  | 'protein'
  // Minerals
  | 'sodium'
  | 'salt'
  | 'calcium'
  | 'iron'
  | 'potassium'
  | 'magnesium'
  | 'zinc'
  | 'phosphorus'
  | 'selenium'
  | 'copper'
  | 'manganese'
  // Vitamins
  | 'vitamin_a'
  | 'vitamin_c'
  | 'vitamin_d'
  | 'vitamin_e'
  | 'vitamin_k'
  | 'vitamin_b1'
  | 'vitamin_b2'
  | 'vitamin_b3'
  | 'vitamin_b5'
  | 'vitamin_b6'
  | 'vitamin_b9'
  | 'vitamin_b12'
  // Other
  | 'alcohol'
  | 'caffeine'
  | 'water';

/**
 * Normalized nutrient information
 */
export interface Nutrient {
  id: NutrientId;
  name: string;
  value: number;
  unit: NutrientUnit;
  per100g?: number;
  perServing?: number;
  dailyValuePercent?: number;
  source: DataSource;
}

/**
 * Serving size information
 */
export interface ServingSize {
  amount: number;
  unit: string;
  grams?: number;
  description?: string;
}

/**
 * Nutri-Score detailed breakdown
 */
export interface NutriScore {
  grade: NutriScoreGrade;
  score?: number;                // lower is better
  version?: '2021' | '2023';
  positive: NutriScoreComponent[];
  negative: NutriScoreComponent[];
}

export interface NutriScoreComponent {
  id: string;
  value: number | null;
  unit?: string;
  points: number;
  pointsMax?: number;
}

/**
 * Green-Score (formerly Eco-Score) environmental impact
 */
export interface GreenScore {
  grade: GreenScoreGrade;
  score?: number;                // 0-100 (can be negative with maluses)
}

/**
 * Macro breakdown
 */
export interface MacroBreakdown {
  protein: { grams: number; calories: number; percent: number };
  carbs: { grams: number; calories: number; percent: number };
  fat: { grams: number; calories: number; percent: number };
  alcohol?: { grams: number; calories: number; percent: number };
}

/**
 * Nutritional analysis result
 */
export interface NutritionAnalysis {
  calories: number;
  macros: MacroBreakdown;
  nutrients: Nutrient[];
  dailyValueSummary: DailyValueSummary;
  concerns: NutritionConcern[];
  benefits: NutritionBenefit[];
}

export interface DailyValueSummary {
  exceeds: NutrientId[];        // >100% DV
  adequate: NutrientId[];       // 20-100% DV
  low: NutrientId[];            // <20% DV
}

export interface NutritionConcern {
  nutrient: NutrientId;
  level: 'high' | 'very_high';
  message: string;
}

export interface NutritionBenefit {
  nutrient: NutrientId;
  level: 'good' | 'excellent';
  message: string;
}
