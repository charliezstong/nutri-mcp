import { API_URLS, OFF_API_VERSION } from '../../config/constants.js';
import { getEnv } from '../../config/env.js';
import { BaseProvider, type ProviderFeature } from '../base.provider.js';
import type { Product, ProductSummary, ProductSearchFilters } from '../../types/product.types.js';
import type { PaginatedResponse, PaginationParams } from '../../types/common.types.js';
import { LRUCache } from '../../resilience/cache.js';
import { InvalidBarcodeError } from '../../errors/index.js';
import { validateBarcode } from '../../utils/barcode.js';
import { sanitizeSearchQuery } from '../../utils/sanitize.js';
import { toTagSlug } from '../../utils/text.js';
import { mapOFFProduct, mapOFFSearchResult } from './mapper.js';
import {
  OFF_PRODUCT_FIELDS,
  OFF_SEARCH_FIELDS,
  type OFFLegacySearchResponse,
  type OFFProductResponse,
  type OFFSearchResponse,
} from './types.js';

export type { OFFProduct } from './types.js';

const NOT_FOUND = Symbol('not-found');

/**
 * Open Food Facts API Client
 */
export class OpenFoodFactsProvider extends BaseProvider {
  readonly source = 'openfoodfacts' as const;
  readonly name = 'Open Food Facts';

  constructor() {
    super('openfoodfacts');
  }

  private get baseUrl(): string {
    return getEnv().OFF_BASE_URL.replace(/\/+$/, '');
  }

  /**
   * Get product by barcode. Returns null when the product does not exist.
   */
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const cleaned = barcode.trim();
    const validation = validateBarcode(cleaned);
    if (!/^\d{6,14}$/.test(cleaned)) {
      throw new InvalidBarcodeError(barcode, validation.error ?? 'Expected 6-14 digits');
    }
    if (!validation.valid) {
      // Store-internal codes often fail check-digit validation but exist in OFF
      this.logger.debug(`Barcode ${cleaned} failed validation (${validation.error}); querying anyway`);
    }

    const cacheKey = LRUCache.makeKey('off:product', cleaned);
    const cached = this.cache.get<Product | typeof NOT_FOUND>(cacheKey);
    if (cached && !cached.stale) {
      this.logger.debug(`Cache hit for barcode: ${cleaned}`);
      return cached.value === NOT_FOUND ? null : cached.value;
    }

    const url = new URL(`${this.baseUrl}/api/${OFF_API_VERSION}/product/${cleaned}`);
    url.searchParams.set('fields', OFF_PRODUCT_FIELDS);

    const data = await this.fetchWithResilience<OFFProductResponse>(url.toString(), 'product', {
      allowNotFound: true,
    });

    if (!data || data.status === 'failure' || !data.product) {
      this.logger.debug(`Product not found: ${cleaned}`);
      this.cache.set(cacheKey, NOT_FOUND, 'notFound');
      return null;
    }

    const product = mapOFFProduct({ ...data.product, code: data.product.code ?? data.code ?? cleaned });
    this.cache.set(cacheKey, product, 'product');
    return product;
  }

  /**
   * Search products with search-a-licious (Elasticsearch-based search),
   * falling back to the legacy cgi/search.pl endpoint.
   */
  async searchProducts(
    filters: ProductSearchFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<ProductSummary>> {
    const q = buildSearchQuery(filters);
    const cacheKey = LRUCache.makeKey('off:search', q, pagination.page, pagination.pageSize);
    const cached = this.cache.get<PaginatedResponse<ProductSummary>>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value;
    }

    let result: PaginatedResponse<ProductSummary>;
    try {
      result = await this.searchModern(q, pagination);
    } catch (error) {
      this.logger.warn('search-a-licious failed, falling back to legacy search', error);
      result = await this.searchLegacy(filters, pagination);
    }

    this.cache.set(cacheKey, result, 'search');
    return result;
  }

  private async searchModern(
    q: string,
    { page, pageSize }: PaginationParams,
  ): Promise<PaginatedResponse<ProductSummary>> {
    const url = new URL(API_URLS.openfoodfacts.search);
    if (q) url.searchParams.set('q', q);
    url.searchParams.set('page', String(page));
    url.searchParams.set('page_size', String(pageSize));
    url.searchParams.set('fields', OFF_SEARCH_FIELDS);

    const data = await this.fetchWithResilience<OFFSearchResponse>(url.toString(), 'search');
    const total = data.count ?? 0;

    return {
      items: (data.hits ?? []).filter((p) => p.code).map(mapOFFSearchResult),
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: data.page_count ?? Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrev: page > 1,
      },
      sources: ['openfoodfacts'],
    };
  }

  private async searchLegacy(
    { query, brand, category }: ProductSearchFilters,
    { page, pageSize }: PaginationParams,
  ): Promise<PaginatedResponse<ProductSummary>> {
    const url = new URL(`${this.baseUrl}${API_URLS.openfoodfacts.legacySearchPath}`);

    if (query) {
      url.searchParams.set('search_terms', sanitizeSearchQuery(query));
    }
    let tagIndex = 0;
    if (brand) {
      url.searchParams.set(`tagtype_${tagIndex}`, 'brands');
      url.searchParams.set(`tag_contains_${tagIndex}`, 'contains');
      url.searchParams.set(`tag_${tagIndex}`, toTagSlug(brand));
      tagIndex++;
    }
    if (category) {
      url.searchParams.set(`tagtype_${tagIndex}`, 'categories');
      url.searchParams.set(`tag_contains_${tagIndex}`, 'contains');
      url.searchParams.set(`tag_${tagIndex}`, category.replace(/^[a-z]{2}:/, ''));
    }

    url.searchParams.set('page', page.toString());
    url.searchParams.set('page_size', pageSize.toString());
    url.searchParams.set('fields', OFF_SEARCH_FIELDS);
    url.searchParams.set('json', '1');

    const data = await this.fetchWithResilience<OFFLegacySearchResponse>(url.toString(), 'search');
    const total = data.count || 0;

    return {
      items: (data.products || []).filter((p) => p.code).map(mapOFFSearchResult),
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrev: page > 1,
      },
      sources: ['openfoodfacts'],
    };
  }

  /**
   * Check supported features
   */
  supports(feature: ProviderFeature): boolean {
    const supported: ProviderFeature[] = [
      'barcode_lookup',
      'text_search',
      'category_search',
      'brand_search',
      'nutriscore',
      'ecoscore',
      'nova_group',
      'prices',
      'images',
      'ai_insights',
    ];
    return supported.includes(feature);
  }
}

/**
 * Build a search-a-licious (Lucene-like) query from filters.
 */
export function buildSearchQuery({ query, brand, category, nutriScoreMax, novaMax }: ProductSearchFilters): string {
  const parts: string[] = [];
  const quote = (value: string): string => `"${value.replace(/["\\]/g, '')}"`;

  if (query) {
    // Strip Lucene operators from free text so user input is treated as words
    const text = sanitizeSearchQuery(query).replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) parts.push(text);
  }
  if (brand) {
    parts.push(`brands_tags:${quote(toTagSlug(brand))}`);
  }
  if (category) {
    const tag = /^[a-z]{2}:/.test(category) ? category.toLowerCase() : `en:${toTagSlug(category)}`;
    parts.push(`categories_tags:${quote(tag)}`);
  }
  if (nutriScoreMax) {
    const grades = ['a', 'b', 'c', 'd', 'e'];
    const allowed = grades.slice(0, grades.indexOf(nutriScoreMax.toLowerCase()) + 1);
    parts.push(`nutriscore_grade:(${allowed.join(' OR ')})`);
  }
  if (novaMax) {
    parts.push(`nova_group:[1 TO ${novaMax}]`);
  }

  return parts.join(' ');
}

// Singleton instance
let instance: OpenFoodFactsProvider | null = null;

export function getOpenFoodFactsProvider(): OpenFoodFactsProvider {
  if (!instance) {
    instance = new OpenFoodFactsProvider();
  }
  return instance;
}
