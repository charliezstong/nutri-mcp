# Providers API

Product providers live in `packages/core/src/providers/`. Each one extends `BaseProvider`, fetches through the shared [resilience layer](/guide/resilience) and maps upstream data to the normalized [`Product`](/api/types#product) type. Other upstream services (Open Prices, openFDA, Robotoff, additives taxonomy) are called from services and tools with `fetchJson()`; they are listed at the end.

## Overview

| Provider | `source` | Key | Barcode lookup | Search | Enabled when |
|----------|----------|-----|----------------|--------|--------------|
| `OpenFoodFactsProvider` | `openfoodfacts` | none | yes | text, brand, category, max Nutri-Score, max NOVA | always |
| `USDAProvider` | `usda` | `USDA_API_KEY` (free) | yes (GTIN match) | text (+ brand owner) | key set and `ENABLE_USDA` not `false` |
| `NutritionixProvider` | `nutritionix` | `NUTRITIONIX_APP_ID` + `NUTRITIONIX_APP_KEY` (paid) | yes (UPC) | text | both set and `ENABLE_NUTRITIONIX` not `false` |

Each provider module exports the class, a singleton getter (`getOpenFoodFactsProvider()`, `getUSDAProvider()`, `getNutritionixProvider()`) and its mapper functions.

## BaseProvider

```typescript
abstract class BaseProvider {
  abstract readonly source: DataSource;
  abstract readonly name: string;

  protected readonly logger: Logger;                // child logger named after the provider
  protected readonly circuitBreaker: CircuitBreaker; // shared breaker for the provider
  protected readonly cache: LRUCache;                // shared LRU cache

  constructor(providerName: 'openfoodfacts' | 'usda' | 'nutritionix');

  /** Configured and circuit breaker not open */
  isAvailable(): boolean;
  /** Has the credentials it needs (default: true) */
  isConfigured(): boolean;

  abstract getProductByBarcode(barcode: string): Promise<Product | null>;
  abstract searchProducts(
    filters: ProductSearchFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<ProductSummary>>;
  abstract supports(feature: ProviderFeature): boolean;

  /** fetchJson() with this provider's breaker and rate-limit bucket */
  protected fetchWithResilience<T>(
    url: string,
    rateLimitKey: string,
    options?: { allowNotFound?: boolean; init?: RequestInit; timeoutMs?: number },
  ): Promise<T>; // Promise<T | null> when allowNotFound is true
}

type ProviderFeature =
  | 'barcode_lookup' | 'text_search' | 'category_search' | 'brand_search'
  | 'nutriscore' | 'ecoscore' | 'nova_group' | 'prices' | 'images' | 'ai_insights';
```

`emptyPage(pagination, sources)` returns an empty `PaginatedResponse` for providers that cannot answer a query.

Contract:

- `getProductByBarcode` returns `null` when the source does not know the barcode and **throws** when the source failed, so `ProductService` can tell "not found" from "unavailable".
- Nutrient values are per 100 g / 100 ml with units `g`, `mg`, `mcg` or `kcal`, and `dailyValuePercent` filled from FDA Daily Values.

See [Adding Providers](/guide/custom-providers) for a complete example.

## Open Food Facts

`OpenFoodFactsProvider` (`source: 'openfoodfacts'`) is always enabled and provides the base record for merged products.

### Endpoints

| Operation | Request |
|-----------|---------|
| Barcode lookup | `GET {OFF_BASE_URL}/api/v3.4/product/{barcode}?fields=...` (default base `https://world.openfoodfacts.org`) |
| Search | `GET https://search.openfoodfacts.org/search?q=...&page=&page_size=&fields=...` (search-a-licious) |
| Search fallback | `GET {OFF_BASE_URL}/cgi/search.pl?search_terms=...&json=1` when search-a-licious fails |

API v3.4 keeps the flat `nutriments` object and exposes the Green-Score as `environmental_score_*` (the provider also reads the older `ecoscore_*` fields).

### Barcode lookup

- The barcode is trimmed and must be 6-14 digits (`InvalidBarcodeError` otherwise). Barcodes that fail check-digit validation are still queried, because store-internal codes exist in Open Food Facts.
- A 404 or `status: "failure"` returns `null` and is cached for 5 minutes (`notFound`); products are cached for 30 minutes.

### Search

`searchProducts` builds a search-a-licious query from the filters:

| Filter | Query part |
|--------|-----------|
| `query` | Free text with Lucene operators stripped |
| `brand` | `brands_tags:"<slug>"` |
| `category` | `categories_tags:"en:<slug>"` (or the tag as given, e.g. `en:breakfast-cereals`) |
| `nutriScoreMax` | `nutriscore_grade:(a OR b ...)` up to the given grade |
| `novaMax` | `nova_group:[1 TO n]` |

The legacy fallback supports `query`, `brand` and `category`. Results are cached for 5 minutes.

### Mapping

- **Nutrients**: grams from OFF are converted to mg (sodium, cholesterol, caffeine, calcium, iron, potassium, magnesium, zinc, phosphorus, vitamins C, E, B1, B2, B3, B6) or mcg (selenium, vitamins A, D, K, B9, B12). `perServing` is computed from `serving_quantity`.
- **Nutri-Score**: grade A-E, score, `version` (`2021` or `2023`) and the `positive`/`negative` components with `value`, `unit`, `points` and `pointsMax`.
- **Green-Score**: grades `a-plus`..`f` mapped to `A+`..`F`, plus the score.
- **NOVA** group 1-4, ingredients text, `ingredientsAnalysis` (vegan, vegetarian, palm-oil-free from `ingredients_analysis_tags`).
- **Allergens and traces** mapped from OFF taxonomy tags to allergen ids (`en:milk` → `dairy`, `en:nuts` → `tree_nuts`, `en:crustaceans` → `shellfish`, ...).
- **Additives** E-numbers from `additives_tags`; names and risk come from the additives taxonomy (`getAdditivesInfo`).
- Images (front, nutrition, ingredients, thumbnail), product URL, `lastUpdated`, and `dataQuality` from OFF's completeness.

### Rate limits

15 product reads and 10 searches per minute, matching the [Open Food Facts API rules](https://openfoodfacts.github.io/openfoodfacts-server/api/). Set `OFF_CONTACT_EMAIL` so the User-Agent identifies you.

## USDA FoodData Central

`USDAProvider` (`source: 'usda'`) adds US branded foods and fills nutrient gaps. Get a free key at [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup).

```bash
claude mcp add nutri-mcp -e USDA_API_KEY=your-usda-key -- npx -y nutri-mcp
```

| Method | Request |
|--------|---------|
| `getProductByBarcode(barcode)` | `GET /fdc/v1/foods/search?query=<barcode without leading zeros>&dataType=Branded&pageSize=10`, then the first food whose `gtinUpc` matches the barcode ignoring leading zeros, fetched with `getProductByFdcId` |
| `getProductByFdcId(fdcId)` | `GET /fdc/v1/food/{fdcId}` |
| `searchProducts(filters, pagination)` | `GET /fdc/v1/foods/search?query=...&pageSize=&pageNumber=` (`brandOwner` when `brand` is set); requires `query` |

The returned product keeps the barcode the caller asked for (so merging works) and has `fdcId`, `countries: ['United States']` and a FoodData Central URL. Unknown barcodes are negative-cached for 5 minutes. `supports()` reports `barcode_lookup`, `text_search` and `brand_search`.

Rate limit: 1000 requests per hour.

## Nutritionix

`NutritionixProvider` (`source: 'nutritionix'`) is only active with both `NUTRITIONIX_APP_ID` and `NUTRITIONIX_APP_KEY`. Nutritionix no longer offers a public free tier.

| Method | Request |
|--------|---------|
| `getProductByBarcode(barcode)` | `GET /v2/search/item?upc=<barcode>` |
| `searchProducts(filters, pagination)` | `GET /v2/search/instant?query=...` (branded and common foods, paginated client-side); requires `query` |
| `getNutrients(query)` | `POST /v2/natural/nutrients` with `{ query }`, returns one `Product` per food |

`getNutrients` powers the `estimateNutritionFromText` tool, which is registered only when Nutritionix is configured. Requests send the `x-app-id` and `x-app-key` headers. Rate limit: 200 requests per day.

## Other upstream services

These are not `BaseProvider` subclasses but use the same `fetchJson()` client, with their own circuit breakers and rate limits.

| Service | Used by | Endpoint | Limit | Cache |
|---------|---------|----------|-------|-------|
| Open Prices | `PriceService`, price and meal cost tools | `https://prices.openfoodfacts.org/api/v1/prices` | 60 / min | 1 hour |
| openFDA food enforcement | `RecallService`, `checkRecalls` | `https://api.fda.gov/food/enforcement.json` | 240 / min | 6 hours |
| Robotoff | `getProductInsights`, `getAIQuestions` | `https://robotoff.openfoodfacts.org/api/v1` | 60 / min | none |
| OFF additives taxonomy | `AdditiveService`, `getAdditivesInfo` | `https://static.openfoodfacts.org/data/taxonomies/additives.json` | shares the OFF product bucket | 24 hours |

## Data licenses

Open Food Facts and Open Prices data are available under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/). openFDA data is public domain; FDA asks not to rely on it for medical decisions. USDA FoodData Central data is public domain. Nutritionix data is subject to its own terms.
