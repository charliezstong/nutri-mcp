import type { Product, Allergen, AnalysisStatus } from '../types/product.types.js';
import type { AllergenId, DietType } from '../types/common.types.js';
import { BIG_9_ALLERGENS, EU_14_ALLERGENS, EU_CLAIMS, IMPLIED_ALLERGENS } from '../config/constants.js';
import { containsWord } from '../utils/text.js';

export interface AllergenCheckResult {
  safe: boolean;
  allergen: AllergenId;
  found: Allergen | null;
  inTraces: boolean;
  /** Present when the allergen was inferred from a broader tag (e.g. wheat from gluten). */
  note?: string;
}

export type ComplianceVerdict = 'compliant' | 'not_compliant' | 'uncertain';

export interface DietComplianceResult {
  compliant: boolean;
  verdict: ComplianceVerdict;
  diet: DietType;
  violations: string[];
  warnings: string[];
  basis: string[];
}

/**
 * Ingredient keywords (English, Spanish, French, German, Italian, Portuguese).
 * Matched as whole words after removing plant-based phrases.
 */
const MEAT_KEYWORDS = [
  'meat', 'beef', 'pork', 'chicken', 'turkey', 'lamb', 'veal', 'duck', 'bacon', 'ham', 'sausage',
  'gelatin', 'gelatine', 'lard', 'tallow', 'anchovy', 'anchovies',
  'carne', 'cerdo', 'pollo', 'pavo', 'cordero', 'ternera', 'jamón', 'tocino', 'manteca de cerdo', 'gelatina',
  'viande', 'porc', 'poulet', 'dinde', 'agneau', 'boeuf', 'bœuf', 'jambon', 'lardons', 'saindoux',
  'fleisch', 'schwein', 'rindfleisch', 'huhn', 'speck', 'schinken',
  'manzo', 'maiale', 'prosciutto', 'frango', 'porco',
];
const FISH_KEYWORDS = [
  'fish', 'tuna', 'salmon', 'cod', 'shrimp', 'prawn', 'crab', 'lobster', 'shellfish', 'seafood', 'oyster', 'mussel',
  'pescado', 'atún', 'salmón', 'bacalao', 'gamba', 'camarón', 'marisco', 'mariscos',
  'poisson', 'thon', 'saumon', 'crevette', 'crevettes', 'moules', 'fisch', 'lachs', 'pesce', 'tonno', 'peixe',
];
const ANIMAL_PRODUCT_KEYWORDS = [
  'milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'whey', 'casein', 'caseinate', 'lactose', 'ghee',
  'egg', 'eggs', 'honey', 'albumin', 'lysozyme', 'beeswax', 'carmine', 'cochineal', 'shellac',
  'leche', 'queso', 'mantequilla', 'nata', 'crema', 'yogur', 'suero', 'huevo', 'huevos', 'miel',
  'lait', 'fromage', 'beurre', 'crème', 'oeuf', 'œuf', 'oeufs', 'œufs', 'lactosérum',
  'milch', 'käse', 'sahne', 'molke', 'ei', 'eier', 'honig',
  'latte', 'formaggio', 'burro', 'panna', 'uovo', 'uova', 'miele', 'leite', 'queijo', 'manteiga', 'ovo', 'ovos',
  'e120', 'e441', 'e542', 'e901', 'e904', 'e913', 'e966',
];
/** Plant-based phrases that would otherwise trigger the keywords above */
const PLANT_PHRASES = [
  'coconut milk', 'coconut cream', 'almond milk', 'oat milk', 'soy milk', 'soya milk', 'rice milk', 'cashew milk',
  'peanut butter', 'cocoa butter', 'shea butter', 'nut butter', 'almond butter', 'apple butter',
  'leche de coco', 'leche de almendra', 'leche de avena', 'leche de soja', 'manteca de cacao', 'crema de cacahuete',
  'lait de coco', 'beurre de cacao', 'beurre de cacahuète', 'kakaobutter', 'kokosmilch', 'burro di cacao',
  'cream of tartar', 'egg-free', 'egg free', 'milk-free', 'dairy-free', 'sin leche', 'sans lait',
];

/**
 * Allergen and Dietary Service
 */
export class AllergenService {
  /**
   * Check single allergen
   */
  checkAllergen(product: Product, allergen: AllergenId): AllergenCheckResult {
    let found = product.allergens.find((a) => a.id === allergen) ?? null;
    let inTraces = product.traces.some((t) => t.id === allergen);
    let note: string | undefined;

    // OFF tags wheat as gluten: treat a gluten tag as a possible wheat source
    const implied = IMPLIED_ALLERGENS[allergen] ?? [];
    if (!found && !inTraces && implied.length > 0) {
      const impliedFound = product.allergens.find((a) => implied.includes(a.id));
      const impliedTrace = product.traces.some((t) => implied.includes(t.id));
      if (impliedFound) {
        found = { id: allergen, name: allergen.replace(/_/g, ' '), certainty: 'may_contain' };
        note = `Contains ${impliedFound.name}; ${allergen} cannot be ruled out`;
      } else if (impliedTrace) {
        inTraces = true;
        note = `May contain traces of ${implied.join('/')}; ${allergen} cannot be ruled out`;
      }
    }

    return {
      safe: !found && !inTraces,
      allergen,
      found,
      inTraces,
      ...(note ? { note } : {}),
    };
  }

  /**
   * Check multiple allergens
   */
  checkMultipleAllergens(
    product: Product,
    allergens: AllergenId[],
  ): { safe: boolean; results: AllergenCheckResult[] } {
    const results = [...new Set(allergens)].map((a) => this.checkAllergen(product, a));
    return { safe: results.every((r) => r.safe), results };
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
    risk: 'low' | 'medium' | 'high' | 'unknown';
    factors: string[];
  } {
    const factors: string[] = [];
    let riskScore = 0;

    if (product.traces.length > 0) {
      factors.push(`May contain traces of: ${product.traces.map((t) => t.name).join(', ')}`);
      riskScore += product.traces.length;
    }

    const mayContain = product.allergens.filter((a) => a.certainty === 'may_contain');
    if (mayContain.length > 0) {
      factors.push(`May contain: ${mayContain.map((a) => a.name).join(', ')}`);
      riskScore += mayContain.length * 2;
    }

    const ingredientsText = product.ingredientsText?.toLowerCase() ?? '';
    const facilityPhrases = [
      'shared equipment', 'same facility', 'same production line', 'processed in a facility',
      'mismas instalaciones', 'puede contener', 'peut contenir', 'kann spuren', 'può contenere',
    ];
    const phrase = facilityPhrases.find((p) => ingredientsText.includes(p));
    if (phrase) {
      factors.push(`Label warning: "${phrase}"`);
      riskScore += 3;
    }

    if (!product.ingredientsText && product.allergens.length === 0 && product.traces.length === 0) {
      return { risk: 'unknown', factors: ['No ingredient or allergen data available'] };
    }

    const risk = riskScore === 0 ? 'low' : riskScore <= 3 ? 'medium' : 'high';
    return { risk, factors };
  }

  /**
   * Check diet compliance. Uses the ingredient analysis computed by Open Food
   * Facts when present, falling back to keyword matching on ingredients.
   */
  checkDietCompliance(product: Product, diet: DietType): DietComplianceResult {
    const violations: string[] = [];
    const warnings: string[] = [];
    const basis: string[] = [];
    let uncertain = false;
    const ingredients = stripPlantPhrases(product.ingredientsText ?? '');
    const hasIngredients = ingredients.trim().length > 0;
    const per100g = (id: string): number | undefined =>
      product.nutrients.find((n) => n.id === id)?.per100g;

    const fromAnalysis = (status: AnalysisStatus | undefined, label: string): void => {
      if (!status) return;
      basis.push(`Open Food Facts ingredient analysis: ${label} = ${status}`);
      if (status === 'no') violations.push(`Not ${label} according to ingredient analysis`);
      if (status === 'maybe') {
        uncertain = true;
        warnings.push(`Some ingredients may not be ${label}`);
      }
      if (status === 'unknown') uncertain = true;
    };

    const keywordHits = (keywords: string[]): string[] =>
      keywords.filter((kw) => containsWord(ingredients, kw));

    switch (diet) {
      case 'vegan': {
        fromAnalysis(product.ingredientsAnalysis?.vegan, 'vegan');
        const hits = [...keywordHits(MEAT_KEYWORDS), ...keywordHits(FISH_KEYWORDS), ...keywordHits(ANIMAL_PRODUCT_KEYWORDS)];
        const allergenHits = product.allergens.filter((a) => ['dairy', 'eggs', 'fish', 'shellfish', 'mollusks'].includes(a.id));
        if (hits.length > 0) {
          // A positive OFF analysis outranks a keyword match, which can be a false positive
          (product.ingredientsAnalysis?.vegan === 'yes' ? warnings : violations)
            .push(`Possibly animal-derived ingredients: ${[...new Set(hits)].join(', ')}`);
        }
        if (allergenHits.length > 0) violations.push(`Contains ${allergenHits.map((a) => a.name).join(', ')}`);
        break;
      }

      case 'vegetarian': {
        fromAnalysis(product.ingredientsAnalysis?.vegetarian, 'vegetarian');
        const hits = [...keywordHits(MEAT_KEYWORDS), ...keywordHits(FISH_KEYWORDS)];
        if (hits.length > 0) {
          (product.ingredientsAnalysis?.vegetarian === 'yes' ? warnings : violations)
            .push(`Possibly meat or fish ingredients: ${[...new Set(hits)].join(', ')}`);
        }
        if (product.allergens.some((a) => ['fish', 'shellfish', 'mollusks'].includes(a.id))) {
          violations.push('Contains fish or shellfish');
        }
        break;
      }

      case 'pescatarian': {
        const hits = keywordHits(MEAT_KEYWORDS);
        if (hits.length > 0) violations.push(`Meat ingredients: ${[...new Set(hits)].join(', ')}`);
        break;
      }

      case 'gluten_free':
        if (product.allergens.some((a) => a.id === 'gluten' || a.id === 'wheat')) {
          violations.push('Contains gluten');
        }
        if (product.traces.some((t) => t.id === 'gluten' || t.id === 'wheat')) {
          violations.push('May contain traces of gluten');
        }
        if (product.labels.some((l) => /gluten.?free|no gluten|sin gluten|sans gluten/i.test(l))) {
          basis.push('Labelled gluten-free');
        }
        break;

      case 'dairy_free':
        if (product.allergens.some((a) => a.id === 'dairy')) violations.push('Contains milk');
        if (product.traces.some((t) => t.id === 'dairy')) warnings.push('May contain traces of milk');
        break;

      case 'keto': {
        const carbs = per100g('carbohydrates');
        const fiber = per100g('fiber') ?? 0;
        if (carbs === undefined) {
          uncertain = true;
        } else {
          const netCarbs = Math.max(0, carbs - fiber);
          basis.push(`Net carbs ${netCarbs.toFixed(1)} g per 100 g (threshold 10 g)`);
          if (netCarbs > 10) violations.push(`High net carbohydrates: ${netCarbs.toFixed(1)} g per 100 g`);
        }
        break;
      }

      case 'low_sodium': {
        const sodiumMg = per100g('sodium');
        if (sodiumMg === undefined) {
          uncertain = true;
        } else {
          const limitMg = EU_CLAIMS.lowSodium * 1000;
          basis.push(`Sodium ${sodiumMg} mg per 100 g (EU "low sodium" claim: <= ${limitMg} mg)`);
          if (sodiumMg > limitMg) violations.push(`Sodium ${sodiumMg} mg per 100 g exceeds ${limitMg} mg`);
        }
        break;
      }

      case 'low_sugar': {
        const sugars = per100g('sugars');
        if (sugars === undefined) {
          uncertain = true;
        } else {
          basis.push(`Sugars ${sugars} g per 100 g (EU "low sugar" claim: <= ${EU_CLAIMS.lowSugar} g)`);
          if (sugars > EU_CLAIMS.lowSugar) violations.push(`Sugars ${sugars} g per 100 g exceeds ${EU_CLAIMS.lowSugar} g`);
        }
        break;
      }

      case 'paleo': {
        if (product.novaGroup === 4) violations.push('Ultra-processed (NOVA 4)');
        const grains = keywordHits(['wheat', 'flour', 'sugar', 'corn', 'rice', 'oats', 'soy', 'legumes', 'beans', 'harina', 'azúcar', 'farine', 'sucre']);
        if (grains.length > 0) violations.push(`Non-paleo ingredients: ${grains.join(', ')}`);
        break;
      }

      case 'halal':
      case 'kosher': {
        const label = diet === 'halal' ? /halal/i : /kosher|casher/i;
        const certified = product.labels.some((l) => label.test(l));
        if (certified) {
          basis.push(`Certified ${diet} label`);
        } else {
          uncertain = true;
          warnings.push(`No ${diet} certification label; religious compliance cannot be determined from ingredients`);
        }
        const pork = keywordHits(['pork', 'lard', 'bacon', 'ham', 'gelatin', 'gelatine', 'cerdo', 'porc', 'schwein', 'maiale', 'e441']);
        if (pork.length > 0) violations.push(`Ingredients typically not ${diet}: ${pork.join(', ')}`);
        if (diet === 'halal' && keywordHits(['alcohol', 'wine', 'beer', 'rum', 'vino', 'vin']).length > 0) {
          violations.push('Contains alcohol');
        }
        break;
      }
    }

    if (!hasIngredients && ['vegan', 'vegetarian', 'pescatarian', 'paleo', 'halal', 'kosher'].includes(diet)) {
      uncertain = true;
      warnings.push('No ingredient list available');
    }

    const verdict: ComplianceVerdict = violations.length > 0
      ? 'not_compliant'
      : uncertain ? 'uncertain' : 'compliant';

    return {
      compliant: verdict === 'compliant',
      verdict,
      diet,
      violations,
      warnings,
      basis,
    };
  }

  /**
   * Find products safe for allergens
   */
  filterSafeProducts(products: Product[], allergens: AllergenId[]): Product[] {
    return products.filter((p) => this.checkMultipleAllergens(p, allergens).safe);
  }
}

function stripPlantPhrases(text: string): string {
  let result = text.toLowerCase();
  for (const phrase of PLANT_PHRASES) {
    result = result.split(phrase).join(' ');
  }
  return result;
}

// Singleton
let instance: AllergenService | null = null;

export function getAllergenService(): AllergenService {
  if (!instance) {
    instance = new AllergenService();
  }
  return instance;
}
