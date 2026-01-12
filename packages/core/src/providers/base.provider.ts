import type { Product, ProductSummary, ProductSearchFilters } from '../types/product.types.js';
import type { PaginatedResponse, PaginationParams, DataSource } from '../types/common.types.js';
import { getLogger } from '../transport/logger.js';
import type { Logger } from '../transport/logger.js';
import { getCircuitBreaker, type CircuitBreaker } from '../resilience/circuit-breaker.js';
import { getRateLimiter, type RateLimiter, RateLimitError } from '../resilience/rate-limiter.js';
import { getCache, type LRUCache } from '../resilience/cache.js';
import { withRetry } from '../resilience/retry.js';
import { TIMEOUTS } from '../config/constants.js';

/**
 * Base provider class with resilience patterns
 */
export abstract class BaseProvider {
  protected readonly logger: Logger;
  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly rateLimiter: RateLimiter;
  protected readonly cache: LRUCache;

  abstract readonly source: DataSource;
  abstract readonly name: string;

  constructor(providerName: 'openfoodfacts' | 'usda' | 'nutritionix') {
    this.logger = getLogger().child(providerName);
    this.circuitBreaker = getCircuitBreaker(providerName);
    this.rateLimiter = getRateLimiter();
    this.cache = getCache();
  }

  /**
   * Check if provider is available
   */
  isAvailable(): boolean {
    return this.circuitBreaker.getState() !== 'OPEN';
  }

  /**
   * Fetch with resilience patterns applied
   */
  protected async fetchWithResilience<T>(
    endpoint: string,
    rateLimitKey: string,
    options: RequestInit = {},
  ): Promise<T> {
    // Check circuit breaker
    if (!this.circuitBreaker.canRequest()) {
      throw new Error(`${this.name} circuit breaker is open`);
    }

    // Check rate limit
    const rateResult = this.rateLimiter.tryAcquire(
      this.source as 'openfoodfacts' | 'usda' | 'nutritionix',
      rateLimitKey as never,
    );

    if (!rateResult.allowed) {
      throw new RateLimitError(rateResult.retryAfterMs ?? 1000);
    }

    // Execute with retry
    try {
      const result = await withRetry(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          TIMEOUTS.default,
        );

        try {
          const response = await fetch(endpoint, {
            ...options,
            signal: controller.signal,
          });

          if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status: number };
            error.status = response.status;
            throw error;
          }

          return await response.json() as T;
        } finally {
          clearTimeout(timeout);
        }
      });

      this.circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      this.logger.error(`Request failed: ${endpoint}`, error);
      throw error;
    }
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
