import { API_URLS } from '../config/constants.js';
import type {
  Price,
  PriceSearchFilters,
  PriceStats,
  CurrencyPriceStats,
  PriceComparison,
  PriceHistoryPoint,
} from '../types/price.types.js';
import type { Product } from '../types/product.types.js';
import { getCache, LRUCache } from '../resilience/cache.js';
import { fetchJson } from '../resilience/http.js';
import { round } from '../utils/text.js';

interface OpenPricesResponse {
  items: OpenPricesItem[];
  total: number;
  page: number;
  size: number;
  pages?: number;
}

interface OpenPricesItem {
  id: number;
  product_code: string | null;
  product_name?: string | null;
  product?: { product_name?: string | null } | null;
  price: number;
  currency: string;
  price_is_discounted?: boolean;
  price_without_discount?: number | null;
  discount_type?: string | null;
  date: string;
  location_id?: number | null;
  location?: {
    id: number;
    osm_name?: string | null;
    osm_brand?: string | null;
    osm_address_city?: string | null;
    osm_address_postcode?: string | null;
    osm_address_country?: string | null;
    osm_address_country_code?: string | null;
    osm_lat?: number | null;
    osm_lon?: number | null;
  } | null;
  proof?: { type?: string | null } | null;
}

const MAX_PAGE_SIZE = 100;

/**
 * Price Service - Open Prices API (prices.openfoodfacts.org)
 */
export class PriceService {
  private cache = getCache();

  /**
   * Search prices, newest first. Country is filtered client-side because the
   * Open Prices API has no country filter.
   */
  async searchPrices(filters: PriceSearchFilters): Promise<Price[]> {
    const limit = Math.min(filters.limit ?? 50, MAX_PAGE_SIZE);
    const url = new URL(`${API_URLS.openfoodfacts.prices}/prices`);
    url.searchParams.set('order_by', '-date');
    url.searchParams.set('size', String(filters.country ? MAX_PAGE_SIZE : limit));

    if (filters.barcode) url.searchParams.set('product_code', filters.barcode);
    if (filters.currency) url.searchParams.set('currency', filters.currency.toUpperCase());
    if (filters.discountedOnly) url.searchParams.set('price_is_discounted', 'true');
    if (filters.dateFrom) url.searchParams.set('date__gte', filters.dateFrom);

    const cacheKey = LRUCache.makeKey('prices', url.toString());
    let prices = this.cache.get<Price[]>(cacheKey)?.value;

    if (!prices) {
      const data = await fetchJson<OpenPricesResponse>(url.toString(), { provider: 'openprices' });
      prices = (data.items ?? [])
        .filter((item) => item.product_code && typeof item.price === 'number')
        .map(mapPrice);
      this.cache.set(cacheKey, prices, 'price');
    }

    if (filters.country) {
      const country = filters.country.toUpperCase();
      prices = prices.filter((p) => p.location?.countryCode?.toUpperCase() === country);
    }

    return prices.slice(0, limit);
  }

  /**
   * Get recent prices for a product (newest first)
   */
  getProductPrices(barcode: string, filters: Omit<PriceSearchFilters, 'barcode'> = {}): Promise<Price[]> {
    return this.searchPrices({ ...filters, barcode, limit: filters.limit ?? MAX_PAGE_SIZE });
  }

  /**
   * Get recently added prices from the community
   */
  getRecentPrices(limit = 20, filters: Omit<PriceSearchFilters, 'limit'> = {}): Promise<Price[]> {
    return this.searchPrices({ ...filters, limit });
  }

  /**
   * Price statistics for a product, one entry per currency (prices in
   * different currencies are never mixed).
   */
  async getPriceStats(barcode: string, filters: Omit<PriceSearchFilters, 'barcode'> = {}): Promise<PriceStats | null> {
    const prices = await this.getProductPrices(barcode, filters);
    if (prices.length === 0) return null;

    const dates = prices.map((p) => p.date).sort();
    return {
      barcode,
      priceCount: prices.length,
      byCurrency: statsByCurrency(prices),
      firstDate: dates[0]!,
      lastDate: dates[dates.length - 1]!,
    };
  }

  /**
   * Lowest recent price per currency (preferred currency first)
   */
  async findBestPrices(barcode: string, filters: Omit<PriceSearchFilters, 'barcode'> = {}): Promise<Price[]> {
    const prices = await this.getProductPrices(barcode, filters);
    const best = new Map<string, Price>();
    for (const p of prices) {
      const current = best.get(p.currency);
      if (!current || p.price < current.price) best.set(p.currency, p);
    }
    return [...best.values()].sort((a, b) => countByCurrency(prices, b.currency) - countByCurrency(prices, a.currency));
  }

  /**
   * Monthly median prices for a product
   */
  async getPriceHistory(barcode: string, months = 12, currency?: string): Promise<PriceHistoryPoint[]> {
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - months);
    const prices = await this.getProductPrices(barcode, {
      currency,
      dateFrom: since.toISOString().slice(0, 10),
    });

    const groups = new Map<string, number[]>();
    for (const p of prices) {
      const key = `${p.date.slice(0, 7)}|${p.currency}`;
      const list = groups.get(key) ?? [];
      list.push(p.price);
      groups.set(key, list);
    }

    return [...groups.entries()]
      .map(([key, values]) => {
        const [month, cur] = key.split('|') as [string, string];
        return {
          month,
          currency: cur,
          count: values.length,
          median: round(median(values), 2),
          min: Math.min(...values),
          max: Math.max(...values),
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month) || a.currency.localeCompare(b.currency));
  }

  /**
   * Compare prices between products, in the currency most of them share.
   */
  async comparePrices(products: Product[], currency?: string): Promise<PriceComparison | null> {
    const pricesPerProduct = await Promise.all(
      products.map((p) => this.getProductPrices(p.barcode, { currency })),
    );

    const allPrices = pricesPerProduct.flat();
    if (allPrices.length === 0) return null;

    const chosenCurrency = currency?.toUpperCase() ?? mostCommonCurrency(allPrices);

    const rows = products.map((p, i) => {
      const prices = pricesPerProduct[i]!.filter((x) => x.currency === chosenCurrency);
      const values = prices.map((x) => x.price);
      const med = values.length > 0 ? round(median(values), 2) : null;
      const grams = quantityInGramsOrMl(p.quantity);
      const bestPrice = prices.reduce<Price | null>((best, cur) => (!best || cur.price < best.price ? cur : best), null);
      return {
        barcode: p.barcode,
        name: p.name,
        bestPrice,
        medianPrice: med,
        quantity: p.quantity,
        pricePerKgOrL: med !== null && grams ? round((med / grams) * 1000, 2) : undefined,
      };
    });

    const withMedian = rows.filter((r) => r.medianPrice !== null);
    const withUnit = rows.filter((r) => r.pricePerKgOrL !== undefined);

    return {
      currency: chosenCurrency,
      products: rows,
      cheapest: withMedian.sort((a, b) => a.medianPrice! - b.medianPrice!)[0]?.barcode ?? null,
      bestValue: withUnit.sort((a, b) => a.pricePerKgOrL! - b.pricePerKgOrL!)[0]?.barcode ?? null,
    };
  }
}

function mapPrice(item: OpenPricesItem): Price {
  const loc = item.location;
  return {
    id: String(item.id),
    productBarcode: item.product_code ?? '',
    productName: item.product?.product_name ?? item.product_name ?? undefined,
    price: item.price,
    currency: item.currency,
    isDiscounted: !!item.price_is_discounted,
    priceWithoutDiscount: item.price_without_discount ?? undefined,
    discountType: item.discount_type ?? undefined,
    store: loc?.osm_name ? { id: String(loc.id), name: loc.osm_name, brand: loc.osm_brand ?? undefined } : undefined,
    location: loc
      ? {
          country: loc.osm_address_country ?? undefined,
          countryCode: loc.osm_address_country_code ?? undefined,
          city: loc.osm_address_city ?? undefined,
          postalCode: loc.osm_address_postcode ?? undefined,
          coordinates: typeof loc.osm_lat === 'number' && typeof loc.osm_lon === 'number'
            ? { latitude: loc.osm_lat, longitude: loc.osm_lon }
            : undefined,
        }
      : undefined,
    date: item.date,
    proofType: item.proof?.type ?? undefined,
    source: 'openprices',
  };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function countByCurrency(prices: Price[], currency: string): number {
  return prices.filter((p) => p.currency === currency).length;
}

function mostCommonCurrency(prices: Price[]): string {
  const counts = new Map<string, number>();
  for (const p of prices) counts.set(p.currency, (counts.get(p.currency) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

export function statsByCurrency(prices: Price[]): CurrencyPriceStats[] {
  const groups = new Map<string, Price[]>();
  for (const p of prices) {
    const list = groups.get(p.currency) ?? [];
    list.push(p);
    groups.set(p.currency, list);
  }

  return [...groups.entries()]
    .map(([currency, list]) => {
      const values = list.map((p) => p.price);
      const latest = [...list].sort((a, b) => b.date.localeCompare(a.date))[0]!;
      return {
        currency,
        count: list.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: round(values.reduce((a, b) => a + b, 0) / values.length, 2),
        median: round(median(values), 2),
        latest: { price: latest.price, date: latest.date },
      };
    })
    .sort((a, b) => b.count - a.count);
}

/**
 * Parse a package quantity ("400 g", "1,5 L", "6 x 33 cl") into grams or millilitres.
 */
export function quantityInGramsOrMl(quantity: string | undefined): number | undefined {
  if (!quantity) return undefined;
  const normalized = quantity.toLowerCase().replace(',', '.');
  const multi = normalized.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|mg|l|cl|ml|oz|lb)\b/);
  const single = normalized.match(/(\d+(?:\.\d+)?)\s*(kg|g|mg|l|cl|ml|oz|lb)\b/);

  let count = 1;
  let value: number;
  let unit: string;
  if (multi) {
    count = parseInt(multi[1]!, 10);
    value = parseFloat(multi[2]!);
    unit = multi[3]!;
  } else if (single) {
    value = parseFloat(single[1]!);
    unit = single[2]!;
  } else {
    return undefined;
  }

  const factors: Record<string, number> = {
    kg: 1000, g: 1, mg: 0.001, l: 1000, cl: 10, ml: 1, oz: 28.3495, lb: 453.592,
  };
  const grams = count * value * factors[unit]!;
  return grams > 0 ? grams : undefined;
}

// Singleton
let instance: PriceService | null = null;

export function getPriceService(): PriceService {
  if (!instance) {
    instance = new PriceService();
  }
  return instance;
}
