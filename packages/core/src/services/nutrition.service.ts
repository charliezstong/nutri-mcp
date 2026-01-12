import type { Product } from '../types/product.types.js';
import type {
  Nutrient,
  NutritionAnalysis,
  MacroBreakdown,
  NutritionConcern,
  NutritionBenefit,
} from '../types/nutrition.types.js';
import type { NutrientId } from '../types/nutrition.types.js';

/**
 * Nutrition Analysis Service
 */
export class NutritionService {
  /**
   * Analyze nutrition of a product
   */
  analyzeProduct(product: Product): NutritionAnalysis {
    const calories = this.getCalories(product.nutrients);
    const macros = this.calculateMacros(product.nutrients);
    const dailyValues = this.calculateDailyValues(product.nutrients);
    const concerns = this.identifyConcerns(product.nutrients);
    const benefits = this.identifyBenefits(product.nutrients);

    return {
      calories,
      macros,
      nutrients: product.nutrients,
      dailyValueSummary: dailyValues,
      concerns,
      benefits,
    };
  }

  /**
   * Calculate daily value percentages for all nutrients
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
        exceeds.push(n.id as NutrientId);
      } else if (percent >= 20) {
        adequate.push(n.id as NutrientId);
      } else {
        low.push(n.id as NutrientId);
      }
    }

    return { exceeds, adequate, low };
  }

  /**
   * Get calories from nutrients
   */
  getCalories(nutrients: Nutrient[]): number {
    const calNutrient = nutrients.find((n) => n.id === 'energy_kcal');
    return calNutrient?.value ?? 0;
  }

  /**
   * Calculate macro breakdown
   */
  calculateMacros(nutrients: Nutrient[]): MacroBreakdown {
    const protein = this.getNutrientValue(nutrients, 'protein');
    const carbs = this.getNutrientValue(nutrients, 'carbohydrates');
    const fat = this.getNutrientValue(nutrients, 'fat');

    const proteinCals = protein * 4;
    const carbsCals = carbs * 4;
    const fatCals = fat * 9;
    const totalCals = proteinCals + carbsCals + fatCals || 1;

    return {
      protein: {
        grams: protein,
        calories: proteinCals,
        percent: Math.round((proteinCals / totalCals) * 100),
      },
      carbs: {
        grams: carbs,
        calories: carbsCals,
        percent: Math.round((carbsCals / totalCals) * 100),
      },
      fat: {
        grams: fat,
        calories: fatCals,
        percent: Math.round((fatCals / totalCals) * 100),
      },
    };
  }

  /**
   * Calculate nutrient density (nutrients per calorie)
   */
  calculateNutrientDensity(product: Product): number {
    const calories = this.getCalories(product.nutrients);
    if (calories === 0) return 0;

    // Score based on positive nutrients per 100 calories
    const positiveNutrients = ['fiber', 'protein', 'vitamin_c', 'vitamin_a', 'calcium', 'iron', 'potassium'];
    let score = 0;

    for (const id of positiveNutrients) {
      const nutrient = product.nutrients.find((n) => n.id === id);
      if (nutrient?.dailyValuePercent) {
        score += nutrient.dailyValuePercent;
      }
    }

    // Normalize to per 100 calories
    return Math.round((score / calories) * 100);
  }

  /**
   * Identify nutritional concerns
   */
  identifyConcerns(nutrients: Nutrient[]): NutritionConcern[] {
    const concerns: NutritionConcern[] = [];

    const highThresholds: Record<string, { threshold: number; message: string }> = {
      sodium: { threshold: 20, message: 'High sodium content may increase blood pressure' },
      saturated_fat: { threshold: 20, message: 'High saturated fat may increase cholesterol' },
      sugars: { threshold: 25, message: 'High sugar content' },
      cholesterol: { threshold: 20, message: 'High cholesterol content' },
    };

    for (const n of nutrients) {
      const config = highThresholds[n.id];
      if (config && n.dailyValuePercent && n.dailyValuePercent >= config.threshold) {
        concerns.push({
          nutrient: n.id as NutrientId,
          level: n.dailyValuePercent >= 40 ? 'very_high' : 'high',
          message: config.message,
        });
      }
    }

    return concerns;
  }

  /**
   * Identify nutritional benefits
   */
  identifyBenefits(nutrients: Nutrient[]): NutritionBenefit[] {
    const benefits: NutritionBenefit[] = [];

    const benefitThresholds: Record<string, { threshold: number; message: string }> = {
      fiber: { threshold: 15, message: 'Good source of fiber for digestive health' },
      protein: { threshold: 20, message: 'Good source of protein' },
      vitamin_c: { threshold: 15, message: 'Good source of vitamin C for immune health' },
      vitamin_a: { threshold: 15, message: 'Good source of vitamin A for vision health' },
      calcium: { threshold: 15, message: 'Good source of calcium for bone health' },
      iron: { threshold: 15, message: 'Good source of iron' },
      potassium: { threshold: 10, message: 'Good source of potassium' },
    };

    for (const n of nutrients) {
      const config = benefitThresholds[n.id];
      if (config && n.dailyValuePercent && n.dailyValuePercent >= config.threshold) {
        benefits.push({
          nutrient: n.id as NutrientId,
          level: n.dailyValuePercent >= 30 ? 'excellent' : 'good',
          message: config.message,
        });
      }
    }

    return benefits;
  }

  /**
   * Compare nutrition between products
   */
  compareNutrition(products: Product[]): {
    winner: string | null;
    comparison: Record<string, { values: Record<string, number>; better: string | null }>;
  } {
    if (products.length < 2) {
      return { winner: null, comparison: {} };
    }

    const comparison: Record<string, { values: Record<string, number>; better: string | null }> = {};
    const scores: Record<string, number> = {};

    // Initialize scores
    for (const p of products) {
      scores[p.barcode] = 0;
    }

    // Compare key nutrients
    const nutrientsToCompare = [
      { id: 'energy_kcal', lower: true },
      { id: 'protein', lower: false },
      { id: 'fiber', lower: false },
      { id: 'sugars', lower: true },
      { id: 'sodium', lower: true },
      { id: 'saturated_fat', lower: true },
    ];

    for (const { id, lower } of nutrientsToCompare) {
      const values: Record<string, number> = {};
      let best: { barcode: string; value: number } | null = null;

      for (const p of products) {
        const value = this.getNutrientValue(p.nutrients, id);
        values[p.barcode] = value;

        if (best === null) {
          best = { barcode: p.barcode, value };
        } else {
          const isBetter = lower ? value < best.value : value > best.value;
          if (isBetter) {
            best = { barcode: p.barcode, value };
          }
        }
      }

      comparison[id] = {
        values,
        better: best?.barcode ?? null,
      };

      if (best) {
        scores[best.barcode]!++;
      }
    }

    // Determine winner
    let winner: string | null = null;
    let maxScore = 0;

    for (const [barcode, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        winner = barcode;
      }
    }

    return { winner, comparison };
  }

  /**
   * Get nutrient value by ID
   */
  private getNutrientValue(nutrients: Nutrient[], id: string): number {
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
