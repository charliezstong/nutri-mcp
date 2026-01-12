# Adding Custom Providers

Nutri-MCP is designed to be extensible. You can add new data providers by implementing the provider interface.

## Provider Interface

Every provider must implement these methods:

```typescript
import { Provider, Product, SearchResult, SearchOptions, DataSource } from '../types';

export class CustomProvider implements Provider {
  readonly source: DataSource = 'custom';

  async getProduct(barcode: string): Promise<Product | null> {
    // Fetch product by barcode
    // Return null if not found
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    // Search for products
    // Return paginated results
  }
}
```

## Implementation Steps

### 1. Create Provider Directory

```
src/providers/
└── custom/
    ├── types.ts      # Provider-specific types
    ├── client.ts     # HTTP client
    ├── mapper.ts     # Response transformation
    └── index.ts      # Provider export
```

### 2. Define Types

```typescript
// src/providers/custom/types.ts

export interface CustomAPIResponse {
  id: string;
  product_name: string;
  // ... API-specific fields
}

export interface CustomSearchResponse {
  items: CustomAPIResponse[];
  total: number;
  page: number;
}
```

### 3. Create HTTP Client

```typescript
// src/providers/custom/client.ts

import { resilience } from '../../resilience';

const BASE_URL = 'https://api.custom.com/v1';

export async function fetchProduct(barcode: string): Promise<CustomAPIResponse | null> {
  const cacheKey = `custom:product:${barcode}`;

  // Check cache
  const cached = resilience.cache.get<CustomAPIResponse>(cacheKey);
  if (cached) return cached;

  // Check circuit breaker
  return resilience.circuitBreaker.execute('custom', async () => {
    // Apply rate limiting
    await resilience.rateLimiter.acquire('custom');

    const response = await fetch(`${BASE_URL}/products/${barcode}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CUSTOM_API_KEY}`,
      },
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();

    // Cache result
    resilience.cache.set(cacheKey, data, 'product');

    return data;
  });
}
```

### 4. Create Mapper

```typescript
// src/providers/custom/mapper.ts

import { Product, Nutrient } from '../../types';
import { CustomAPIResponse } from './types';

export function mapToProduct(response: CustomAPIResponse): Product {
  return {
    barcode: response.id,
    name: response.product_name,
    brand: response.brand,
    categories: response.categories || [],
    nutrients: mapNutrients(response),
    allergens: response.allergens || [],
    sources: ['custom'],
  };
}

function mapNutrients(response: CustomAPIResponse): Nutrient[] {
  const nutrients: Nutrient[] = [];

  if (response.calories) {
    nutrients.push({
      id: 'energy',
      name: 'Energy',
      value: response.calories,
      unit: 'kcal',
      per100g: response.calories,
    });
  }

  // Map other nutrients...

  return nutrients;
}
```

### 5. Export Provider

```typescript
// src/providers/custom/index.ts

import { Provider, Product, SearchResult, SearchOptions } from '../../types';
import { fetchProduct, searchProducts } from './client';
import { mapToProduct } from './mapper';

export class CustomProvider implements Provider {
  readonly source = 'custom' as const;

  async getProduct(barcode: string): Promise<Product | null> {
    const response = await fetchProduct(barcode);
    if (!response) return null;
    return mapToProduct(response);
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const response = await searchProducts(query, options);
    return {
      products: response.items.map(mapToProduct),
      total: response.total,
      page: response.page,
      pageSize: options?.limit || 20,
    };
  }
}
```

### 6. Register Provider

```typescript
// src/providers/index.ts

import { OpenFoodFactsProvider } from './openfoodfacts';
import { USDAProvider } from './usda';
import { NutritionixProvider } from './nutritionix';
import { CustomProvider } from './custom';
import { env } from '../config';

export function getProviders() {
  const providers = [
    new OpenFoodFactsProvider(),
  ];

  if (env.USDA_API_KEY) {
    providers.push(new USDAProvider());
  }

  if (env.NUTRITIONIX_APP_ID && env.NUTRITIONIX_APP_KEY) {
    providers.push(new NutritionixProvider());
  }

  if (env.CUSTOM_API_KEY) {
    providers.push(new CustomProvider());
  }

  return providers;
}
```

### 7. Add Configuration

```typescript
// src/config/env.ts

export const envSchema = z.object({
  // Existing config...

  CUSTOM_API_KEY: z.string().optional(),
  RATE_LIMIT_CUSTOM: z.coerce.number().default(100),
});
```

## Testing Your Provider

```typescript
// tests/unit/custom-provider.test.ts

import { CustomProvider } from '../src/providers/custom';

describe('CustomProvider', () => {
  const provider = new CustomProvider();

  it('should fetch product by barcode', async () => {
    const product = await provider.getProduct('1234567890123');
    expect(product).not.toBeNull();
    expect(product?.barcode).toBe('1234567890123');
  });

  it('should return null for unknown barcode', async () => {
    const product = await provider.getProduct('0000000000000');
    expect(product).toBeNull();
  });

  it('should search products', async () => {
    const results = await provider.search('chocolate');
    expect(results.products.length).toBeGreaterThan(0);
  });
});
```

## Best Practices

1. **Always use the resilience layer** - Cache, circuit breaker, and rate limiter protect against API failures
2. **Normalize data** - Map provider-specific responses to the common Product type
3. **Handle errors gracefully** - Return null for not found, throw for server errors
4. **Add logging** - Use the logger for debugging
5. **Write tests** - Cover happy path, not found, and error cases
6. **Document configuration** - Add environment variables to the docs
