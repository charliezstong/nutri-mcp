import type { Product } from '../types/product.types.js';
import type {
  Nutrient,
  NutritionAnalysis,
  MacroBreakdown,
  NutritionConcern,
  NutritionBenefit,
  NutrientId,
} from '../types/nutrition.types.js';
import { TRAFFIC_LIGHTS } from '../config/constants.js';
import { round } from '../utils/text.js';

export type TrafficLight = 'low' | 'medium' | 'high';

export interface TrafficLights {
  fat?: TrafficLight;
  saturated_fat?: TrafficLight;
  sugars?: TrafficLight;
  salt?: TrafficLight;
}

const CONCERN_MESSAGES: Record<keyof typeof TRAFFIC_LIGHTS, string> = {
  fat: 'High in fat',
  saturated_fat: 'High in saturated fat, which may raise LDL cholesterol',
  sugars: 'High in sugars',
  salt: 'High in salt, which may raise blood pressure',
};

const BENEFIT_MESSAGES: Partial<Record<NutrientId, string>> = {
  fiber: 'Source of fiber for digestive health',
  protein: 'Source of protein',
  vitamin_a: 'Source of vitamin A',
  vitamin_c: 'Source of vitamin C',
  vitamin_d: 'Source of vitamin D',
  vitamin_e: 'Source of vitamin E',
  vitamin_b12: 'Source of vitamin B12',
  vitamin_b9: 'Source of folate',
  calcium: 'Source of calcium for bone health',
  iron: 'Source of iron',
  potassium: 'Source of potassium',
  magnesium: 'Source of magnesium',
  zinc: 'Source of zinc',
};

/**
 * Nutrition Analysis Service. All values are per 100 g / 100 ml.
 */
export class NutritionService {
  /**
   * Analyze nutrition of a product
   */
  analyzeProduct(product: Product): NutritionAnalysis & { trafficLights: TrafficLights; basis: string } {
    return {
      calories: this.getCalories(product.nutrients),
      macros: this.calculateMacros(product.nutrients),
      nutrients: product.nutrients,
      dailyValueSummary: this.calculateDailyValues(product.nutrients),
      trafficLights: this.trafficLights(product.nutrients),
      concerns: this.identifyConcerns(product.nutrients),
      benefits: this.identifyBenefits(product.nutrients),
      basis: 'per 100 g / 100 ml; Daily Values from FDA (2,000 kcal diet); traffic lights from UK FSA',
    };
  }

  /**
   * Classify nutrients by percent of Daily Value
   */
  calculateDailyValues(nutrients: Nutrient[]): {
    exceeds: NutrientId[];
    adequate: NutrientId[];
    low: NutrientId[];
  } {
    const exceeds: NutrientId[] = [];
    const adequate: NutrientId[] = [];
    const low: NutrientId[] = [];

    for (const n of nutrients) {
      const percent = n.dailyValuePercent;
      if (percent === undefined) continue;

      if (percent > 100) {
        exceeds.push(n.id);
      } else if (percent >= 20) {
        adequate.push(n.id);
      } else {
        low.push(n.id);
      }
    }

    return { exceeds, adequate, low };
  }

  /**
   * Get calories (kcal), deriving them from kJ when needed
   */
  getCalories(nutrients: Nutrient[]): number {
    const kcal = nutrients.find((n) => n.id === 'energy_kcal')?.value;
    if (kcal !== undefined) return kcal;
    const kj = nutrients.find((n) => n.id === 'energy_kj')?.value;
    return kj !== undefined ? round(kj / 4.184, 0) : 0;
  }

  /**
   * Calculate macro breakdown (share of energy from protein, carbs, fat)
   */
  calculateMacros(nutrients: Nutrient[]): MacroBreakdown {
    const protein = this.getNutrientValue(nutrients, 'protein');
    const carbs = this.getNutrientValue(nutrients, 'carbohydrates');
    const fat = this.getNutrientValue(nutrients, 'fat');

    const proteinCals = protein * 4;
    const carbsCals = carbs * 4;
    const fatCals = fat * 9;
    const totalCals = proteinCals + carbsCals + fatCals || 1;

    const part = (grams: number, calories: number) => ({
      grams,
      calories: round(calories, 1),
      percent: Math.round((calories / totalCals) * 100),
    });

    return {
      protein: part(protein, proteinCals),
      carbs: part(carbs, carbsCals),
      fat: part(fat, fatCals),
    };
  }

  /**
   * Nutrient density: sum of %DV of beneficial nutrients per 100 kcal
   */
  calculateNutrientDensity(product: Product): number {
    const calories = this.getCalories(product.nutrients);
    if (calories === 0) return 0;

    const positiveNutrients: NutrientId[] = [
      'fiber', 'protein', 'vitamin_a', 'vitamin_c', 'vitamin_d', 'calcium', 'iron', 'potassium', 'magnesium',
    ];
    let score = 0;

    for (const id of positiveNutrients) {
      const nutrient = product.nutrients.find((n) => n.id === id);
      if (nutrient?.dailyValuePercent) {
        score += Math.min(nutrient.dailyValuePercent, 100);
      }
    }

    return Math.round((score / calories) * 100);
  }

  /**
   * UK FSA front-of-pack traffic lights (per 100 g, foods)
   */
  trafficLights(nutrients: Nutrient[]): TrafficLights {
    const result: TrafficLights = {};
    for (const key of Object.keys(TRAFFIC_LIGHTS) as (keyof typeof TRAFFIC_LIGHTS)[]) {
      const value = nutrients.find((n) => n.id === key)?.per100g
        ?? (key === 'salt' ? this.saltFromSodium(nutrients) : undefined);
      if (value === undefined) continue;
      const { low, high } = TRAFFIC_LIGHTS[key];
      result[key] = value <= low ? 'low' : value > high ? 'high' : 'medium';
    }
    return result;
  }

  /**
   * Identify nutritional concerns (FSA "high" thresholds)
   */
  identifyConcerns(nutrients: Nutrient[]): NutritionConcern[] {
    const lights = this.trafficLights(nutrients);
    const concerns: NutritionConcern[] = [];

    for (const [key, light] of Object.entries(lights) as [keyof typeof TRAFFIC_LIGHTS, TrafficLight][]) {
      if (light !== 'high') continue;
      const value = nutrients.find((n) => n.id === key)?.per100g ?? this.saltFromSodium(nutrients) ?? 0;
      concerns.push({
        nutrient: key,
        level: value > TRAFFIC_LIGHTS[key].high * 2 ? 'very_high' : 'high',
        message: `${CONCERN_MESSAGES[key]} (${value} g per 100 g)`,
      });
    }

    const trans = nutrients.find((n) => n.id === 'trans_fat')?.per100g;
    if (trans !== undefined && trans > 0.5) {
      concerns.push({ nutrient: 'trans_fat', level: 'high', message: `Contains trans fat (${trans} g per 100 g)` });
    }

    return concerns;
  }

  /**
   * Identify nutritional benefits (FDA: "good source" >= 10% DV, "excellent" >= 20% DV)
   */
  identifyBenefits(nutrients: Nutrient[]): NutritionBenefit[] {
    const benefits: NutritionBenefit[] = [];

    for (const n of nutrients) {
      const message = BENEFIT_MESSAGES[n.id];
      if (!message || n.dailyValuePercent === undefined || n.dailyValuePercent < 10) continue;
      benefits.push({
        nutrient: n.id,
        level: n.dailyValuePercent >= 20 ? 'excellent' : 'good',
        message: `${message} (${n.dailyValuePercent}% DV per 100 g)`,
      });
    }

    return benefits;
  }

  private saltFromSodium(nutrients: Nutrient[]): number | undefined {
    const sodiumMg = nutrients.find((n) => n.id === 'sodium')?.per100g;
    return sodiumMg === undefined ? undefined : round((sodiumMg / 1000) * 2.5, 3);
  }

  /**
   * Get nutrient value by ID
   */
  getNutrientValue(nutrients: Nutrient[], id: string): number {
    const nutrient = nutrients.find((n) => n.id === id);
    return nutrient?.value ?? 0;
  }
}

// Singleton
let instance: NutritionService | null = null;

export function getNutritionService(): NutritionService {
  if (!instance) {
    instance = new NutritionService();
  }
  return instance;
}
