/**
 * API Base URLs
 */
export const API_URLS = {
  openfoodfacts: {
    product: 'https://world.openfoodfacts.org/api/v2',
    search: 'https://search.openfoodfacts.org',
    legacySearch: 'https://world.openfoodfacts.org/cgi/search.pl',
    robotoff: 'https://robotoff.openfoodfacts.org/api/v1',
    prices: 'https://prices.openfoodfacts.org/api/v1',
    folksonomy: 'https://api.openfoodfacts.org/api/v3/folksonomy',
    taxonomy: 'https://static.openfoodfacts.org/data/taxonomies',
  },
  usda: {
    base: 'https://api.nal.usda.gov/fdc/v1',
  },
  nutritionix: {
    base: 'https://trackapi.nutritionix.com/v2',
  },
} as const;

/**
 * Rate Limits per API (requests per window)
 */
export const RATE_LIMITS = {
  openfoodfacts: {
    search: { max: 10, windowMs: 60_000 },      // 10/min
    product: { max: 100, windowMs: 60_000 },    // 100/min
    robotoff: { max: 60, windowMs: 60_000 },    // 60/min
    prices: { max: 60, windowMs: 60_000 },      // 60/min
    facets: { max: 2, windowMs: 60_000 },       // 2/min
  },
  usda: {
    all: { max: 1000, windowMs: 3_600_000 },    // 1000/hour
  },
  nutritionix: {
    all: { max: 50, windowMs: 86_400_000 },     // 50/day (free tier)
  },
} as const;

/**
 * Cache TTL values (milliseconds)
 */
export const CACHE_TTL = {
  product: 15 * 60_000,           // 15 minutes
  search: 5 * 60_000,             // 5 minutes
  price: 60 * 60_000,             // 1 hour
  taxonomy: 24 * 60 * 60_000,     // 24 hours
  robotoff: 30 * 60_000,          // 30 minutes
} as const;

/**
 * Circuit Breaker Configuration
 */
export const CIRCUIT_BREAKER = {
  openfoodfacts: {
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 30_000,
  },
  usda: {
    failureThreshold: 3,
    successThreshold: 2,
    timeoutMs: 60_000,
  },
  nutritionix: {
    failureThreshold: 3,
    successThreshold: 2,
    timeoutMs: 60_000,
  },
} as const;

/**
 * Retry Configuration
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30_000,
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
 * Daily Values (USDA Reference)
 */
export const DAILY_VALUES = {
  // Macronutrients
  calories: 2000,           // kcal
  totalFat: 78,             // g
  saturatedFat: 20,         // g
  transFat: 0,              // g (as low as possible)
  cholesterol: 300,         // mg
  sodium: 2300,             // mg
  totalCarbohydrate: 275,   // g
  dietaryFiber: 28,         // g
  totalSugars: 50,          // g (added sugars)
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
  chromium: 35,             // mcg
  molybdenum: 45,           // mcg
} as const;

/**
 * Allergen Mappings
 */
export const ALLERGEN_MAP = {
  // Open Food Facts tags -> Standard names
  'en:gluten': 'gluten',
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
