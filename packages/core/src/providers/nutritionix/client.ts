import { API_URLS } from '../../config/constants.js';
import { getEnv } from '../../config/env.js';
import { BaseProvider, type ProviderFeature } from '../base.provider.js';
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
 * Nutritionix API Client
 */
export class NutritionixProvider extends BaseProvider {
  readonly source = 'nutritionix' as const;
  readonly name = 'Nutritionix';
  private appId: string | undefined;
  private appKey: string | undefined;

  constructor() {
    super('nutritionix');
    const env = getEnv();
    this.appId = env.NUTRITIONIX_APP_ID;
    this.appKey = env.NUTRITIONIX_APP_KEY;
  }

  /**
   * Check if Nutritionix is configured
   */
  isConfigured(): boolean {
    return !!this.appId && !!this.appKey;
  }

  /**
   * Get auth headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'x-app-id': this.appId!,
      'x-app-key': this.appKey!,
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

    const url = `${API_URLS.nutritionix.base}/search/item?upc=${barcode}`;

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as NutritionixItemResponse;

      if (!data.foods || data.foods.length === 0) {
        return null;
      }

      const product = mapNutritionixProduct(data.foods[0]!);
      this.cache.set(cacheKey, product, 'product');
      return product;
    } catch (error) {
      this.logger.error(`Failed to fetch Nutritionix product: ${barcode}`, error);
      return null;
    }
  }

  /**
   * Get product by nix_item_id
   */
  async getProductByNixId(nixItemId: string): Promise<Product | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const url = `${API_URLS.nutritionix.base}/search/item?nix_item_id=${nixItemId}`;

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as NutritionixItemResponse;

      if (!data.foods || data.foods.length === 0) {
        return null;
      }

      return mapNutritionixProduct(data.foods[0]!);
    } catch (error) {
      this.logger.error(`Failed to fetch Nutritionix product by ID: ${nixItemId}`, error);
      return null;
    }
  }

  /**
   * Search products
   */
  async searchProducts(
    filters: ProductSearchFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<ProductSummary>> {
    if (!this.isConfigured()) {
      return {
        items: [],
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        sources: ['nutritionix'],
      };
    }

    const { query } = filters;
    if (!query) {
      return {
        items: [],
        pagination: { ...pagination, totalItems: 0, totalPages: 0, hasNext: false, hasPrev: false },
        sources: ['nutritionix'],
      };
    }

    const url = `${API_URLS.nutritionix.base}/search/instant?query=${encodeURIComponent(query)}`;

    const cacheKey = LRUCache.makeKey('nix:search', url);
    const cached = this.cache.get<PaginatedResponse<ProductSummary>>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value;
    }

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as NutritionixSearchResponse;

      const allItems = [
        ...data.branded.map((b) => mapNutritionixSearchResult(b, 'branded')),
        ...data.common.map((c) => mapNutritionixSearchResult(c, 'common')),
      ];

      // Simple pagination (Nutritionix doesn't support server-side pagination well)
      const start = (pagination.page - 1) * pagination.pageSize;
      const items = allItems.slice(start, start + pagination.pageSize);

      const result: PaginatedResponse<ProductSummary> = {
        items,
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
    } catch (error) {
      this.logger.error('Nutritionix search failed', { query, error });
      throw error;
    }
  }

  /**
   * Get nutrients for natural language query
   */
  async getNutrients(query: string): Promise<Product[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const url = `${API_URLS.nutritionix.base}/natural/nutrients`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as NutritionixNutrientsResponse;
      return data.foods.map(mapNutritionixProduct);
    } catch (error) {
      this.logger.error('Nutritionix nutrients query failed', { query, error });
      return [];
    }
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
