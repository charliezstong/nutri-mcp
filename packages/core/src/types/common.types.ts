/**
 * Data source identifiers
 */
export type DataSource = 'openfoodfacts' | 'usda' | 'nutritionix' | 'calculated';

/**
 * Nutrient units
 */
export type NutrientUnit = 'g' | 'mg' | 'mcg' | 'kcal' | 'kJ' | 'IU' | '%';

/**
 * Nutri-Score grades
 */
export type NutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * Eco-Score grades
 */
export type EcoScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * NOVA groups (food processing level)
 */
export type NovaGroup = 1 | 2 | 3 | 4;

/**
 * Standard allergen identifiers
 */
export type AllergenId =
  | 'gluten'
  | 'dairy'
  | 'eggs'
  | 'fish'
  | 'shellfish'
  | 'tree_nuts'
  | 'peanuts'
  | 'soy'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulfites'
  | 'lupin'
  | 'mollusks'
  | 'wheat';

/**
 * Diet types for compliance checking
 */
export type DietType =
  | 'vegan'
  | 'vegetarian'
  | 'pescatarian'
  | 'keto'
  | 'paleo'
  | 'gluten_free'
  | 'dairy_free'
  | 'low_sodium'
  | 'low_sugar'
  | 'halal'
  | 'kosher';

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Pagination result metadata
 */
export interface PaginationResult {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationResult;
  sources: DataSource[];
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Data quality indicator
 */
export interface DataQuality {
  score: number;           // 0-100
  completeness: number;    // 0-100
  lastVerified?: Date;
  warnings: string[];
}
