import type { Product, Allergen } from '../types/product.types.js';
import type { AllergenId, DietType } from '../types/common.types.js';
import { BIG_9_ALLERGENS, EU_14_ALLERGENS } from '../config/constants.js';
import { getLogger } from '../transport/logger.js';

const logger = getLogger().child('allergen-service');

export interface AllergenCheckResult {
  safe: boolean;
  allergen: AllergenId;
  found: Allergen | null;
  inTraces: boolean;
}

export interface DietComplianceResult {
  compliant: boolean;
  diet: DietType;
  violations: string[];
}

/**
 * Allergen and Dietary Service
 */
export class AllergenService {
  /**
   * Check single allergen
   */
  checkAllergen(product: Product, allergen: AllergenId): AllergenCheckResult {
    const found = product.allergens.find((a) => a.id === allergen);
    const inTraces = product.traces.some((t) => t.id === allergen);

    return {
      safe: !found && !inTraces,
      allergen,
      found: found ?? null,
      inTraces,
    };
  }

  /**
   * Check multiple allergens
   */
  checkMultipleAllergens(
    product: Product,
    allergens: AllergenId[],
  ): { safe: boolean; results: AllergenCheckResult[] } {
    const results = allergens.map((a) => this.checkAllergen(product, a));
    const safe = results.every((r) => r.safe);

    return { safe, results };
  }

  /**
   * Check Big 9 allergens (FDA)
   */
  checkBig9(product: Product): { safe: boolean; results: AllergenCheckResult[] } {
    return this.checkMultipleAllergens(product, [...BIG_9_ALLERGENS] as AllergenId[]);
  }

  /**
   * Check EU 14 allergens
   */
  checkEU14(product: Product): { safe: boolean; results: AllergenCheckResult[] } {
    return this.checkMultipleAllergens(product, [...EU_14_ALLERGENS] as AllergenId[]);
  }

  /**
   * Get all allergens in product
   */
  getAllAllergens(product: Product): {
    confirmed: Allergen[];
    mayContain: Allergen[];
    traces: Allergen[];
  } {
    return {
      confirmed: product.allergens.filter((a) => a.certainty === 'confirmed'),
      mayContain: product.allergens.filter((a) => a.certainty === 'may_contain'),
      traces: product.traces,
    };
  }

  /**
   * Check cross-contamination risk
   */
  assessCrossContaminationRisk(product: Product): {
    risk: 'low' | 'medium' | 'high';
    factors: string[];
  } {
    const factors: string[] = [];
    let riskScore = 0;

    // Check traces
    if (product.traces.length > 0) {
      factors.push(`Product may contain traces of: ${product.traces.map((t) => t.name).join(', ')}`);
      riskScore += product.traces.length;
    }

    // Check may_contain allergens
    const mayContain = product.allergens.filter((a) => a.certainty === 'may_contain');
    if (mayContain.length > 0) {
      factors.push(`May contain: ${mayContain.map((a) => a.name).join(', ')}`);
      riskScore += mayContain.length * 2;
    }

    // Check ingredients text for warnings
    const ingredientsText = product.ingredientsText?.toLowerCase() ?? '';
    if (ingredientsText.includes('shared equipment') || ingredientsText.includes('same facility')) {
      factors.push('Manufactured on shared equipment');
      riskScore += 3;
    }

    const risk = riskScore === 0 ? 'low' : riskScore <= 3 ? 'medium' : 'high';

    return { risk, factors };
  }

  /**
   * Check diet compliance
   */
  checkDietCompliance(product: Product, diet: DietType): DietComplianceResult {
    const violations: string[] = [];
    const ingredients = product.ingredientsText?.toLowerCase() ?? '';

    switch (diet) {
      case 'vegan':
        if (this.containsAnimalProducts(product, ingredients)) {
          violations.push('Contains animal-derived ingredients');
        }
        break;

      case 'vegetarian':
        if (this.containsMeat(ingredients)) {
          violations.push('Contains meat or meat-derived ingredients');
        }
        break;

      case 'gluten_free':
        if (product.allergens.some((a) => a.id === 'gluten')) {
          violations.push('Contains gluten');
        }
        if (product.traces.some((t) => t.id === 'gluten')) {
          violations.push('May contain traces of gluten');
        }
        break;

      case 'dairy_free':
        if (product.allergens.some((a) => a.id === 'dairy')) {
          violations.push('Contains dairy');
        }
        break;

      case 'keto':
        const carbs = product.nutrients.find((n) => n.id === 'carbohydrates');
        if (carbs && carbs.per100g && carbs.per100g > 10) {
          violations.push(`High carbohydrate content: ${carbs.per100g}g per 100g`);
        }
        break;

      case 'low_sodium':
        const sodium = product.nutrients.find((n) => n.id === 'sodium');
        if (sodium && sodium.dailyValuePercent && sodium.dailyValuePercent > 15) {
          violations.push(`High sodium: ${sodium.dailyValuePercent}% daily value`);
        }
        break;

      case 'low_sugar':
        const sugar = product.nutrients.find((n) => n.id === 'sugars');
        if (sugar && sugar.per100g && sugar.per100g > 5) {
          violations.push(`High sugar content: ${sugar.per100g}g per 100g`);
        }
        break;

      default:
        logger.warn(`Diet type ${diet} not fully implemented`);
    }

    return {
      compliant: violations.length === 0,
      diet,
      violations,
    };
  }

  /**
   * Find products safe for allergens
   */
  filterSafeProducts(products: Product[], allergens: AllergenId[]): Product[] {
    return products.filter((p) => {
      const check = this.checkMultipleAllergens(p, allergens);
      return check.safe;
    });
  }

  private containsAnimalProducts(product: Product, ingredients: string): boolean {
    const animalKeywords = [
      'milk', 'dairy', 'cheese', 'butter', 'cream', 'yogurt',
      'egg', 'honey', 'gelatin', 'whey', 'casein', 'lactose',
      'meat', 'beef', 'pork', 'chicken', 'fish', 'seafood',
      'shellfish', 'anchovy', 'lard', 'tallow',
    ];

    return animalKeywords.some((kw) => ingredients.includes(kw)) ||
      product.allergens.some((a) => ['dairy', 'eggs', 'fish', 'shellfish'].includes(a.id));
  }

  private containsMeat(ingredients: string): boolean {
    const meatKeywords = [
      'meat', 'beef', 'pork', 'chicken', 'turkey', 'lamb',
      'fish', 'seafood', 'shellfish', 'anchovy', 'bacon',
      'ham', 'sausage', 'gelatin', 'lard', 'tallow',
    ];

    return meatKeywords.some((kw) => ingredients.includes(kw));
  }
}

// Singleton
let instance: AllergenService | null = null;

export function getAllergenService(): AllergenService {
  if (!instance) {
    instance = new AllergenService();
  }
  return instance;
}
