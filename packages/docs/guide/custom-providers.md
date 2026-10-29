# Adding Providers

A product provider looks up products by barcode and searches by text, and maps the upstream response to the normalized `Product` type. Providers live in `packages/core/src/providers/` and extend `BaseProvider`, which supplies logging, the shared cache, the provider's circuit breaker and a resilient `fetchWithResilience()` helper.

This guide adds a fictional "Example Foods" API as provider `examplefoods`. Replace the URL, auth and field names with the real API.

## 1. Register the provider name

The provider name selects the circuit breaker and rate-limit buckets, so it must exist in a few typed places.

`src/config/constants.ts`, add a circuit breaker and rate limits (the bucket key is the `rateLimitKey` you pass later):

```typescript
export const RATE_LIMITS = {
  // ...existing providers
  examplefoods: {
    all: { max: 60, windowMs: 60_000 },
  },
} as const;

export const CIRCUIT_BREAKER = {
  // ...existing providers
  examplefoods: { failureThreshold: 3, successThreshold: 2, timeoutMs: 60_000 },
} as const;
```

`src/resilience/http.ts`, add the label used in error messages (`PROVIDER_LABELS` is typed over every breaker name, so TypeScript reports it if you forget):

```typescript
const PROVIDER_LABELS: Record<ProviderName, string> = {
  // ...existing providers
  examplefoods: 'Example Foods',
};
```

`src/types/common.types.ts`, add the data source id:

```typescript
export type DataSource =
  | 'openfoodfacts' | 'usda' | 'nutritionix' | 'openprices' | 'openfda' | 'calculated'
  | 'examplefoods';
```

`src/providers/base.provider.ts`, allow the name in the `BaseProvider` constructor:

```typescript
type ProductProviderName = 'openfoodfacts' | 'usda' | 'nutritionix' | 'examplefoods';
```

## 2. Add configuration

`src/config/env.ts`, add the credentials to `envSchema` (use the existing `optionalString` helper so empty strings count as unset, and `flag()` for an on/off switch):

```typescript
  EXAMPLEFOODS_API_KEY: optionalString,
  ENABLE_EXAMPLEFOODS: flag(true),
```

Document new variables in [Configuration](/guide/configuration).

## 3. Write the provider

```
src/providers/examplefoods/
├── types.ts    # Upstream response types
├── mapper.ts   # Upstream response → Product / ProductSummary
├── client.ts   # ExampleFoodsProvider
└── index.ts    # Exports
```

### types.ts

```typescript
export interface ExampleFoodsProduct {
  barcode: string;
  name: string;
  brand?: string;
  categories?: string[];
  /** Values per 100 g */
  nutrition_per_100g?: {
    energy_kcal?: number;
    fat_g?: number;
    saturated_fat_g?: number;
    sugars_g?: number;
    protein_g?: number;
    sodium_mg?: number;
  };
}

export interface ExampleFoodsSearchResponse {
  items: ExampleFoodsProduct[];
  total: number;
}
```

### mapper.ts

Nutrients must be **per 100 g / 100 ml** with units `g`, `mg`, `mcg` or `kcal`; use `dailyValuePercent()` so %DV is computed against the same FDA Daily Values as the other sources.

```typescript
import type { Product, ProductSummary } from '../../types/product.types.js';
import type { Nutrient, NutrientId } from '../../types/nutrition.types.js';
import type { NutrientUnit } from '../../types/common.types.js';
import { dailyValuePercent } from '../../services/daily-values.js';
import type { ExampleFoodsProduct } from './types.js';

const FIELDS: { key: keyof NonNullable<ExampleFoodsProduct['nutrition_per_100g']>; id: NutrientId; name: string; unit: NutrientUnit }[] = [
  { key: 'energy_kcal', id: 'energy_kcal', name: 'Energy', unit: 'kcal' },
  { key: 'fat_g', id: 'fat', name: 'Fat', unit: 'g' },
  { key: 'saturated_fat_g', id: 'saturated_fat', name: 'Saturated fat', unit: 'g' },
  { key: 'sugars_g', id: 'sugars', name: 'Sugars', unit: 'g' },
  { key: 'protein_g', id: 'protein', name: 'Protein', unit: 'g' },
  { key: 'sodium_mg', id: 'sodium', name: 'Sodium', unit: 'mg' },
];

function mapNutrients(p: ExampleFoodsProduct): Nutrient[] {
  const values = p.nutrition_per_100g ?? {};
  return FIELDS.flatMap(({ key, id, name, unit }) => {
    const value = values[key];
    if (typeof value !== 'number') return [];
    return [{
      id,
      name,
      value,
      unit,
      per100g: value,
      dailyValuePercent: dailyValuePercent(id, value, unit),
      source: 'examplefoods' as const,
    }];
  });
}

export function mapExampleFoodsProduct(p: ExampleFoodsProduct): Product {
  const nutrients = mapNutrients(p);
  return {
    barcode: p.barcode,
    name: p.name,
    brand: p.brand,
    categories: p.categories ?? [],
    labels: [],
    nutrients,
    allergens: [],
    traces: [],
    additives: [],
    countries: [],
    sources: ['examplefoods'],
    dataQuality: {
      score: nutrients.length > 0 ? 70 : 30,
      completeness: Math.round((nutrients.length / FIELDS.length) * 100),
      warnings: [],
    },
  };
}

export function mapExampleFoodsSearchResult(p: ExampleFoodsProduct): ProductSummary {
  return {
    barcode: p.barcode,
    name: p.name,
    brand: p.brand,
    categories: p.categories ?? [],
    sources: ['examplefoods'],
  };
}
```

### client.ts

```typescript
import { getEnv } from '../../config/env.js';
import { BaseProvider, emptyPage, type ProviderFeature } from '../base.provider.js';
import type { Product, ProductSummary, ProductSearchFilters } from '../../types/product.types.js';
import type { PaginatedResponse, PaginationParams } from '../../types/common.types.js';
import { LRUCache } from '../../resilience/cache.js';
import type { ExampleFoodsProduct, ExampleFoodsSearchResponse } from './types.js';
import { mapExampleFoodsProduct, mapExampleFoodsSearchResult } from './mapper.js';

const BASE_URL = 'https://api.example.com/v1';
const NOT_FOUND = Symbol('not-found');

export class ExampleFoodsProvider extends BaseProvider {
  readonly source = 'examplefoods' as const;
  readonly name = 'Example Foods';

  constructor() {
    super('examplefoods');
  }

  /** Only queried when enabled and a key is set */
  override isConfigured(): boolean {
    const env = getEnv();
    return env.ENABLE_EXAMPLEFOODS && !!env.EXAMPLEFOODS_API_KEY;
  }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${getEnv().EXAMPLEFOODS_API_KEY ?? ''}` };
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    if (!this.isConfigured()) return null;

    const cacheKey = LRUCache.makeKey('examplefoods:product', barcode);
    const cached = this.cache.get<Product | typeof NOT_FOUND>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value === NOT_FOUND ? null : cached.value;
    }

    // allowNotFound: HTTP 404 resolves to null instead of throwing
    const data = await this.fetchWithResilience<ExampleFoodsProduct>(
      `${BASE_URL}/products/${encodeURIComponent(barcode)}`,
      'all',
      { allowNotFound: true, init: { headers: this.headers() } },
    );

    if (!data) {
      this.cache.set(cacheKey, NOT_FOUND, 'notFound');
      return null;
    }

    const product = mapExampleFoodsProduct(data);
    this.cache.set(cacheKey, product, 'product');
    return product;
  }

  async searchProducts(
    filters: ProductSearchFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<ProductSummary>> {
    if (!this.isConfigured() || !filters.query) {
      return emptyPage(pagination, ['examplefoods']);
    }

    const { page, pageSize } = pagination;
    const url = new URL(`${BASE_URL}/search`);
    url.searchParams.set('q', filters.query);
    url.searchParams.set('page', String(page));
    url.searchParams.set('page_size', String(pageSize));

    const cacheKey = LRUCache.makeKey('examplefoods:search', url.toString());
    const cached = this.cache.get<PaginatedResponse<ProductSummary>>(cacheKey);
    if (cached && !cached.stale) return cached.value;

    const data = await this.fetchWithResilience<ExampleFoodsSearchResponse>(url.toString(), 'all', {
      init: { headers: this.headers() },
    });

    const result: PaginatedResponse<ProductSummary> = {
      items: data.items.map(mapExampleFoodsSearchResult),
      pagination: {
        page,
        pageSize,
        totalItems: data.total,
        totalPages: Math.ceil(data.total / pageSize),
        hasNext: page * pageSize < data.total,
        hasPrev: page > 1,
      },
      sources: ['examplefoods'],
    };
    this.cache.set(cacheKey, result, 'search');
    return result;
  }

  supports(feature: ProviderFeature): boolean {
    return (['barcode_lookup', 'text_search'] as ProviderFeature[]).includes(feature);
  }
}

let instance: ExampleFoodsProvider | null = null;

export function getExampleFoodsProvider(): ExampleFoodsProvider {
  instance ??= new ExampleFoodsProvider();
  return instance;
}
```

`fetchWithResilience(url, rateLimitKey, options)` calls `fetchJson()` with this provider's name, so the request gets the circuit breaker, the rate-limit bucket `RATE_LIMITS.examplefoods[rateLimitKey]`, the timeout, retries on 429/5xx/network errors and the Nutri-MCP User-Agent. Options are `allowNotFound`, `init` (headers, method, body) and `timeoutMs`.

### index.ts

```typescript
export { ExampleFoodsProvider, getExampleFoodsProvider } from './client.js';
export { mapExampleFoodsProduct, mapExampleFoodsSearchResult } from './mapper.js';
export * from './types.js';
```

Also export it from `src/providers/index.ts`.

## 4. Add it to ProductService

`src/services/product.service.ts` decides which providers are queried. Order matters: the first product found is the base record when results are merged.

```typescript
import { getExampleFoodsProvider } from '../providers/examplefoods/index.js';

export class ProductService {
  private offProvider = getOpenFoodFactsProvider();
  private usdaProvider = getUSDAProvider();
  private nixProvider = getNutritionixProvider();
  private exampleProvider = getExampleFoodsProvider();

  private get providers(): BaseProvider[] {
    return [this.offProvider, this.usdaProvider, this.nixProvider, this.exampleProvider];
  }
  // ...
}
```

Providers whose `isConfigured()` returns `false` are skipped. Once added, the provider takes part in every barcode lookup and search, its name appears in `sources` and in `GET /health`, and all existing tools use its data.

## 5. Test it

Tests use fixtures instead of the network. `tests/helpers/fetch-stub.ts` replaces `fetch` with a router:

```typescript
// tests/unit/examplefoods.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { ExampleFoodsProvider } from '../../src/providers/examplefoods/index.js';
import { resetEnvForTests } from '../../src/config/env.js';
import { getCache } from '../../src/resilience/cache.js';
import { stubFetch, restoreFetch } from '../helpers/fetch-stub.js';

afterEach(() => {
  restoreFetch();
  resetEnvForTests();
  getCache().clear();
});

describe('ExampleFoodsProvider', () => {
  it('maps a product', async () => {
    resetEnvForTests({ EXAMPLEFOODS_API_KEY: 'test-key' });
    stubFetch([{
      match: (u) => u.hostname === 'api.example.com' && u.pathname === '/v1/products/3017620422003',
      body: { barcode: '3017620422003', name: 'Spread', nutrition_per_100g: { sodium_mg: 40 } },
    }]);

    const product = await new ExampleFoodsProvider().getProductByBarcode('3017620422003');
    expect(product?.sources).toEqual(['examplefoods']);
    expect(product?.nutrients.find((n) => n.id === 'sodium')).toMatchObject({ value: 40, unit: 'mg' });
  });

  it('returns null for unknown barcodes', async () => {
    resetEnvForTests({ EXAMPLEFOODS_API_KEY: 'test-key' });
    stubFetch([]); // unmatched URLs answer 404
    expect(await new ExampleFoodsProvider().getProductByBarcode('0000000000017')).toBeNull();
  });
});
```

```bash
pnpm --filter nutri-mcp test
```

```bash
pnpm --filter nutri-mcp typecheck
```

## Checklist

- [ ] Name added to `CIRCUIT_BREAKER`, `RATE_LIMITS`, `PROVIDER_LABELS`, `DataSource` and `ProductProviderName`
- [ ] Credentials in `env.ts`, `isConfigured()` overridden
- [ ] Nutrients per 100 g with normalized units and `dailyValuePercent()`
- [ ] Not found returns `null` (use `allowNotFound` and the `notFound` cache); upstream failures throw
- [ ] Provider added to `ProductService`
- [ ] Fixture-based tests; new variables documented

## Non-product data sources

Services that are not product databases (like Open Prices, openFDA or Robotoff) do not extend `BaseProvider`. They call `fetchJson()` directly with their provider name:

```typescript
import { fetchJson } from '../resilience/http.js';

const data = await fetchJson<MyResponse>(url, { provider: 'examplefoods', allowNotFound: true });
```

The name still needs entries in `CIRCUIT_BREAKER`, `RATE_LIMITS` and `PROVIDER_LABELS`. New tools for such data go in `src/tools/<category>/index.ts` and are registered with `registerJsonTool()` so they get an output schema, structured content and annotations.
