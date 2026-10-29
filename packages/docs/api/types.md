# Types Reference

TypeScript types from `packages/core/src/types/`. Tool outputs are these types serialized to JSON (dates become ISO strings, `undefined` fields are dropped) and validated against each tool's `outputSchema`; the exact output of every tool is in the [Tools Reference](/tools/overview).

## Common types

`common.types.ts`

```typescript
type DataSource = 'openfoodfacts' | 'usda' | 'nutritionix' | 'openprices' | 'openfda' | 'calculated';

type NutrientUnit = 'g' | 'mg' | 'mcg' | 'kcal' | 'kJ' | 'IU' | '%' | '% vol';

type NutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';

/** Green-Score (formerly Eco-Score): the 2025 scale adds A+ and F */
type GreenScoreGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/** 1 = unprocessed or minimally processed ... 4 = ultra-processed */
type NovaGroup = 1 | 2 | 3 | 4;

type AllergenId =
  | 'gluten' | 'wheat' | 'dairy' | 'eggs' | 'fish' | 'shellfish' | 'mollusks'
  | 'tree_nuts' | 'peanuts' | 'soy' | 'celery' | 'mustard' | 'sesame' | 'sulfites' | 'lupin';

type DietType =
  | 'vegan' | 'vegetarian' | 'pescatarian' | 'keto' | 'paleo'
  | 'gluten_free' | 'dairy_free' | 'low_sodium' | 'low_sugar' | 'halal' | 'kosher';

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface PaginationResult {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationResult;
  sources: DataSource[];
}

interface DataQuality {
  score: number;           // 0-100
  completeness: number;    // 0-100
  lastVerified?: Date;
  warnings: string[];
}
```

`shellfish` means crustaceans; `mollusks` is separate, as in the EU 14 list.

## Product

`product.types.ts`. The normalized record returned by `getProductByBarcode` and the `nutri://product/{barcode}` resource, merged from every source that knows the barcode.

```typescript
interface Product {
  // Identifiers
  barcode: string;
  fdcId?: string;               // USDA FoodData Central id
  nixItemId?: string;           // Nutritionix id

  // Basic information
  name: string;
  brand?: string;
  genericName?: string;
  categories: string[];
  categoryTags?: string[];      // raw OFF tags, most specific last (e.g. "en:hazelnut-spreads")
  labels: string[];

  // Quantity
  quantity?: string;            // package quantity, e.g. "400 g"
  servingSize?: ServingSize;

  // Nutrition (per 100 g / 100 ml)
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

  // Origin and packaging
  countries: string[];
  packaging?: string[];
  origins?: string[];

  images?: ProductImages;

  // Metadata
  url?: string;
  sources: DataSource[];
  lastUpdated?: Date;
  dataQuality: DataQuality;
}

interface ServingSize {
  amount: number;
  unit: string;
  grams?: number;
  description?: string;         // label text, e.g. "15 g"
}

interface Allergen {
  id: AllergenId;
  name: string;
  certainty: 'confirmed' | 'may_contain' | 'traces';
}

type AnalysisStatus = 'yes' | 'no' | 'maybe' | 'unknown';

/** Computed by Open Food Facts from the ingredient list */
interface IngredientsAnalysis {
  vegan: AnalysisStatus;
  vegetarian: AnalysisStatus;
  palmOilFree: AnalysisStatus;
}

interface Additive {
  code: string;                 // E-number, e.g. "E322"
  name: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'unknown';   // EFSA over-exposure risk
  description?: string;
}

interface Ingredient {
  id: string;
  name: string;
  percent?: number;
  vegan?: boolean;
  vegetarian?: boolean;
  subIngredients?: Ingredient[];
}

interface ProductImages {
  front?: string;
  nutrition?: string;
  ingredients?: string;
  packaging?: string;
  thumbnail?: string;
}
```

### ProductSummary

Returned by `searchProducts`.

```typescript
interface ProductSummary {
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
```

### ProductSearchFilters

```typescript
interface ProductSearchFilters {
  query?: string;
  brand?: string;
  category?: string;            // name or OFF tag, e.g. "en:breakfast-cereals"
  nutriScoreMax?: 'A' | 'B' | 'C' | 'D' | 'E';
  novaMax?: NovaGroup;
  // Declared but not used by the current providers:
  nutriScoreMin?: 'A' | 'B' | 'C' | 'D' | 'E';
  allergenFree?: AllergenId[];
  vegan?: boolean;
  vegetarian?: boolean;
  organic?: boolean;
}
```

### ProductComparison

Returned by `ComparisonService.compare()` (the `compareProducts` tool returns a trimmed version).

```typescript
interface ProductComparison {
  products: Product[];
  comparison: {
    winner?: { barcode: string; reason: string };
    nutritionComparison: NutrientComparison[];
    scoreComparison: ScoreComparison;
    summary: string;
  };
}

interface NutrientComparison {
  nutrientId: string;
  name: string;
  values: { barcode: string; value: number | null; unit: string }[];
  better?: string;              // barcode of the better product
}

interface ScoreComparison {
  nutriScore: { barcode: string; grade: string }[];
  greenScore: { barcode: string; grade: string }[];
  novaGroup: { barcode: string; group: number }[];
}
```

## Nutrition

`nutrition.types.ts`

```typescript
type NutrientId =
  // Energy
  | 'energy' | 'energy_kcal' | 'energy_kj'
  // Macronutrients
  | 'fat' | 'saturated_fat' | 'trans_fat' | 'monounsaturated_fat' | 'polyunsaturated_fat'
  | 'cholesterol' | 'carbohydrates' | 'sugars' | 'added_sugars' | 'fiber' | 'protein'
  // Minerals
  | 'sodium' | 'salt' | 'calcium' | 'iron' | 'potassium' | 'magnesium' | 'zinc'
  | 'phosphorus' | 'selenium' | 'copper' | 'manganese'
  // Vitamins
  | 'vitamin_a' | 'vitamin_c' | 'vitamin_d' | 'vitamin_e' | 'vitamin_k'
  | 'vitamin_b1' | 'vitamin_b2' | 'vitamin_b3' | 'vitamin_b5' | 'vitamin_b6'
  | 'vitamin_b9' | 'vitamin_b12'
  // Other
  | 'alcohol' | 'caffeine' | 'water';

interface Nutrient {
  id: NutrientId;
  name: string;
  value: number;                // per 100 g / 100 ml
  unit: NutrientUnit;           // g, mg (sodium, minerals, ...), mcg (vitamins A, D, K, B9, B12, selenium), kcal, kJ
  per100g?: number;
  perServing?: number;          // when the serving size in grams is known
  dailyValuePercent?: number;   // % of the FDA Daily Value, per 100 g
  source: DataSource;
}

interface NutriScore {
  grade: NutriScoreGrade;
  score?: number;               // lower is better
  version?: '2021' | '2023';
  positive: NutriScoreComponent[];   // fiber, protein, fruits/vegetables/legumes
  negative: NutriScoreComponent[];   // energy, sugars, saturated fat, salt (and sweeteners for beverages)
}

interface NutriScoreComponent {
  id: string;                   // e.g. "sugars", "fruits_vegetables_legumes"
  value: number | null;
  unit?: string;
  points: number;
  pointsMax?: number;
}

/** Green-Score (formerly Eco-Score) environmental impact */
interface GreenScore {
  grade: GreenScoreGrade;
  score?: number;               // 0-100, can be negative with maluses
}

interface MacroBreakdown {
  protein: { grams: number; calories: number; percent: number };
  carbs: { grams: number; calories: number; percent: number };
  fat: { grams: number; calories: number; percent: number };
  alcohol?: { grams: number; calories: number; percent: number };
}

interface NutritionAnalysis {
  calories: number;
  macros: MacroBreakdown;
  nutrients: Nutrient[];
  dailyValueSummary: DailyValueSummary;
  concerns: NutritionConcern[];
  benefits: NutritionBenefit[];
}

interface DailyValueSummary {
  exceeds: NutrientId[];        // > 100 % DV
  adequate: NutrientId[];       // 20-100 % DV
  low: NutrientId[];            // < 20 % DV
}

interface NutritionConcern {
  nutrient: NutrientId;
  level: 'high' | 'very_high';
  message: string;
}

interface NutritionBenefit {
  nutrient: NutrientId;
  level: 'good' | 'excellent';  // >= 10 % DV / >= 20 % DV
  message: string;
}
```

## Prices

`price.types.ts`. Data from Open Prices (crowdsourced, backed by receipt and price-tag proofs).

```typescript
interface Price {
  id: string;
  productBarcode: string;
  productName?: string;
  price: number;
  currency: string;             // ISO 4217
  isDiscounted: boolean;
  priceWithoutDiscount?: number;
  discountType?: string;
  store?: StoreInfo;
  location?: LocationInfo;
  date: string;                 // YYYY-MM-DD
  proofType?: string;           // RECEIPT | PRICE_TAG | ...
  source: DataSource;           // 'openprices'
}

interface StoreInfo {
  id?: string;
  name: string;
  brand?: string;
}

interface LocationInfo {
  country?: string;
  countryCode?: string;         // ISO 3166-1 alpha-2
  city?: string;
  postalCode?: string;
  coordinates?: { latitude: number; longitude: number };
}

interface PriceSearchFilters {
  barcode?: string;
  country?: string;             // filtered client-side
  currency?: string;
  discountedOnly?: boolean;
  dateFrom?: string;            // YYYY-MM-DD
  limit?: number;
}

interface CurrencyPriceStats {
  currency: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  latest: { price: number; date: string };
}

interface PriceStats {
  barcode: string;
  priceCount: number;
  byCurrency: CurrencyPriceStats[];   // never mixed across currencies
  firstDate: string;
  lastDate: string;
}

interface PriceHistoryPoint {
  month: string;                // YYYY-MM
  currency: string;
  count: number;
  median: number;
  min: number;
  max: number;
}

interface PriceComparison {
  currency: string;
  products: {
    barcode: string;
    name: string;
    bestPrice: Price | null;
    medianPrice: number | null;
    quantity?: string;
    pricePerKgOrL?: number;     // median price per kg or litre
  }[];
  cheapest: string | null;      // barcode, by median price
  bestValue: string | null;     // barcode, by price per kg/L
}
```

## Recalls

Defined in `services/recall.service.ts`.

```typescript
interface Recall {
  recallNumber: string;
  status: string;               // Ongoing | Completed | Terminated
  classification: string;       // Class I (most serious) | Class II | Class III
  reportDate?: string;          // YYYY-MM-DD
  recallInitiationDate?: string;
  recallingFirm: string;
  productDescription: string;
  reason: string;
  codeInfo?: string;
  distribution?: string;
  country?: string;
  matchedBy: 'barcode' | 'text';
}
```

## Errors

`errors/index.ts`

```typescript
class NutriMcpError extends Error {
  readonly code: string;
  readonly retryable: boolean;
}

class ProductNotFoundError extends NutriMcpError {}      // code PRODUCT_NOT_FOUND, barcode
class InvalidBarcodeError extends NutriMcpError {}       // code INVALID_BARCODE, barcode, reason
class ValidationError extends NutriMcpError {}           // code VALIDATION_ERROR, field
class ProviderUnavailableError extends NutriMcpError {}  // code PROVIDER_UNAVAILABLE (retryable), provider
class ApiError extends NutriMcpError {}                  // code API_ERROR, statusCode, provider; retryable for 429/5xx

/** Text is "Error [CODE]: message" for NutriMcpError, "Error: message" otherwise */
function formatErrorForMcp(error: unknown): { content: Array<{ type: 'text'; text: string }>; isError: true };
```

Tools never throw to the client: errors are returned as tool results with `isError: true`.
