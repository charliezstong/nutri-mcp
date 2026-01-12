/**
 * Nutritionix API Types
 */

export interface NutritionixSearchResponse {
  common: NutritionixCommonFood[];
  branded: NutritionixBrandedFood[];
}

export interface NutritionixCommonFood {
  food_name: string;
  serving_unit: string;
  tag_name: string;
  serving_qty: number;
  common_type: number | null;
  tag_id: string;
  photo: {
    thumb: string;
  };
  locale: string;
}

export interface NutritionixBrandedFood {
  food_name: string;
  serving_unit: string;
  nix_brand_id: string;
  brand_name_item_name: string;
  serving_qty: number;
  nf_calories: number;
  photo: {
    thumb: string;
  };
  brand_name: string;
  region: number;
  brand_type: number;
  nix_item_id: string;
  locale: string;
}

export interface NutritionixNutrientsResponse {
  foods: NutritionixFullFood[];
}

export interface NutritionixFullFood {
  food_name: string;
  brand_name?: string;
  serving_qty: number;
  serving_unit: string;
  serving_weight_grams: number;
  nf_calories: number;
  nf_total_fat: number;
  nf_saturated_fat: number;
  nf_cholesterol: number;
  nf_sodium: number;
  nf_total_carbohydrate: number;
  nf_dietary_fiber: number;
  nf_sugars: number;
  nf_protein: number;
  nf_potassium?: number;
  nf_p?: number;
  full_nutrients: NutritionixNutrient[];
  nix_brand_name?: string;
  nix_brand_id?: string;
  nix_item_name?: string;
  nix_item_id?: string;
  upc?: string;
  consumed_at?: string;
  metadata?: Record<string, unknown>;
  source?: number;
  ndb_no?: number;
  tags?: {
    item: string;
    measure?: string;
    quantity: string;
    food_group: number;
    tag_id: number;
  };
  alt_measures?: NutritionixAltMeasure[];
  lat?: number;
  lng?: number;
  meal_type?: number;
  photo?: {
    thumb: string;
    highres?: string;
    is_user_uploaded?: boolean;
  };
  sub_recipe?: unknown;
}

export interface NutritionixNutrient {
  attr_id: number;
  value: number;
}

export interface NutritionixAltMeasure {
  serving_weight: number;
  measure: string;
  seq?: number;
  qty: number;
}

export interface NutritionixItemResponse {
  foods: NutritionixFullFood[];
}

/**
 * Nutritionix nutrient attr_id mappings
 */
export const NUTRITIONIX_NUTRIENT_MAP: Record<number, string> = {
  208: 'energy_kcal',       // Energy (kcal)
  203: 'protein',           // Protein
  204: 'fat',               // Total lipid (fat)
  205: 'carbohydrates',     // Carbohydrate
  291: 'fiber',             // Fiber
  269: 'sugars',            // Sugars
  606: 'saturated_fat',     // Saturated fat
  605: 'trans_fat',         // Trans fat
  601: 'cholesterol',       // Cholesterol
  307: 'sodium',            // Sodium
  301: 'calcium',           // Calcium
  303: 'iron',              // Iron
  306: 'potassium',         // Potassium
  304: 'magnesium',         // Magnesium
  309: 'zinc',              // Zinc
  320: 'vitamin_a',         // Vitamin A
  401: 'vitamin_c',         // Vitamin C
  328: 'vitamin_d',         // Vitamin D
  323: 'vitamin_e',         // Vitamin E
  430: 'vitamin_k',         // Vitamin K
  404: 'vitamin_b1',        // Thiamin
  405: 'vitamin_b2',        // Riboflavin
  406: 'vitamin_b3',        // Niacin
  410: 'vitamin_b5',        // Pantothenic acid
  415: 'vitamin_b6',        // Vitamin B6
  417: 'vitamin_b9',        // Folate
  418: 'vitamin_b12',       // Vitamin B12
};
