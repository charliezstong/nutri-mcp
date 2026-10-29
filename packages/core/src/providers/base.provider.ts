import type { Product, ProductSummary, ProductSearchFilters } from '../types/product.types.js';
import type { PaginatedResponse, PaginationParams, DataSource } from '../types/common.types.js';
import { getLogger } from '../transport/logger.js';
import type { Logger } from '../transport/logger.js';
import { getCircuitBreaker, type CircuitBreaker } from '../resilience/circuit-breaker.js';
import { getCache, type LRUCache } from '../resilience/cache.js';
import { fetchJson, type FetchJsonOptions } from '../resilience/http.js';

type ProductProviderName = 'openfoodfacts' | 'usda' | 'nutritionix';

/**
 * Base provider class with resilience patterns
 */
export abstract class BaseProvider {
  protected readonly logger: Logger;
  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly cache: LRUCache;
  private readonly providerName: ProductProviderName;

  abstract readonly source: DataSource;
  abstract readonly name: string;

  constructor(providerName: ProductProviderName) {
    this.providerName = providerName;
    this.logger = getLogger().child(providerName);
    this.circuitBreaker = getCircuitBreaker(providerName);
    this.cache = getCache();
  }

  /**
   * Check if provider is available (configured and circuit not open)
   */
  isAvailable(): boolean {
    return this.isConfigured() && this.circuitBreaker.getState() !== 'OPEN';
  }

  /**
   * Whether the provider has the credentials it needs.
   */
  isConfigured(): boolean {
    return true;
  }

  /**
   * Fetch JSON with circuit breaker, rate limiting, timeout and retries.
   */
  protected fetchWithResilience<T>(
    endpoint: string,
    rateLimitKey: string,
    options: Omit<FetchJsonOptions, 'provider' | 'endpoint'> & { allowNotFound: true },
  ): Promise<T | null>;
  protected fetchWithResilience<T>(
    endpoint: string,
    rateLimitKey: string,
    options?: Omit<FetchJsonOptions, 'provider' | 'endpoint'>,
  ): Promise<T>;
  protected fetchWithResilience<T>(
    endpoint: string,
    rateLimitKey: string,
    options: Omit<FetchJsonOptions, 'provider' | 'endpoint'> = {},
  ): Promise<T | null> {
    return fetchJson<T>(endpoint, {
      ...options,
      provider: this.providerName,
      endpoint: rateLimitKey,
    });
  }

  /**
   * Get product by barcode
   */
  abstract getProductByBarcode(barcode: string): Promise<Product | null>;

  /**
   * Search products
   */
  abstract searchProducts(
    filters: ProductSearchFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<ProductSummary>>;

  /**
   * Check if provider supports a feature
   */
  abstract supports(feature: ProviderFeature): boolean;
}

export type ProviderFeature =
  | 'barcode_lookup'
  | 'text_search'
  | 'category_search'
  | 'brand_search'
  | 'nutriscore'
  | 'ecoscore'
  | 'nova_group'
  | 'prices'
  | 'images'
  | 'ai_insights';

/**
 * Empty paginated response helper
 */
export function emptyPage<T>(pagination: PaginationParams, sources: DataSource[]): PaginatedResponse<T> {
  return {
    items: [],
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: pagination.page > 1,
    },
    sources,
  };
}
