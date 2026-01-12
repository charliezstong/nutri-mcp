import { API_URLS } from '../../config/constants.js';
import { getEnv } from '../../config/env.js';
import { BaseProvider, type ProviderFeature } from '../base.provider.js';
import type { Product, ProductSummary, ProductSearchFilters } from '../../types/product.types.js';
import type { PaginatedResponse, PaginationParams } from '../../types/common.types.js';
import { LRUCache } from '../../resilience/cache.js';
import type {
  USDASearchResponse,
  USDAFoodDetailsResponse,
  USDASearchParams,
} from './types.js';
import { mapUSDAProduct, mapUSDASearchResult } from './mapper.js';

/**
 * USDA FoodData Central API Client
 */
export class USDAProvider extends BaseProvider {
  readonly source = 'usda' as const;
  readonly name = 'USDA FoodData Central';
  private apiKey: string | undefined;

  constructor() {
    super('usda');
    this.apiKey = getEnv().USDA_API_KEY;
  }

  /**
   * Check if USDA provider is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get product by FDC ID
   */
  async getProductByFdcId(fdcId: string | number): Promise<Product | null> {
    if (!this.isConfigured()) {
      this.logger.warn('USDA API key not configured');
      return null;
    }

    const cacheKey = LRUCache.makeKey('usda:product', String(fdcId));
    const cached = this.cache.get<Product>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value;
    }

    const url = `${API_URLS.usda.base}/food/${fdcId}?api_key=${this.apiKey}`;

    try {
      const data = await this.fetchWithResilience<USDAFoodDetailsResponse>(url, 'all');
      const product = mapUSDAProduct(data);
      this.cache.set(cacheKey, product, 'product');
      return product;
    } catch (error) {
      this.logger.error(`Failed to fetch USDA product: ${fdcId}`, error);
      return null;
    }
  }

  /**
   * Get product by barcode (GTIN/UPC)
   */
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    if (!this.isConfigured()) {
      return null;
    }

    // Search by GTIN/UPC
    const cacheKey = LRUCache.makeKey('usda:barcode', barcode);
    const cached = this.cache.get<Product>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value;
    }

    const searchParams: USDASearchParams = {
      query: barcode,
      dataType: ['Branded'],
      pageSize: 1,
    };

    const url = new URL(`${API_URLS.usda.base}/foods/search`);
    url.searchParams.set('api_key', this.apiKey!);
    url.searchParams.set('query', searchParams.query);
    url.searchParams.set('dataType', 'Branded');
    url.searchParams.set('pageSize', '1');

    try {
      const data = await this.fetchWithResilience<USDASearchResponse>(url.toString(), 'all');

      if (!data.foods || data.foods.length === 0) {
        return null;
      }

      // Find exact barcode match
      const match = data.foods.find((f) => f.gtinUpc === barcode);
      if (!match) {
        return null;
      }

      // Get full details
      const product = await this.getProductByFdcId(match.fdcId);
      if (product) {
        this.cache.set(cacheKey, product, 'product');
      }
      return product;
    } catch (error) {
      this.logger.error(`Failed to search USDA by barcode: ${barcode}`, error);
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
        sources: ['usda'],
      };
    }

    const { query, brand } = filters;
    const { page, pageSize } = pagination;

    const url = new URL(`${API_URLS.usda.base}/foods/search`);
    url.searchParams.set('api_key', this.apiKey!);
    url.searchParams.set('query', query || '*');
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('pageNumber', String(page));

    if (brand) {
      url.searchParams.set('brandOwner', brand);
    }

    const cacheKey = LRUCache.makeKey('usda:search', url.toString());
    const cached = this.cache.get<PaginatedResponse<ProductSummary>>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value;
    }

    try {
      const data = await this.fetchWithResilience<USDASearchResponse>(url.toString(), 'all');

      const result: PaginatedResponse<ProductSummary> = {
        items: (data.foods || []).map(mapUSDASearchResult),
        pagination: {
          page,
          pageSize,
          totalItems: data.totalHits,
          totalPages: data.totalPages,
          hasNext: page < data.totalPages,
          hasPrev: page > 1,
        },
        sources: ['usda'],
      };

      this.cache.set(cacheKey, result, 'search');
      return result;
    } catch (error) {
      this.logger.error('USDA search failed', { filters, error });
      throw error;
    }
  }

  /**
   * Get multiple products by FDC IDs
   */
  async getProductsByFdcIds(fdcIds: (string | number)[]): Promise<Product[]> {
    if (!this.isConfigured() || fdcIds.length === 0) {
      return [];
    }

    const url = `${API_URLS.usda.base}/foods?api_key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fdcIds: fdcIds.map(Number) }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as USDAFoodDetailsResponse[];
      return data.map(mapUSDAProduct);
    } catch (error) {
      this.logger.error('Failed to fetch multiple USDA products', error);
      return [];
    }
  }

  supports(feature: ProviderFeature): boolean {
    const supported: ProviderFeature[] = [
      'barcode_lookup',
      'text_search',
      'brand_search',
    ];
    return supported.includes(feature);
  }
}

// Singleton
let instance: USDAProvider | null = null;

export function getUSDAProvider(): USDAProvider {
  if (!instance) {
    instance = new USDAProvider();
  }
  return instance;
}
