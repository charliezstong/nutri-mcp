import { API_URLS } from '../../config/constants.js';
import { BaseProvider, type ProviderFeature } from '../base.provider.js';
import type { Product, ProductSummary, ProductSearchFilters } from '../../types/product.types.js';
import type { PaginatedResponse, PaginationParams } from '../../types/common.types.js';
import { LRUCache } from '../../resilience/cache.js';
import { validateBarcode } from '../../utils/barcode.js';
import { sanitizeSearchQuery, escapeLuceneQuery } from '../../utils/sanitize.js';
import { mapOFFProduct, mapOFFSearchResult } from './mapper.js';

/**
 * Open Food Facts API Client
 */
export class OpenFoodFactsProvider extends BaseProvider {
  readonly source = 'openfoodfacts' as const;
  readonly name = 'Open Food Facts';

  constructor() {
    super('openfoodfacts');
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode: string): Promise<Product | null> {
    // Validate barcode
    const validation = validateBarcode(barcode);
    if (!validation.valid) {
      this.logger.warn(`Invalid barcode: ${barcode}`, { error: validation.error });
      return null;
    }

    // Check cache
    const cacheKey = LRUCache.makeKey('off:product', barcode);
    const cached = this.cache.get<Product>(cacheKey);
    if (cached && !cached.stale) {
      this.logger.debug(`Cache hit for barcode: ${barcode}`);
      return cached.value;
    }

    // Fetch from API
    const url = `${API_URLS.openfoodfacts.product}/product/${barcode}`;

    try {
      const data = await this.fetchWithResilience<OFFProductResponse>(
        url,
        'product',
      );

      if (data.status !== 1 || !data.product) {
        this.logger.debug(`Product not found: ${barcode}`);
        return null;
      }

      const product = mapOFFProduct(data.product);

      // Cache result
      this.cache.set(cacheKey, product, 'product');

      return product;
    } catch (error) {
      this.logger.error(`Failed to fetch product: ${barcode}`, error);
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(
    filters: ProductSearchFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<ProductSummary>> {
    const { query, brand, category } = filters;
    const { page, pageSize } = pagination;

    // Build search URL
    const url = new URL(`${API_URLS.openfoodfacts.legacySearch}`);

    if (query) {
      url.searchParams.set('search_terms', sanitizeSearchQuery(query));
    }
    if (brand) {
      url.searchParams.set('tagtype_0', 'brands');
      url.searchParams.set('tag_contains_0', 'contains');
      url.searchParams.set('tag_0', escapeLuceneQuery(brand));
    }
    if (category) {
      url.searchParams.set('tagtype_1', 'categories');
      url.searchParams.set('tag_contains_1', 'contains');
      url.searchParams.set('tag_1', escapeLuceneQuery(category));
    }

    url.searchParams.set('page', page.toString());
    url.searchParams.set('page_size', pageSize.toString());
    url.searchParams.set('json', '1');

    // Check cache
    const cacheKey = LRUCache.makeKey('off:search', url.toString());
    const cached = this.cache.get<PaginatedResponse<ProductSummary>>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value;
    }

    try {
      const data = await this.fetchWithResilience<OFFSearchResponse>(
        url.toString(),
        'search',
      );

      const result: PaginatedResponse<ProductSummary> = {
        items: (data.products || []).map(mapOFFSearchResult),
        pagination: {
          page,
          pageSize,
          totalItems: data.count || 0,
          totalPages: Math.ceil((data.count || 0) / pageSize),
          hasNext: page * pageSize < (data.count || 0),
          hasPrev: page > 1,
        },
        sources: ['openfoodfacts'],
      };

      // Cache result
      this.cache.set(cacheKey, result, 'search');

      return result;
    } catch (error) {
      this.logger.error('Search failed', { filters, error });
      throw error;
    }
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

// Open Food Facts API response types
interface OFFProductResponse {
  status: number;
  status_verbose: string;
  product?: OFFProduct;
}

interface OFFSearchResponse {
  count: number;
  page: number;
  page_size: number;
  products: OFFProduct[];
}

// Raw Open Food Facts product (subset of fields)
export interface OFFProduct {
  code: string;
  product_name?: string;
  brands?: string;
  generic_name?: string;
  categories?: string;
  categories_tags?: string[];
  labels?: string;
  labels_tags?: string[];
  quantity?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string>;
  nutriscore_grade?: string;
  nutriscore_score?: number;
  ecoscore_grade?: string;
  ecoscore_score?: number;
  nova_group?: number;
  ingredients_text?: string;
  allergens?: string;
  allergens_tags?: string[];
  traces?: string;
  traces_tags?: string[];
  additives_tags?: string[];
  countries?: string;
  countries_tags?: string[];
  packaging?: string;
  origins?: string;
  image_url?: string;
  image_front_url?: string;
  image_nutrition_url?: string;
  image_ingredients_url?: string;
  last_modified_t?: number;
  completeness?: number;
}

// Singleton instance
let instance: OpenFoodFactsProvider | null = null;

export function getOpenFoodFactsProvider(): OpenFoodFactsProvider {
  if (!instance) {
    instance = new OpenFoodFactsProvider();
  }
  return instance;
}
