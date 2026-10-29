import { API_URLS } from '../../config/constants.js';
import { getEnv, isProviderEnabled } from '../../config/env.js';
import { BaseProvider, emptyPage, type ProviderFeature } from '../base.provider.js';
import type { Product, ProductSummary, ProductSearchFilters } from '../../types/product.types.js';
import type { PaginatedResponse, PaginationParams } from '../../types/common.types.js';
import { LRUCache } from '../../resilience/cache.js';
import type {
  NutritionixSearchResponse,
  NutritionixItemResponse,
  NutritionixNutrientsResponse,
} from './types.js';
import { mapNutritionixProduct, mapNutritionixSearchResult } from './mapper.js';

/**
 * Nutritionix API Client. Nutritionix no longer offers a public free tier,
 * so this provider is only active when NUTRITIONIX_APP_ID/KEY are set.
 */
export class NutritionixProvider extends BaseProvider {
  readonly source = 'nutritionix' as const;
  readonly name = 'Nutritionix';

  constructor() {
    super('nutritionix');
  }

  /**
   * Check if Nutritionix is configured and enabled
   */
  override isConfigured(): boolean {
    return isProviderEnabled('nutritionix');
  }

  /**
   * Get auth headers
   */
  private getHeaders(): Record<string, string> {
    const env = getEnv();
    return {
      'x-app-id': env.NUTRITIONIX_APP_ID ?? '',
      'x-app-key': env.NUTRITIONIX_APP_KEY ?? '',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get product by barcode (UPC)
   */
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const cacheKey = LRUCache.makeKey('nix:barcode', barcode);
    const cached = this.cache.get<Product>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value;
    }

    const url = `${API_URLS.nutritionix.base}/search/item?upc=${encodeURIComponent(barcode)}`;
    const data = await this.fetchWithResilience<NutritionixItemResponse>(url, 'all', {
      allowNotFound: true,
      init: { headers: this.getHeaders() },
    });

    const food = data?.foods?.[0];
    if (!food) return null;

    const product = mapNutritionixProduct(food);
    product.barcode = barcode;
    this.cache.set(cacheKey, product, 'product');
    return product;
  }

  /**
   * Search products (branded + common foods)
   */
  async searchProducts(
    filters: ProductSearchFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<ProductSummary>> {
    const { query } = filters;
    if (!this.isConfigured() || !query) {
      return emptyPage(pagination, ['nutritionix']);
    }

    const cacheKey = LRUCache.makeKey('nix:search', query, pagination.page, pagination.pageSize);
    const cached = this.cache.get<PaginatedResponse<ProductSummary>>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value;
    }

    const url = `${API_URLS.nutritionix.base}/search/instant?query=${encodeURIComponent(query)}`;
    const data = await this.fetchWithResilience<NutritionixSearchResponse>(url, 'all', {
      init: { headers: this.getHeaders() },
    });

    const allItems = [
      ...(data.branded ?? []).map((b) => mapNutritionixSearchResult(b, 'branded')),
      ...(data.common ?? []).map((c) => mapNutritionixSearchResult(c, 'common')),
    ];

    // Nutritionix has no server-side pagination for instant search
    const start = (pagination.page - 1) * pagination.pageSize;
    const result: PaginatedResponse<ProductSummary> = {
      items: allItems.slice(start, start + pagination.pageSize),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: allItems.length,
        totalPages: Math.ceil(allItems.length / pagination.pageSize),
        hasNext: start + pagination.pageSize < allItems.length,
        hasPrev: pagination.page > 1,
      },
      sources: ['nutritionix'],
    };

    this.cache.set(cacheKey, result, 'search');
    return result;
  }

  /**
   * Get nutrients for a natural language query ("2 eggs and a slice of toast")
   */
  async getNutrients(query: string): Promise<Product[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const data = await this.fetchWithResilience<NutritionixNutrientsResponse>(
      `${API_URLS.nutritionix.base}/natural/nutrients`,
      'all',
      { init: { method: 'POST', headers: this.getHeaders(), body: JSON.stringify({ query }) } },
    );
    return (data.foods ?? []).map(mapNutritionixProduct);
  }

  supports(feature: ProviderFeature): boolean {
    const supported: ProviderFeature[] = [
      'barcode_lookup',
      'text_search',
    ];
    return supported.includes(feature);
  }
}

// Singleton
let instance: NutritionixProvider | null = null;

export function getNutritionixProvider(): NutritionixProvider {
  if (!instance) {
    instance = new NutritionixProvider();
  }
  return instance;
}
