import type {
  Product,
  ProductSummary,
  Allergen,
  Additive,
  IngredientsAnalysis,
  AnalysisStatus,
} from '../../types/product.types.js';
import type { Nutrient, NutrientId, NutriScore, NutriScoreComponent, GreenScore } from '../../types/nutrition.types.js';
import type { NovaGroup, AllergenId, NutrientUnit, GreenScoreGrade, NutriScoreGrade } from '../../types/common.types.js';
import { ALLERGEN_MAP } from '../../config/constants.js';
import { dailyValuePercent } from '../../services/daily-values.js';
import { round, tagToLabel } from '../../utils/text.js';
import type { OFFNutriScoreComponent, OFFProduct } from './types.js';

/**
 * Open Food Facts nutriment keys. OFF normalizes every `<nutrient>_100g`
 * value to grams (except energy in kcal/kJ and alcohol in % vol), so
 * `factor` converts grams to the unit we expose.
 */
const NUTRIENT_MAP: { key: string; id: NutrientId; name: string; unit: NutrientUnit; factor: number }[] = [
  { key: 'energy-kcal', id: 'energy_kcal', name: 'Energy', unit: 'kcal', factor: 1 },
  { key: 'energy-kj', id: 'energy_kj', name: 'Energy', unit: 'kJ', factor: 1 },
  { key: 'fat', id: 'fat', name: 'Fat', unit: 'g', factor: 1 },
  { key: 'saturated-fat', id: 'saturated_fat', name: 'Saturated Fat', unit: 'g', factor: 1 },
  { key: 'trans-fat', id: 'trans_fat', name: 'Trans Fat', unit: 'g', factor: 1 },
  { key: 'monounsaturated-fat', id: 'monounsaturated_fat', name: 'Monounsaturated Fat', unit: 'g', factor: 1 },
  { key: 'polyunsaturated-fat', id: 'polyunsaturated_fat', name: 'Polyunsaturated Fat', unit: 'g', factor: 1 },
  { key: 'cholesterol', id: 'cholesterol', name: 'Cholesterol', unit: 'mg', factor: 1000 },
  { key: 'carbohydrates', id: 'carbohydrates', name: 'Carbohydrates', unit: 'g', factor: 1 },
  { key: 'sugars', id: 'sugars', name: 'Sugars', unit: 'g', factor: 1 },
  { key: 'added-sugars', id: 'added_sugars', name: 'Added Sugars', unit: 'g', factor: 1 },
  { key: 'fiber', id: 'fiber', name: 'Fiber', unit: 'g', factor: 1 },
  { key: 'proteins', id: 'protein', name: 'Protein', unit: 'g', factor: 1 },
  { key: 'salt', id: 'salt', name: 'Salt', unit: 'g', factor: 1 },
  { key: 'sodium', id: 'sodium', name: 'Sodium', unit: 'mg', factor: 1000 },
  { key: 'alcohol', id: 'alcohol', name: 'Alcohol', unit: '% vol', factor: 1 },
  { key: 'caffeine', id: 'caffeine', name: 'Caffeine', unit: 'mg', factor: 1000 },
  { key: 'calcium', id: 'calcium', name: 'Calcium', unit: 'mg', factor: 1000 },
  { key: 'iron', id: 'iron', name: 'Iron', unit: 'mg', factor: 1000 },
  { key: 'potassium', id: 'potassium', name: 'Potassium', unit: 'mg', factor: 1000 },
  { key: 'magnesium', id: 'magnesium', name: 'Magnesium', unit: 'mg', factor: 1000 },
  { key: 'zinc', id: 'zinc', name: 'Zinc', unit: 'mg', factor: 1000 },
  { key: 'phosphorus', id: 'phosphorus', name: 'Phosphorus', unit: 'mg', factor: 1000 },
  { key: 'selenium', id: 'selenium', name: 'Selenium', unit: 'mcg', factor: 1_000_000 },
  { key: 'vitamin-a', id: 'vitamin_a', name: 'Vitamin A', unit: 'mcg', factor: 1_000_000 },
  { key: 'vitamin-c', id: 'vitamin_c', name: 'Vitamin C', unit: 'mg', factor: 1000 },
  { key: 'vitamin-d', id: 'vitamin_d', name: 'Vitamin D', unit: 'mcg', factor: 1_000_000 },
  { key: 'vitamin-e', id: 'vitamin_e', name: 'Vitamin E', unit: 'mg', factor: 1000 },
  { key: 'vitamin-k', id: 'vitamin_k', name: 'Vitamin K', unit: 'mcg', factor: 1_000_000 },
  { key: 'vitamin-b1', id: 'vitamin_b1', name: 'Thiamin (B1)', unit: 'mg', factor: 1000 },
  { key: 'vitamin-b2', id: 'vitamin_b2', name: 'Riboflavin (B2)', unit: 'mg', factor: 1000 },
  { key: 'vitamin-pp', id: 'vitamin_b3', name: 'Niacin (B3)', unit: 'mg', factor: 1000 },
  { key: 'vitamin-b6', id: 'vitamin_b6', name: 'Vitamin B6', unit: 'mg', factor: 1000 },
  { key: 'vitamin-b9', id: 'vitamin_b9', name: 'Folate (B9)', unit: 'mcg', factor: 1_000_000 },
  { key: 'vitamin-b12', id: 'vitamin_b12', name: 'Vitamin B12', unit: 'mcg', factor: 1_000_000 },
];

/**
 * Map Open Food Facts product to normalized Product
 */
export function mapOFFProduct(off: OFFProduct): Product {
  const servingGrams = toNumber(off.serving_quantity);

  return {
    barcode: off.code,
    name: off.product_name?.trim() || 'Unknown Product',
    brand: parseBrands(off.brands),
    genericName: off.generic_name || undefined,
    categories: parseTagList(off.categories_tags),
    categoryTags: off.categories_tags?.filter((t) => /^en:[a-z0-9-]+$/.test(t)),
    labels: parseTagList(off.labels_tags),
    quantity: off.quantity || formatQuantity(off),
    servingSize: off.serving_size || servingGrams
      ? {
          amount: servingGrams ?? (parseFloat(off.serving_size ?? '') || 0),
          unit: 'g',
          grams: servingGrams,
          description: off.serving_size,
        }
      : undefined,
    nutrients: mapNutrients(off.nutriments, servingGrams),
    nutriScore: mapNutriScore(off),
    greenScore: mapGreenScore(off),
    novaGroup: mapNova(off.nova_group),
    ingredientsText: off.ingredients_text || undefined,
    ingredientsAnalysis: mapIngredientsAnalysis(off.ingredients_analysis_tags),
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
      thumbnail: off.image_front_small_url ?? off.image_url,
    },
    url: `https://world.openfoodfacts.org/product/${off.code}`,
    sources: ['openfoodfacts'],
    lastUpdated: off.last_modified_t ? new Date(off.last_modified_t * 1000) : undefined,
    dataQuality: {
      score: Math.round((off.completeness || 0) * 100),
      completeness: Math.round((off.completeness || 0) * 100),
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
    name: off.product_name?.trim() || 'Unknown Product',
    brand: parseBrands(off.brands),
    categories: parseTagList(off.categories_tags).slice(0, 3),
    nutriScoreGrade: parseNutriScoreGrade(off.nutriscore_grade),
    novaGroup: mapNova(off.nova_group),
    quantity: off.quantity || undefined,
    thumbnail: off.image_front_small_url ?? off.image_url,
    sources: ['openfoodfacts'],
  };
}

/**
 * OFF returns brands as a comma-separated string (or an array from search-a-licious)
 */
function parseBrands(brands: string | string[] | undefined): string | undefined {
  if (!brands) return undefined;
  const list = Array.isArray(brands) ? brands : brands.split(',');
  const cleaned = [...new Set(list.map((b) => b.trim()).filter(Boolean))];
  return cleaned.length > 0 ? cleaned.join(', ') : undefined;
}

function formatQuantity(off: OFFProduct): string | undefined {
  const value = toNumber(off.product_quantity);
  if (!value) return undefined;
  return `${value} ${off.product_quantity_unit ?? 'g'}`;
}

/**
 * Parse tag list from Open Food Facts format
 */
function parseTagList(tags?: string[]): string[] {
  if (!tags) return [];
  return tags.map(tagToLabel).filter(Boolean);
}

function toNumber(value: number | string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function mapNova(value: number | undefined): NovaGroup | undefined {
  return value === 1 || value === 2 || value === 3 || value === 4 ? value : undefined;
}

/**
 * Map nutriments to normalized Nutrient array (values per 100 g / 100 ml)
 */
function mapNutrients(
  nutriments: Record<string, number | string> | undefined,
  servingGrams: number | undefined,
): Nutrient[] {
  if (!nutriments) return [];

  const nutrients: Nutrient[] = [];

  for (const meta of NUTRIENT_MAP) {
    const raw = nutriments[`${meta.key}_100g`];
    const grams = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN;
    if (!Number.isFinite(grams)) continue;

    const value = round(grams * meta.factor);
    nutrients.push({
      id: meta.id,
      name: meta.name,
      value,
      unit: meta.unit,
      per100g: value,
      perServing: servingGrams ? round((value * servingGrams) / 100) : undefined,
      dailyValuePercent: dailyValuePercent(meta.id, value, meta.unit),
      source: 'openfoodfacts',
    });
  }

  return nutrients;
}

function parseNutriScoreGrade(grade: string | undefined): NutriScoreGrade | undefined {
  const upper = grade?.toUpperCase();
  return upper === 'A' || upper === 'B' || upper === 'C' || upper === 'D' || upper === 'E'
    ? upper
    : undefined;
}

/**
 * Map Nutri-Score data (2023 algorithm when available)
 */
function mapNutriScore(off: OFFProduct): NutriScore | undefined {
  const grade = parseNutriScoreGrade(off.nutriscore_grade);
  if (!grade) return undefined;

  const version = off.nutriscore_version === '2021' ? '2021' : off.nutriscore_version === '2023' ? '2023' : undefined;
  const details = version ? off.nutriscore?.[version] : undefined;
  const components = details?.data?.components;

  return {
    grade,
    score: typeof off.nutriscore_score === 'number' ? off.nutriscore_score : details?.score,
    version,
    positive: (components?.positive ?? []).map(mapNutriScoreComponent),
    negative: (components?.negative ?? []).map(mapNutriScoreComponent),
  };
}

function mapNutriScoreComponent(c: OFFNutriScoreComponent): NutriScoreComponent {
  return {
    id: c.id,
    value: c.value,
    unit: c.unit,
    points: c.points,
    pointsMax: c.points_max,
  };
}

/**
 * Map Green-Score (formerly Eco-Score). OFF grades are a-plus, a..f.
 */
function mapGreenScore(off: OFFProduct): GreenScore | undefined {
  const rawGrade = (off.environmental_score_grade ?? off.ecoscore_grade)?.toLowerCase();
  const grades: Record<string, GreenScoreGrade> = {
    'a-plus': 'A+', a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', f: 'F',
  };
  const grade = rawGrade ? grades[rawGrade] : undefined;
  if (!grade) return undefined;

  const score = off.environmental_score_score ?? off.ecoscore_score;
  return { grade, score: typeof score === 'number' ? score : undefined };
}

/**
 * Map OFF ingredients analysis tags (en:vegan, en:non-vegan, en:maybe-vegan, ...)
 */
export function mapIngredientsAnalysis(tags: string[] | undefined): IngredientsAnalysis | undefined {
  if (!tags || tags.length === 0) return undefined;

  const status = (positive: string, negative: string, maybe: string, unknown: string): AnalysisStatus => {
    if (tags.includes(positive)) return 'yes';
    if (tags.includes(negative)) return 'no';
    if (tags.includes(maybe)) return 'maybe';
    if (tags.includes(unknown)) return 'unknown';
    return 'unknown';
  };

  return {
    vegan: status('en:vegan', 'en:non-vegan', 'en:maybe-vegan', 'en:vegan-status-unknown'),
    vegetarian: status('en:vegetarian', 'en:non-vegetarian', 'en:maybe-vegetarian', 'en:vegetarian-status-unknown'),
    palmOilFree: status('en:palm-oil-free', 'en:palm-oil', 'en:may-contain-palm-oil', 'en:palm-oil-content-unknown'),
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

  const seen = new Set<string>();
  const result: Allergen[] = [];

  for (const tag of tags) {
    const standardId = ALLERGEN_MAP[tag as keyof typeof ALLERGEN_MAP];
    if (!standardId || seen.has(standardId)) continue;
    seen.add(standardId);
    result.push({
      id: standardId as AllergenId,
      name: standardId.replace(/_/g, ' '),
      certainty,
    });
  }

  return result;
}

/**
 * Map additives from OFF tags
 */
function mapAdditives(tags: string[] | undefined): Additive[] {
  if (!tags) return [];

  return tags.map((tag) => {
    // Format: en:e322i
    const code = tag.replace(/^[a-z]{2}:/, '').toUpperCase();
    return {
      code,
      name: code,
      riskLevel: 'unknown' as const,
    };
  });
}
