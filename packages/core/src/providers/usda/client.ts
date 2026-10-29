import { API_URLS } from '../../config/constants.js';
import { isProviderEnabled, getEnv } from '../../config/env.js';
import { BaseProvider, emptyPage, type ProviderFeature } from '../base.provider.js';
import type { Product, ProductSummary, ProductSearchFilters } from '../../types/product.types.js';
import type { PaginatedResponse, PaginationParams } from '../../types/common.types.js';
import { LRUCache } from '../../resilience/cache.js';
import { sameGtin } from '../../utils/barcode.js';
import type { USDASearchResponse, USDAFoodDetailsResponse } from './types.js';
import { mapUSDAProduct, mapUSDASearchResult } from './mapper.js';

const NOT_FOUND = Symbol('not-found');

/**
 * USDA FoodData Central API Client
 */
export class USDAProvider extends BaseProvider {
  readonly source = 'usda' as const;
  readonly name = 'USDA FoodData Central';

  constructor() {
    super('usda');
  }

  private get apiKey(): string | undefined {
    return getEnv().USDA_API_KEY;
  }

  /**
   * Check if USDA provider is configured and enabled
   */
  override isConfigured(): boolean {
    return isProviderEnabled('usda');
  }

  /**
   * Get product by FDC ID
   */
  async getProductByFdcId(fdcId: string | number): Promise<Product | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const cacheKey = LRUCache.makeKey('usda:product', String(fdcId));
    const cached = this.cache.get<Product>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value;
    }

    const url = new URL(`${API_URLS.usda.base}/food/${encodeURIComponent(String(fdcId))}`);
    url.searchParams.set('api_key', this.apiKey!);

    const data = await this.fetchWithResilience<USDAFoodDetailsResponse>(url.toString(), 'all', {
      allowNotFound: true,
    });
    if (!data) return null;

    const product = mapUSDAProduct(data);
    this.cache.set(cacheKey, product, 'product');
    return product;
  }

  /**
   * Get product by barcode (GTIN/UPC). USDA stores GTINs with varying
   * zero-padding, so matches ignore leading zeros.
   */
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const cacheKey = LRUCache.makeKey('usda:barcode', barcode);
    const cached = this.cache.get<Product | typeof NOT_FOUND>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value === NOT_FOUND ? null : cached.value;
    }

    const url = new URL(`${API_URLS.usda.base}/foods/search`);
    url.searchParams.set('api_key', this.apiKey!);
    url.searchParams.set('query', barcode.replace(/^0+/, ''));
    url.searchParams.set('dataType', 'Branded');
    url.searchParams.set('pageSize', '10');

    const data = await this.fetchWithResilience<USDASearchResponse>(url.toString(), 'all');
    const match = data.foods?.find((f) => f.gtinUpc && sameGtin(f.gtinUpc, barcode));

    if (!match) {
      this.cache.set(cacheKey, NOT_FOUND, 'notFound');
      return null;
    }

    const product = await this.getProductByFdcId(match.fdcId);
    if (product) {
      // Keep the barcode the caller asked for, so merging across sources works
      product.barcode = barcode;
      this.cache.set(cacheKey, product, 'product');
    }
    return product;
  }

  /**
   * Search products
   */
  async searchProducts(
    filters: ProductSearchFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<ProductSummary>> {
    if (!this.isConfigured() || !filters.query) {
      return emptyPage(pagination, ['usda']);
    }

    const { query, brand } = filters;
    const { page, pageSize } = pagination;

    const url = new URL(`${API_URLS.usda.base}/foods/search`);
    url.searchParams.set('api_key', this.apiKey!);
    url.searchParams.set('query', query);
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('pageNumber', String(page));

    if (brand) {
      url.searchParams.set('brandOwner', brand);
    }

    const cacheKey = LRUCache.makeKey('usda:search', query, brand, page, pageSize);
    const cached = this.cache.get<PaginatedResponse<ProductSummary>>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value;
    }

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
