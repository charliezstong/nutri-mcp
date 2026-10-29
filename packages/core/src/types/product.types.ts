import type {
  DataSource,
  DataQuality,
  AllergenId,
  NovaGroup,
} from './common.types.js';
import type {
  Nutrient,
  ServingSize,
  NutriScore,
  GreenScore,
} from './nutrition.types.js';

/**
 * Ingredient information
 */
export interface Ingredient {
  id: string;
  name: string;
  percent?: number;
  vegan?: boolean;
  vegetarian?: boolean;
  subIngredients?: Ingredient[];
}

/**
 * Allergen information
 */
export interface Allergen {
  id: AllergenId;
  name: string;
  certainty: 'confirmed' | 'may_contain' | 'traces';
}

/**
 * Ingredient analysis computed by Open Food Facts from the ingredient list
 * (`ingredients_analysis_tags`).
 */
export type AnalysisStatus = 'yes' | 'no' | 'maybe' | 'unknown';

export interface IngredientsAnalysis {
  vegan: AnalysisStatus;
  vegetarian: AnalysisStatus;
  palmOilFree: AnalysisStatus;
}

/**
 * Additive information
 */
export interface Additive {
  code: string;              // E-number (e.g., "E621")
  name: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'unknown';
  description?: string;
}

/**
 * Product image URLs
 */
export interface ProductImages {
  front?: string;
  nutrition?: string;
  ingredients?: string;
  packaging?: string;
  thumbnail?: string;
}

/**
 * Normalized product from any source
 */
export interface Product {
  // Identifiers
  barcode: string;
  fdcId?: string;               // USDA FoodData Central ID
  nixItemId?: string;           // Nutritionix ID

  // Basic information
  name: string;
  brand?: string;
  genericName?: string;
  categories: string[];
  /** Raw Open Food Facts category tags, most specific last (e.g. "en:hazelnut-spreads") */
  categoryTags?: string[];
  labels: string[];

  // Quantity
  quantity?: string;
  servingSize?: ServingSize;

  // Nutrition
  nutrients: Nutrient[];

  // Scores
  nutriScore?: NutriScore;
  greenScore?: GreenScore;
  novaGroup?: NovaGroup;

  // Ingredients and allergens
  ingredientsText?: string;
  ingredients?: Ingredient[];
  ingredientsAnalysis?: IngredientsAnalysis;
  allergens: Allergen[];
  traces: Allergen[];
  additives: Additive[];

  // Origin & packaging
  countries: string[];
  packaging?: string[];
  origins?: string[];

  // Images
  images?: ProductImages;

  // Metadata
  url?: string;
  sources: DataSource[];
  lastUpdated?: Date;
  dataQuality: DataQuality;
}

/**
 * Simplified product for search results
 */
export interface ProductSummary {
  barcode: string;
  name: string;
  brand?: string;
  categories: string[];
  nutriScoreGrade?: 'A' | 'B' | 'C' | 'D' | 'E';
  novaGroup?: NovaGroup;
  quantity?: string;
  thumbnail?: string;
  sources: DataSource[];
}

/**
 * Product search filters
 */
export interface ProductSearchFilters {
  query?: string;
  brand?: string;
  category?: string;
  nutriScoreMin?: 'A' | 'B' | 'C' | 'D' | 'E';
  nutriScoreMax?: 'A' | 'B' | 'C' | 'D' | 'E';
  novaMax?: NovaGroup;
  allergenFree?: AllergenId[];
  vegan?: boolean;
  vegetarian?: boolean;
  organic?: boolean;
}

/**
 * Product comparison result
 */
export interface ProductComparison {
  products: Product[];
  comparison: {
    winner?: {
      barcode: string;
      reason: string;
    };
    nutritionComparison: NutrientComparison[];
    scoreComparison: ScoreComparison;
    summary: string;
  };
}

export interface NutrientComparison {
  nutrientId: string;
  name: string;
  values: { barcode: string; value: number | null; unit: string }[];
  better?: string;           // barcode of better product
}

export interface ScoreComparison {
  nutriScore: { barcode: string; grade: string }[];
  greenScore: { barcode: string; grade: string }[];
  novaGroup: { barcode: string; group: number }[];
}
