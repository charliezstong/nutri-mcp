import { getOpenFoodFactsProvider } from '../providers/openfoodfacts/index.js';
import { getUSDAProvider } from '../providers/usda/index.js';
import { getNutritionixProvider } from '../providers/nutritionix/index.js';
import type { Product, ProductSummary, ProductSearchFilters } from '../types/product.types.js';
import type { PaginatedResponse, PaginationParams, DataSource } from '../types/common.types.js';
import { getLogger } from '../transport/logger.js';

const logger = getLogger().child('product-service');

/**
 * Aggregated Product Service
 * Combines data from multiple providers
 */
export class ProductService {
  private offProvider = getOpenFoodFactsProvider();
  private usdaProvider = getUSDAProvider();
  private nixProvider = getNutritionixProvider();

  /**
   * Get product by barcode from all available sources
   */
  async getByBarcode(barcode: string): Promise<Product | null> {
    logger.debug(`Getting product by barcode: ${barcode}`);

    // Try sources in priority order
    const providers = [
      { provider: this.offProvider, name: 'OFF' },
      { provider: this.usdaProvider, name: 'USDA' },
      { provider: this.nixProvider, name: 'Nutritionix' },
    ];

    for (const { provider, name } of providers) {
      if (!provider.isAvailable()) {
        logger.debug(`${name} provider unavailable, skipping`);
        continue;
      }

      try {
        const product = await provider.getProductByBarcode(barcode);
        if (product) {
          logger.debug(`Found product in ${name}`);
          return product;
        }
      } catch (error) {
        logger.warn(`${name} lookup failed for ${barcode}`, error);
      }
    }

    return null;
  }

  /**
   * Get product with data merged from multiple sources
   */
  async getByBarcodeEnriched(barcode: string): Promise<Product | null> {
    const results = await Promise.allSettled([
      this.offProvider.getProductByBarcode(barcode),
      this.usdaProvider.isConfigured() ? this.usdaProvider.getProductByBarcode(barcode) : Promise.resolve(null),
      this.nixProvider.isConfigured() ? this.nixProvider.getProductByBarcode(barcode) : Promise.resolve(null),
    ]);

    const products = results
      .filter((r): r is PromiseFulfilledResult<Product | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((p): p is Product => p !== null);

    if (products.length === 0) {
      return null;
    }

    // Merge products, preferring first source for basic info
    return this.mergeProducts(products);
  }

  /**
   * Search products across all sources
   */
  async search(
    filters: ProductSearchFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<ProductSummary>> {
    const results = await Promise.allSettled([
      this.offProvider.searchProducts(filters, pagination),
      this.usdaProvider.isConfigured()
        ? this.usdaProvider.searchProducts(filters, pagination)
        : Promise.resolve(null),
      this.nixProvider.isConfigured()
        ? this.nixProvider.searchProducts(filters, pagination)
        : Promise.resolve(null),
    ]);

    const successfulResults = results
      .filter((r): r is PromiseFulfilledResult<PaginatedResponse<ProductSummary> | null> =>
        r.status === 'fulfilled',
      )
      .map((r) => r.value)
      .filter((r): r is PaginatedResponse<ProductSummary> => r !== null);

    if (successfulResults.length === 0) {
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
        sources: [],
      };
    }

    // Combine results
    const allItems = successfulResults.flatMap((r) => r.items);
    const allSources = [...new Set(successfulResults.flatMap((r) => r.sources))] as DataSource[];

    // Deduplicate by barcode
    const seen = new Set<string>();
    const uniqueItems = allItems.filter((item) => {
      if (seen.has(item.barcode)) {
        return false;
      }
      seen.add(item.barcode);
      return true;
    });

    // Paginate combined results
    const start = 0;
    const paginatedItems = uniqueItems.slice(start, pagination.pageSize);

    return {
      items: paginatedItems,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: uniqueItems.length,
        totalPages: Math.ceil(uniqueItems.length / pagination.pageSize),
        hasNext: uniqueItems.length > pagination.pageSize,
        hasPrev: pagination.page > 1,
      },
      sources: allSources,
    };
  }

  /**
   * Merge products from multiple sources
   */
  private mergeProducts(products: Product[]): Product {
    if (products.length === 1) {
      return products[0]!;
    }

    const base = products[0]!;

    // Merge nutrients from all sources
    const allNutrients = products.flatMap((p) => p.nutrients);
    const nutrientMap = new Map<string, typeof allNutrients[0]>();

    for (const n of allNutrients) {
      const existing = nutrientMap.get(n.id);
      // Prefer USDA data for nutrients (more complete)
      if (!existing || n.source === 'usda') {
        nutrientMap.set(n.id, n);
      }
    }

    // Merge allergens
    const allAllergens = products.flatMap((p) => p.allergens);
    const allergenMap = new Map<string, typeof allAllergens[0]>();
    for (const a of allAllergens) {
      allergenMap.set(a.id, a);
    }

    return {
      ...base,
      nutrients: Array.from(nutrientMap.values()),
      allergens: Array.from(allergenMap.values()),
      sources: [...new Set(products.flatMap((p) => p.sources))] as DataSource[],
      dataQuality: {
        score: Math.max(...products.map((p) => p.dataQuality.score)),
        completeness: Math.max(...products.map((p) => p.dataQuality.completeness)),
        warnings: products.flatMap((p) => p.dataQuality.warnings),
      },
    };
  }
}

// Singleton
let instance: ProductService | null = null;

export function getProductService(): ProductService {
  if (!instance) {
    instance = new ProductService();
  }
  return instance;
}
