/**
 * USDA FoodData Central API Types
 */

export interface USDASearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDAFoodItem[];
}

export interface USDAFoodItem {
  fdcId: number;
  description: string;
  dataType: USDADataType;
  gtinUpc?: string;
  publishedDate?: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  marketCountry?: string;
  foodCategory?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients: USDANutrient[];
  labelNutrients?: USDALabelNutrients;
}

export type USDADataType =
  | 'Branded'
  | 'Foundation'
  | 'SR Legacy'
  | 'Survey (FNDDS)'
  | 'Experimental';

export interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
  derivationCode?: string;
  derivationDescription?: string;
}

export interface USDALabelNutrients {
  fat?: { value: number };
  saturatedFat?: { value: number };
  transFat?: { value: number };
  cholesterol?: { value: number };
  sodium?: { value: number };
  carbohydrates?: { value: number };
  fiber?: { value: number };
  sugars?: { value: number };
  protein?: { value: number };
  calcium?: { value: number };
  iron?: { value: number };
  potassium?: { value: number };
  calories?: { value: number };
}

export interface USDASearchParams {
  query: string;
  dataType?: USDADataType[];
  pageSize?: number;
  pageNumber?: number;
  sortBy?: 'dataType.keyword' | 'lowercaseDescription.keyword' | 'fdcId' | 'publishedDate';
  sortOrder?: 'asc' | 'desc';
  brandOwner?: string;
}

export interface USDAFoodDetailsResponse {
  fdcId: number;
  description: string;
  dataType: USDADataType;
  publicationDate?: string;
  foodNutrients: USDANutrient[];
  foodComponents?: unknown[];
  foodAttributes?: unknown[];
  foodPortions?: USDAFoodPortion[];
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
}

export interface USDAFoodPortion {
  id: number;
  amount: number;
  measureUnit: {
    id: number;
    abbreviation: string;
    name: string;
  };
  gramWeight: number;
  sequenceNumber: number;
  modifier?: string;
  portionDescription?: string;
}

/**
 * USDA Nutrient ID mappings to standard IDs
 */
export const USDA_NUTRIENT_MAP: Record<number, string> = {
  1008: 'energy_kcal',      // Energy (kcal)
  1003: 'protein',          // Protein
  1004: 'fat',              // Total lipid (fat)
  1005: 'carbohydrates',    // Carbohydrate, by difference
  1079: 'fiber',            // Fiber, total dietary
  2000: 'sugars',           // Sugars, total
  1258: 'saturated_fat',    // Fatty acids, total saturated
  1257: 'trans_fat',        // Fatty acids, total trans
  1253: 'cholesterol',      // Cholesterol
  1093: 'sodium',           // Sodium, Na
  1087: 'calcium',          // Calcium, Ca
  1089: 'iron',             // Iron, Fe
  1092: 'potassium',        // Potassium, K
  1090: 'magnesium',        // Magnesium, Mg
  1095: 'zinc',             // Zinc, Zn
  1106: 'vitamin_a',        // Vitamin A, RAE
  1162: 'vitamin_c',        // Vitamin C
  1114: 'vitamin_d',        // Vitamin D (D2 + D3)
  1109: 'vitamin_e',        // Vitamin E
  1185: 'vitamin_k',        // Vitamin K
  1165: 'vitamin_b1',       // Thiamin
  1166: 'vitamin_b2',       // Riboflavin
  1167: 'vitamin_b3',       // Niacin
  1170: 'vitamin_b5',       // Pantothenic acid
  1175: 'vitamin_b6',       // Vitamin B-6
  1177: 'vitamin_b9',       // Folate, total
  1178: 'vitamin_b12',      // Vitamin B-12
};
