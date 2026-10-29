import type { DataSource } from './common.types.js';

/**
 * Price entry from Open Prices (crowdsourced, backed by receipt/price-tag proofs)
 */
export interface Price {
  id: string;
  productBarcode: string;
  productName?: string;
  price: number;
  currency: string;
  isDiscounted: boolean;
  priceWithoutDiscount?: number;
  discountType?: string;
  store?: StoreInfo;
  location?: LocationInfo;
  date: string;               // ISO date (YYYY-MM-DD)
  proofType?: string;         // RECEIPT | PRICE_TAG | ...
  source: DataSource;
}

/**
 * Store information
 */
export interface StoreInfo {
  id?: string;
  name: string;
  brand?: string;
}

/**
 * Location information
 */
export interface LocationInfo {
  country?: string;
  countryCode?: string;
  city?: string;
  postalCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Price search filters
 */
export interface PriceSearchFilters {
  barcode?: string;
  /** ISO 3166-1 alpha-2 country code of the store (filtered client-side). */
  country?: string;
  currency?: string;
  discountedOnly?: boolean;
  dateFrom?: string;          // YYYY-MM-DD
  limit?: number;
}

/**
 * Statistics for prices sharing one currency
 */
export interface CurrencyPriceStats {
  currency: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  latest: { price: number; date: string };
}

/**
 * Price statistics for a product, split by currency
 */
export interface PriceStats {
  barcode: string;
  priceCount: number;
  byCurrency: CurrencyPriceStats[];
  firstDate: string;
  lastDate: string;
}

/**
 * Monthly price history point
 */
export interface PriceHistoryPoint {
  month: string;              // YYYY-MM
  currency: string;
  count: number;
  median: number;
  min: number;
  max: number;
}

/**
 * Price comparison between products (in one currency)
 */
export interface PriceComparison {
  currency: string;
  products: {
    barcode: string;
    name: string;
    bestPrice: Price | null;
    medianPrice: number | null;
    quantity?: string;
    /** Median price per kg or per litre, when the package quantity is known. */
    pricePerKgOrL?: number;
  }[];
  cheapest: string | null;      // barcode, by median price
  bestValue: string | null;     // barcode, by price per kg/L
}
