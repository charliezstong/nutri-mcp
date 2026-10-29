import { getOpenFoodFactsProvider } from '../providers/openfoodfacts/index.js';
import { getUSDAProvider } from '../providers/usda/index.js';
import { getNutritionixProvider } from '../providers/nutritionix/index.js';
import type { BaseProvider } from '../providers/base.provider.js';
import type { Product, ProductSummary, ProductSearchFilters, Allergen } from '../types/product.types.js';
import type { PaginatedResponse, PaginationParams, DataSource } from '../types/common.types.js';
import type { Nutrient } from '../types/nutrition.types.js';
import { ProductNotFoundError } from '../errors/index.js';
import { getLogger } from '../transport/logger.js';

const logger = getLogger().child('product-service');

/**
 * Aggregated Product Service
 * Combines data from Open Food Facts, USDA FoodData Central and Nutritionix
 */
export class ProductService {
  private offProvider = getOpenFoodFactsProvider();
  private usdaProvider = getUSDAProvider();
  private nixProvider = getNutritionixProvider();

  private get providers(): BaseProvider[] {
    return [this.offProvider, this.usdaProvider, this.nixProvider];
  }

  /**
   * Names of the product data sources currently enabled
   */
  enabledSources(): DataSource[] {
    return this.providers.filter((p) => p.isConfigured()).map((p) => p.source);
  }

  /**
   * Get a product by barcode, merging every configured source.
   * Returns null only when no source knows the barcode; throws when the
   * product could not be looked up because the sources failed.
   */
  async getByBarcode(barcode: string): Promise<Product | null> {
    const active = this.providers.filter((p) => p.isConfigured());
    const results = await Promise.allSettled(active.map((p) => p.getProductByBarcode(barcode)));

    const products: Product[] = [];
    const errors: unknown[] = [];

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        if (result.value) products.push(result.value);
      } else {
        logger.warn(`${active[i]!.name} lookup failed for ${barcode}`, result.reason);
        errors.push(result.reason);
      }
    });

    if (products.length > 0) {
      return mergeProducts(products);
    }

    // Every source failed (none answered "not found"): surface the failure
    if (errors.length > 0 && errors.length === active.length) {
      throw errors[0];
    }

    return null;
  }

  /**
   * Like getByBarcode, but throws ProductNotFoundError when missing.
   */
  async requireByBarcode(barcode: string): Promise<Product> {
    const product = await this.getByBarcode(barcode);
    if (!product) throw new ProductNotFoundError(barcode);
    return product;
  }

  /**
   * Fetch several products; unknown barcodes are reported, not fatal.
   */
  async getMany(barcodes: string[]): Promise<{ found: Product[]; missing: string[] }> {
    const unique = [...new Set(barcodes.map((b) => b.trim()))];
    const products = await Promise.all(unique.map((b) => this.getByBarcode(b)));
    return {
      found: products.filter((p): p is Product => p !== null),
      missing: unique.filter((_, i) => products[i] === null),
    };
  }

  /**
   * Search products across sources (Open Food Facts first, then USDA and
   * Nutritionix when configured). Results are deduplicated by barcode.
   */
  async search(
    filters: ProductSearchFilters,
    pagination: PaginationParams,
    sources?: DataSource[],
  ): Promise<PaginatedResponse<ProductSummary>> {
    const active = this.providers.filter(
      (p) => p.isConfigured() && (!sources || sources.includes(p.source)),
    );
    const results = await Promise.allSettled(active.map((p) => p.searchProducts(filters, pagination)));

    const successful = results
      .map((r, i) => {
        if (r.status === 'rejected') {
          logger.warn(`${active[i]!.name} search failed`, r.reason);
          return null;
        }
        return r.value;
      })
      .filter((r): r is PaginatedResponse<ProductSummary> => r !== null);

    if (successful.length === 0) {
      const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (firstError) throw firstError.reason;
    }

    const seen = new Set<string>();
    const items = successful
      .flatMap((r) => r.items)
      .filter((item) => {
        const key = item.barcode.replace(/^0+/, '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const totalItems = successful.reduce((sum, r) => sum + r.pagination.totalItems, 0);
    const totalPages = Math.max(0, ...successful.map((r) => r.pagination.totalPages));

    return {
      items,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems,
        totalPages,
        hasNext: successful.some((r) => r.pagination.hasNext),
        hasPrev: pagination.page > 1,
      },
      sources: [...new Set(successful.flatMap((r) => r.sources))],
    };
  }
}

/**
 * Merge products from multiple sources. The first product (Open Food Facts
 * when available) provides the base record; other sources only fill gaps.
 */
export function mergeProducts(products: Product[]): Product {
  if (products.length === 1) {
    return products[0]!;
  }

  const base = products[0]!;

  const nutrientMap = new Map<string, Nutrient>();
  for (const n of products.flatMap((p) => p.nutrients)) {
    if (!nutrientMap.has(n.id)) nutrientMap.set(n.id, n);
  }

  const unionAllergens = (lists: Allergen[][]): Allergen[] => {
    const map = new Map<string, Allergen>();
    for (const a of lists.flat()) if (!map.has(a.id)) map.set(a.id, a);
    return [...map.values()];
  };

  const firstDefined = <K extends keyof Product>(key: K): Product[K] =>
    products.map((p) => p[key]).find((v) => v !== undefined && v !== '') as Product[K];

  return {
    ...base,
    fdcId: firstDefined('fdcId'),
    nixItemId: firstDefined('nixItemId'),
    brand: firstDefined('brand'),
    quantity: firstDefined('quantity'),
    servingSize: firstDefined('servingSize'),
    ingredientsText: firstDefined('ingredientsText'),
    categories: products.find((p) => p.categories.length > 0)?.categories ?? [],
    nutrients: Array.from(nutrientMap.values()),
    allergens: unionAllergens(products.map((p) => p.allergens)),
    traces: unionAllergens(products.map((p) => p.traces)),
    images: base.images?.front ? base.images : firstDefined('images'),
    sources: [...new Set(products.flatMap((p) => p.sources))] as DataSource[],
    dataQuality: {
      score: Math.max(...products.map((p) => p.dataQuality.score)),
      completeness: Math.max(...products.map((p) => p.dataQuality.completeness)),
      warnings: products.flatMap((p) => p.dataQuality.warnings),
    },
  };
}

// Singleton
let instance: ProductService | null = null;

export function getProductService(): ProductService {
  if (!instance) {
    instance = new ProductService();
  }
  return instance;
}
