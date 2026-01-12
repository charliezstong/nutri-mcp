import type { DataSource } from './common.types.js';

/**
 * Price entry from crowdsourced data
 */
export interface Price {
  id: string;
  productBarcode: string;
  price: number;
  currency: string;
  pricePerUnit?: number;
  unit?: string;
  store?: StoreInfo;
  location?: LocationInfo;
  date: Date;
  source: DataSource;
}

/**
 * Store information
 */
export interface StoreInfo {
  id?: string;
  name: string;
  chain?: string;
  type?: 'supermarket' | 'convenience' | 'online' | 'pharmacy' | 'other';
}

/**
 * Location information
 */
export interface LocationInfo {
  country: string;
  countryCode: string;
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
  country?: string;
  currency?: string;
  store?: string;
  minPrice?: number;
  maxPrice?: number;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Price statistics for a product
 */
export interface PriceStats {
  barcode: string;
  currency: string;
  current: {
    min: number;
    max: number;
    avg: number;
    median: number;
  };
  historical?: {
    thirtyDayAvg: number;
    ninetyDayAvg: number;
    yearAvg: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  priceCount: number;
  lastUpdated: Date;
}

/**
 * Price comparison between products
 */
export interface PriceComparison {
  products: {
    barcode: string;
    name: string;
    price: Price;
    pricePerUnit?: number;
  }[];
  cheapest: string;           // barcode
  bestValue?: string;         // barcode (considering nutrition per price)
  currency: string;
}
