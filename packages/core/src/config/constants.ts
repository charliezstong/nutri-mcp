/**
 * Open Food Facts product API version. v3.4 keeps the flat `nutriments` object
 * while exposing the renamed `environmental_score_*` (Green-Score) fields.
 * v3.5+ moves nutrition data to `nutrition.aggregated_set`.
 */
export const OFF_API_VERSION = 'v3.4';

/**
 * API Base URLs
 */
export const API_URLS = {
  openfoodfacts: {
    search: 'https://search.openfoodfacts.org/search',
    legacySearchPath: '/cgi/search.pl',
    robotoff: 'https://robotoff.openfoodfacts.org/api/v1',
    prices: 'https://prices.openfoodfacts.org/api/v1',
  },
  usda: {
    base: 'https://api.nal.usda.gov/fdc/v1',
  },
  nutritionix: {
    base: 'https://trackapi.nutritionix.com/v2',
  },
  openfda: {
    foodEnforcement: 'https://api.fda.gov/food/enforcement.json',
  },
} as const;

/**
 * Rate limits per API (requests per window).
 * Open Food Facts: 15 product reads/min and 10 searches/min per IP
 * (https://openfoodfacts.github.io/openfoodfacts-server/api/).
 */
export const RATE_LIMITS = {
  openfoodfacts: {
    search: { max: 10, windowMs: 60_000 },
    product: { max: 15, windowMs: 60_000 },
  },
  robotoff: {
    all: { max: 60, windowMs: 60_000 },
  },
  openprices: {
    all: { max: 60, windowMs: 60_000 },
  },
  usda: {
    all: { max: 1000, windowMs: 3_600_000 },    // 1000/hour per key
  },
  nutritionix: {
    all: { max: 200, windowMs: 86_400_000 },
  },
  openfda: {
    all: { max: 240, windowMs: 60_000 },        // 240/min without key
  },
} as const;

/**
 * Maximum time a request waits for a rate-limit token before failing.
 */
export const RATE_LIMIT_MAX_WAIT_MS = 8_000;

/**
 * Cache TTL values (milliseconds)
 */
export const CACHE_TTL = {
  product: 30 * 60_000,           // 30 minutes
  search: 5 * 60_000,             // 5 minutes
  price: 60 * 60_000,             // 1 hour
  taxonomy: 24 * 60 * 60_000,     // 24 hours
  robotoff: 30 * 60_000,          // 30 minutes
  recall: 6 * 60 * 60_000,        // 6 hours (openFDA updates weekly)
  notFound: 5 * 60_000,           // negative cache for unknown barcodes
} as const;

/**
 * Circuit Breaker Configuration
 */
export const CIRCUIT_BREAKER = {
  openfoodfacts: { failureThreshold: 5, successThreshold: 2, timeoutMs: 30_000 },
  robotoff: { failureThreshold: 5, successThreshold: 2, timeoutMs: 60_000 },
  openprices: { failureThreshold: 5, successThreshold: 2, timeoutMs: 60_000 },
  usda: { failureThreshold: 3, successThreshold: 2, timeoutMs: 60_000 },
  nutritionix: { failureThreshold: 3, successThreshold: 2, timeoutMs: 60_000 },
  openfda: { failureThreshold: 3, successThreshold: 2, timeoutMs: 60_000 },
} as const;

/**
 * Retry Configuration
 */
export const RETRY_CONFIG = {
  maxRetries: 2,
  initialDelayMs: 500,
  maxDelayMs: 8_000,
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
} as const;

/**
 * Request Timeouts
 */
export const TIMEOUTS = {
  default: 10_000,      // 10 seconds
  search: 15_000,       // 15 seconds
  robotoff: 20_000,     // 20 seconds (AI operations)
} as const;

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  maxSize: 1000,
  staleWhileRevalidate: true,
} as const;

/**
 * Daily Values for adults and children >= 4 years
 * (FDA, 21 CFR 101.9, as updated in 2016).
 */
export const DAILY_VALUES = {
  // Macronutrients
  calories: 2000,           // kcal
  totalFat: 78,             // g
  saturatedFat: 20,         // g
  cholesterol: 300,         // mg
  sodium: 2300,             // mg
  totalCarbohydrate: 275,   // g
  dietaryFiber: 28,         // g
  addedSugars: 50,          // g
  protein: 50,              // g

  // Vitamins
  vitaminA: 900,            // mcg RAE
  vitaminC: 90,             // mg
  vitaminD: 20,             // mcg
  vitaminE: 15,             // mg
  vitaminK: 120,            // mcg
  thiamin: 1.2,             // mg
  riboflavin: 1.3,          // mg
  niacin: 16,               // mg NE
  pantothenicAcid: 5,       // mg
  vitaminB6: 1.7,           // mg
  folate: 400,              // mcg DFE
  vitaminB12: 2.4,          // mcg

  // Minerals
  calcium: 1300,            // mg
  iron: 18,                 // mg
  potassium: 4700,          // mg
  magnesium: 420,           // mg
  zinc: 11,                 // mg
  phosphorus: 1250,         // mg
  selenium: 55,             // mcg
  copper: 0.9,              // mg
  manganese: 2.3,           // mg
  iodine: 150,              // mcg
  chromium: 35,             // mcg
  molybdenum: 45,           // mcg
} as const;

export type DailyValueKey = keyof typeof DAILY_VALUES;

/**
 * UK FSA "traffic light" thresholds for foods, per 100 g
 * (Guide to creating a front of pack nutrition label, 2016).
 */
export const TRAFFIC_LIGHTS = {
  fat: { low: 3, high: 17.5 },
  saturated_fat: { low: 1.5, high: 5 },
  sugars: { low: 5, high: 22.5 },
  salt: { low: 0.3, high: 1.5 },
} as const;

/**
 * EU nutrition claim thresholds (Regulation (EC) No 1924/2006), per 100 g.
 */
export const EU_CLAIMS = {
  lowSugar: 5,              // g sugars
  lowSodium: 0.12,          // g sodium (120 mg)
  lowFat: 3,                // g fat
} as const;

/**
 * Allergen Mappings (Open Food Facts allergen taxonomy -> standard ids)
 */
export const ALLERGEN_MAP = {
  'en:gluten': 'gluten',
  'en:wheat': 'wheat',
  'en:milk': 'dairy',
  'en:eggs': 'eggs',
  'en:nuts': 'tree_nuts',
  'en:peanuts': 'peanuts',
  'en:soybeans': 'soy',
  'en:celery': 'celery',
  'en:mustard': 'mustard',
  'en:sesame-seeds': 'sesame',
  'en:sulphur-dioxide-and-sulphites': 'sulfites',
  'en:lupin': 'lupin',
  'en:molluscs': 'mollusks',
  'en:crustaceans': 'shellfish',
  'en:fish': 'fish',
} as const;

/**
 * Allergens that imply another one. OFF tags wheat-based products with
 * `en:gluten`, so a gluten tag is treated as a possible wheat source.
 */
export const IMPLIED_ALLERGENS: Partial<Record<string, string[]>> = {
  wheat: ['gluten'],
};

/**
 * Big 9 Allergens (USA FDA)
 */
export const BIG_9_ALLERGENS = [
  'dairy', 'eggs', 'fish', 'shellfish',
  'tree_nuts', 'peanuts', 'wheat', 'soy', 'sesame',
] as const;

/**
 * EU 14 Allergens
 */
export const EU_14_ALLERGENS = [
  'gluten', 'shellfish', 'eggs', 'fish', 'peanuts',
  'soy', 'dairy', 'tree_nuts', 'celery', 'mustard',
  'sesame', 'sulfites', 'lupin', 'mollusks',
] as const;
