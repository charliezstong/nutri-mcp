/**
 * Raw Open Food Facts product (subset of fields requested from API v3.4)
 */
export interface OFFProduct {
  code: string;
  product_name?: string;
  brands?: string | string[];
  generic_name?: string;
  categories_tags?: string[];
  labels_tags?: string[];
  quantity?: string;
  product_quantity?: number | string;
  product_quantity_unit?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string>;
  nutriscore_grade?: string;
  nutriscore_score?: number;
  nutriscore_version?: string;
  nutriscore?: Record<string, OFFNutriScoreVersion>;
  environmental_score_grade?: string;
  environmental_score_score?: number;
  /** Pre-v3.1 name of environmental_score_* (Eco-Score) */
  ecoscore_grade?: string;
  ecoscore_score?: number;
  nova_group?: number;
  ingredients_text?: string;
  ingredients_analysis_tags?: string[];
  allergens_tags?: string[];
  traces_tags?: string[];
  additives_tags?: string[];
  countries_tags?: string[];
  packaging?: string;
  origins?: string;
  image_url?: string;
  image_front_url?: string;
  image_front_small_url?: string;
  image_nutrition_url?: string;
  image_ingredients_url?: string;
  last_modified_t?: number;
  completeness?: number;
}

export interface OFFNutriScoreVersion {
  grade?: string;
  score?: number;
  nutriscore_computed?: number;
  data?: {
    components?: {
      positive?: OFFNutriScoreComponent[];
      negative?: OFFNutriScoreComponent[];
    };
  };
}

export interface OFFNutriScoreComponent {
  id: string;
  points: number;
  points_max?: number;
  unit?: string;
  value: number | null;
}

/** API v3 product response */
export interface OFFProductResponse {
  code?: string;
  status: 'success' | 'success_with_warnings' | 'success_with_errors' | 'failure';
  product?: OFFProduct;
}

/** search-a-licious response */
export interface OFFSearchResponse {
  hits: OFFProduct[];
  count: number;
  page: number;
  page_size: number;
  page_count: number;
}

/** Legacy cgi/search.pl response */
export interface OFFLegacySearchResponse {
  count: number;
  page: number;
  page_size: number;
  products: OFFProduct[];
}

/**
 * Fields requested from the product API (keeps payloads small).
 */
export const OFF_PRODUCT_FIELDS = [
  'code', 'product_name', 'brands', 'generic_name', 'categories_tags', 'labels_tags',
  'quantity', 'product_quantity', 'product_quantity_unit', 'serving_size', 'serving_quantity',
  'nutriments', 'nutriscore', 'nutriscore_grade', 'nutriscore_score', 'nutriscore_version',
  'environmental_score_grade', 'environmental_score_score', 'nova_group',
  'ingredients_text', 'ingredients_analysis_tags', 'allergens_tags', 'traces_tags', 'additives_tags',
  'countries_tags', 'packaging', 'origins', 'image_url', 'image_front_url', 'image_front_small_url',
  'image_nutrition_url', 'image_ingredients_url', 'last_modified_t', 'completeness',
].join(',');

export const OFF_SEARCH_FIELDS = [
  'code', 'product_name', 'brands', 'categories_tags', 'nutriscore_grade', 'nova_group',
  'quantity', 'image_front_small_url',
].join(',');
