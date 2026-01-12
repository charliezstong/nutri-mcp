import { API_URLS } from '../config/constants.js';
import type { Price, PriceSearchFilters, PriceStats, PriceComparison } from '../types/price.types.js';
import type { Product } from '../types/product.types.js';
import { getCache, LRUCache } from '../resilience/cache.js';
import { getLogger } from '../transport/logger.js';

const logger = getLogger().child('price-service');

interface OFFPriceResponse {
  items: OFFPriceItem[];
  total: number;
  page: number;
  size: number;
}

interface OFFPriceItem {
  product_code: string;
  price: number;
  currency: string;
  location_osm_id?: number;
  location_osm_type?: string;
  date: string;
  proof_id?: number;
}

/**
 * Price Service - Open Food Facts Prices API
 */
export class PriceService {
  private cache = getCache();

  /**
   * Get prices for a product
   */
  async getProductPrices(barcode: string): Promise<Price[]> {
    const cacheKey = LRUCache.makeKey('price:product', barcode);
    const cached = this.cache.get<Price[]>(cacheKey);
    if (cached && !cached.stale) {
      return cached.value;
    }

    const url = `${API_URLS.openfoodfacts.prices}/prices?product_code=${barcode}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as OFFPriceResponse;
      const prices = data.items.map((item) => this.mapPrice(item));

      this.cache.set(cacheKey, prices, 'price');
      return prices;
    } catch (error) {
      logger.error(`Failed to fetch prices for ${barcode}`, error);
      return [];
    }
  }

  /**
   * Search prices with filters
   */
  async searchPrices(filters: PriceSearchFilters): Promise<Price[]> {
    const url = new URL(`${API_URLS.openfoodfacts.prices}/prices`);

    if (filters.barcode) {
      url.searchParams.set('product_code', filters.barcode);
    }
    if (filters.country) {
      url.searchParams.set('location_country', filters.country);
    }
    if (filters.currency) {
      url.searchParams.set('currency', filters.currency);
    }

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as OFFPriceResponse;
      return data.items.map((item) => this.mapPrice(item));
    } catch (error) {
      logger.error('Price search failed', { filters, error });
      return [];
    }
  }

  /**
   * Get recent prices
   */
  async getRecentPrices(limit = 20): Promise<Price[]> {
    const url = `${API_URLS.openfoodfacts.prices}/prices?order_by=-date&size=${limit}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as OFFPriceResponse;
      return data.items.map((item) => this.mapPrice(item));
    } catch (error) {
      logger.error('Failed to fetch recent prices', error);
      return [];
    }
  }

  /**
   * Get price statistics for a product
   */
  async getPriceStats(barcode: string): Promise<PriceStats | null> {
    const prices = await this.getProductPrices(barcode);

    if (prices.length === 0) {
      return null;
    }

    const priceValues = prices.map((p) => p.price);
    const currency = prices[0]?.currency ?? 'USD';

    return {
      barcode,
      currency,
      current: {
        min: Math.min(...priceValues),
        max: Math.max(...priceValues),
        avg: priceValues.reduce((a, b) => a + b, 0) / priceValues.length,
        median: this.median(priceValues),
      },
      priceCount: prices.length,
      lastUpdated: new Date(),
    };
  }

  /**
   * Find best price
   */
  async findBestPrice(barcode: string): Promise<Price | null> {
    const prices = await this.getProductPrices(barcode);

    if (prices.length === 0) {
      return null;
    }

    return prices.reduce((best, current) =>
      current.price < best.price ? current : best,
    );
  }

  /**
   * Compare prices between products
   */
  async comparePrices(products: Product[]): Promise<PriceComparison | null> {
    const priceData = await Promise.all(
      products.map(async (p) => {
        const prices = await this.getProductPrices(p.barcode);
        const bestPrice = prices.length > 0
          ? prices.reduce((best, curr) => curr.price < best.price ? curr : best)
          : null;

        return {
          barcode: p.barcode,
          name: p.name,
          price: bestPrice,
          pricePerUnit: bestPrice && p.quantity
            ? this.calculatePricePerUnit(bestPrice.price, p.quantity)
            : undefined,
        };
      }),
    );

    const withPrices = priceData.filter((d) => d.price !== null);

    if (withPrices.length === 0) {
      return null;
    }

    const cheapest = withPrices.reduce((best, curr) =>
      curr.price!.price < best.price!.price ? curr : best,
    );

    return {
      products: priceData as PriceComparison['products'],
      cheapest: cheapest.barcode,
      currency: withPrices[0]?.price?.currency ?? 'USD',
    };
  }

  /**
   * Calculate price per unit (per 100g/100ml)
   */
  private calculatePricePerUnit(price: number, quantity: string): number | undefined {
    const match = quantity.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|lb)/i);
    if (!match) return undefined;

    const value = parseFloat(match[1]!);
    const unit = match[2]!.toLowerCase();

    let grams: number;
    switch (unit) {
      case 'kg':
      case 'l':
        grams = value * 1000;
        break;
      case 'oz':
        grams = value * 28.35;
        break;
      case 'lb':
        grams = value * 453.59;
        break;
      default:
        grams = value;
    }

    return (price / grams) * 100; // Price per 100g/100ml
  }

  private mapPrice(item: OFFPriceItem): Price {
    return {
      id: `${item.product_code}-${item.date}`,
      productBarcode: item.product_code,
      price: item.price,
      currency: item.currency,
      date: new Date(item.date),
      source: 'openfoodfacts',
    };
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]!
      : (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
}

// Singleton
let instance: PriceService | null = null;

export function getPriceService(): PriceService {
  if (!instance) {
    instance = new PriceService();
  }
  return instance;
}
