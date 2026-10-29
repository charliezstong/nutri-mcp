# Services API

Services in `packages/core/src/services/` hold the business logic used by the tools. Each service is a class with a singleton getter (for example `getProductService()`). `services/index.ts` re-exports `ProductService`, `NutritionService`, `AllergenService`, `ComparisonService` and `PriceService`; `RecallService`, `AdditiveService` and the `daily-values` helpers are imported from their own files.

All values are per 100 g / 100 ml unless a field says otherwise.

## ProductService

`product.service.ts`. Looks up and searches products across the configured [providers](/api/providers) (Open Food Facts, then USDA, then Nutritionix).

```typescript
class ProductService {
  /** Product sources currently configured, e.g. ['openfoodfacts', 'usda'] */
  enabledSources(): DataSource[];

  /**
   * Query every configured source in parallel and merge the results.
   * Returns null when no source knows the barcode; throws when every source failed.
   */
  getByBarcode(barcode: string): Promise<Product | null>;

  /** Like getByBarcode, but throws ProductNotFoundError instead of returning null */
  requireByBarcode(barcode: string): Promise<Product>;

  /** Fetch several products (deduplicated); unknown barcodes are listed in `missing` */
  getMany(barcodes: string[]): Promise<{ found: Product[]; missing: string[] }>;

  /**
   * Search all configured sources (optionally only `sources`), dedupe by barcode
   * ignoring leading zeros. Throws only if every source failed.
   */
  search(
    filters: ProductSearchFilters,
    pagination: PaginationParams,
    sources?: DataSource[],
  ): Promise<PaginatedResponse<ProductSummary>>;
}

/** First product is the base; others fill missing fields, nutrients, allergens and traces */
function mergeProducts(products: Product[]): Product;
```

```typescript
import { getProductService } from './services/product.service.js';

const products = getProductService();
const nutella = await products.requireByBarcode('3017620422003');
const page = await products.search({ query: 'granola', nutriScoreMax: 'B' }, { page: 1, pageSize: 10 });
```

## NutritionService

`nutrition.service.ts`. Pure calculations on normalized nutrients.

```typescript
type TrafficLight = 'low' | 'medium' | 'high';
interface TrafficLights { fat?: TrafficLight; saturated_fat?: TrafficLight; sugars?: TrafficLight; salt?: TrafficLight }

class NutritionService {
  /** Calories, macros, nutrients, %DV summary, traffic lights, concerns, benefits and a `basis` note */
  analyzeProduct(product: Product): NutritionAnalysis & { trafficLights: TrafficLights; basis: string };

  /** Nutrient ids grouped by %DV: exceeds (>100), adequate (20-100), low (<20) */
  calculateDailyValues(nutrients: Nutrient[]): DailyValueSummary;

  /** kcal per 100 g, derived from kJ (÷ 4.184) when kcal is missing; 0 if unknown */
  getCalories(nutrients: Nutrient[]): number;

  /** Grams, calories (4/4/9 kcal per g) and share of energy for protein, carbs and fat */
  calculateMacros(nutrients: Nutrient[]): MacroBreakdown;

  /** Sum of %DV (each capped at 100) of fiber, protein, vitamins A/C/D, calcium, iron,
   *  potassium and magnesium, per 100 kcal */
  calculateNutrientDensity(product: Product): number;

  /** UK FSA traffic lights per 100 g; salt is derived from sodium (× 2.5) when missing */
  trafficLights(nutrients: Nutrient[]): TrafficLights;

  /** "High" traffic lights (very_high above twice the threshold), plus trans fat > 0.5 g */
  identifyConcerns(nutrients: Nutrient[]): NutritionConcern[];

  /** Good (>= 10 %DV) or excellent (>= 20 %DV) sources of fiber, protein, vitamins and minerals */
  identifyBenefits(nutrients: Nutrient[]): NutritionBenefit[];

  /** Value of a nutrient, 0 when absent */
  getNutrientValue(nutrients: Nutrient[], id: string): number;
}
```

Traffic light thresholds (g per 100 g, `TRAFFIC_LIGHTS` in `constants.ts`, also served as `nutri://reference/traffic-lights`):

| Nutrient | Low (≤) | High (>) |
|----------|---------|----------|
| Fat | 3 | 17.5 |
| Saturated fat | 1.5 | 5 |
| Sugars | 5 | 22.5 |
| Salt | 0.3 | 1.5 |

## AllergenService

`allergen.service.ts`. Allergen and diet checks on label data.

```typescript
interface AllergenCheckResult {
  safe: boolean;            // not declared, not in traces, not implied
  allergen: AllergenId;
  found: Allergen | null;
  inTraces: boolean;
  note?: string;            // e.g. wheat inferred from a gluten declaration
}

interface DietComplianceResult {
  compliant: boolean;
  verdict: 'compliant' | 'not_compliant' | 'uncertain';
  diet: DietType;
  violations: string[];
  warnings: string[];
  basis: string[];          // evidence used (OFF ingredient analysis, labels, nutrients, keywords)
}

class AllergenService {
  checkAllergen(product: Product, allergen: AllergenId): AllergenCheckResult;
  checkMultipleAllergens(product: Product, allergens: AllergenId[]): { safe: boolean; results: AllergenCheckResult[] };
  /** US FDA Big 9: dairy, eggs, fish, shellfish, tree_nuts, peanuts, wheat, soy, sesame */
  checkBig9(product: Product): { safe: boolean; results: AllergenCheckResult[] };
  /** EU 14 (Regulation 1169/2011) */
  checkEU14(product: Product): { safe: boolean; results: AllergenCheckResult[] };
  getAllAllergens(product: Product): { confirmed: Allergen[]; mayContain: Allergen[]; traces: Allergen[] };
  /** Based on traces, "may contain" declarations and facility phrases in the ingredients text */
  assessCrossContaminationRisk(product: Product): { risk: 'low' | 'medium' | 'high' | 'unknown'; factors: string[] };
  checkDietCompliance(product: Product, diet: DietType): DietComplianceResult;
  filterSafeProducts(products: Product[], allergens: AllergenId[]): Product[];
}
```

Notes:

- Open Food Facts tags wheat-based products with `gluten`, so checking `wheat` treats a gluten declaration as "may contain wheat" (`IMPLIED_ALLERGENS`).
- Diet checks combine the OFF ingredient analysis (vegan, vegetarian), declared allergens, labels (gluten-free, halal, kosher), nutrients (`keto`: net carbohydrates ≤ 10 g per 100 g; `low_sodium` and `low_sugar`: EU claim thresholds of 120 mg sodium and 5 g sugars per 100 g), NOVA (`paleo` excludes NOVA 4) and multilingual ingredient keywords (English, Spanish, French, German, Italian, Portuguese), with plant-based phrases such as "coconut milk" or "cocoa butter" excluded.
- Missing data yields `verdict: 'uncertain'` rather than a false "compliant". Halal and kosher are only `compliant` with a certification label.

## ComparisonService

`comparison.service.ts`.

```typescript
class ComparisonService {
  /** Nutrient-by-nutrient and score comparison of 2+ products, with an overall winner and summary */
  compare(products: Product[]): ProductComparison;

  /** Best candidate that improves on NOVA, Nutri-Score, salt, sugars, saturated fat, fiber or protein */
  findHealthierAlternative(
    original: Product,
    alternatives: Product[],
  ): { alternative: Product; improvements: string[] } | null;

  /** Products ranked by NutritionService.calculateNutrientDensity */
  compareNutrientDensity(products: Product[]): {
    ranking: { barcode: string; name: string; density: number }[];
    best: string;
  };

  /** Sorted by one nutrient (ascending by default); products without data go last */
  rankByNutrient(
    products: Product[],
    nutrientId: string,
    ascending?: boolean,
  ): { barcode: string; name: string; value: number | null; unit?: string }[];
}
```

In `compare`, lower is better for energy, fat, saturated and trans fat, sugars, added sugars, salt, sodium and cholesterol; a product without data for a nutrient never wins it. A better Nutri-Score weighs more than single nutrients when picking the winner.

## PriceService

`price.service.ts`. Crowdsourced prices from [Open Prices](https://prices.openfoodfacts.org). Prices in different currencies are never mixed.

```typescript
class PriceService {
  /** Newest first. `country` (ISO alpha-2) is filtered client-side; `limit` max 100 */
  searchPrices(filters: PriceSearchFilters): Promise<Price[]>;
  getProductPrices(barcode: string, filters?: Omit<PriceSearchFilters, 'barcode'>): Promise<Price[]>;
  getRecentPrices(limit?: number, filters?: Omit<PriceSearchFilters, 'limit'>): Promise<Price[]>;
  /** One CurrencyPriceStats entry per currency; null without prices */
  getPriceStats(barcode: string, filters?: Omit<PriceSearchFilters, 'barcode'>): Promise<PriceStats | null>;
  /** Lowest price per currency, most-reported currency first */
  findBestPrices(barcode: string, filters?: Omit<PriceSearchFilters, 'barcode'>): Promise<Price[]>;
  /** Monthly median, min and max per currency over the last `months` (default 12) */
  getPriceHistory(barcode: string, months?: number, currency?: string): Promise<PriceHistoryPoint[]>;
  /** Median and best price per product in one currency (the most common one by default),
   *  plus price per kg/L when the package quantity is known */
  comparePrices(products: Product[], currency?: string): Promise<PriceComparison | null>;
}

function median(values: number[]): number;
function statsByCurrency(prices: Price[]): CurrencyPriceStats[];
/** "400 g", "1,5 L", "6 x 33 cl" → grams or millilitres */
function quantityInGramsOrMl(quantity: string | undefined): number | undefined;
```

## RecallService

`recall.service.ts`. US food recalls from the [openFDA food enforcement](https://open.fda.gov/apis/food/enforcement/) API (updated weekly).

```typescript
interface RecallSearch {
  barcode?: string;
  text?: string;          // matched against the product description
  ongoingOnly?: boolean;  // default false
  limit?: number;         // default 10
}

class RecallService {
  /** Barcode matches first (UPC/EAN variants in description and code info), then text matches,
   *  newest report first */
  search(query: RecallSearch): Promise<Recall[]>;
}

function getRecallService(): RecallService;
```

Each `Recall` has `recallNumber`, `status` (Ongoing, Completed, Terminated), `classification` (Class I is the most serious), ISO `reportDate` and `recallInitiationDate`, `recallingFirm`, `productDescription`, `reason`, `codeInfo`, `distribution`, `country` and `matchedBy` (`barcode` or `text`). openFDA answers 404 when nothing matches, which becomes an empty list.

## AdditiveService

`additive.service.ts`. Enriches additive codes with the Open Food Facts additives taxonomy (downloaded once, cached 24 hours).

```typescript
interface AdditiveDetails extends Additive {
  classes: string[];          // functions, e.g. "emulsifier"
  vegan?: string;
  vegetarian?: string;
  efsaEvaluationUrl?: string;
}

class AdditiveService {
  /** Names, classes and riskLevel from the EFSA over-exposure risk (high, moderate, low, unknown) */
  describe(additives: Additive[]): Promise<AdditiveDetails[]>;
}

function getAdditiveService(): AdditiveService;
```

If the taxonomy cannot be loaded, the additives are returned unchanged with empty `classes`.

## Daily values helpers

`daily-values.ts`. Used by every mapper so %DV is consistent across sources.

```typescript
/** Convert between g, mg and mcg; undefined for other units unless identical */
function convertUnit(value: number, from: NutrientUnit, to: NutrientUnit): number | undefined;

/** Percent of the FDA Daily Value (DAILY_VALUES in constants.ts), rounded to 0.1 */
function dailyValuePercent(id: NutrientId, value: number, unit: NutrientUnit): number | undefined;
```

```typescript
dailyValuePercent('sodium', 230, 'mg');  // 10
dailyValuePercent('fiber', 7, 'g');      // 25
dailyValuePercent('sugars', 50, 'g');    // undefined (only added sugars has a Daily Value)
```

The Daily Values (adults and children 4+, 2,000 kcal diet, 21 CFR 101.9) are served as `nutri://reference/daily-values`. Examples: sodium 2300 mg, saturated fat 20 g, added sugars 50 g, fiber 28 g, protein 50 g, calcium 1300 mg, iron 18 mg, potassium 4700 mg, vitamin D 20 mcg.
