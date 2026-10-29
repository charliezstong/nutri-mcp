import { describe, it, expect, afterEach, vi } from 'vitest';
import { PriceService, median, quantityInGramsOrMl, statsByCurrency } from '../../src/services/price.service.js';
import type { Price } from '../../src/types/price.types.js';
import { stubFetch, defaultRoutes } from '../helpers/fetch-stub.js';
import { makeProduct } from '../helpers/products.js';

const price = (value: number, currency: string, date: string): Price => ({
  id: `${value}-${date}`, productBarcode: '1', price: value, currency, isDiscounted: false, date, source: 'openprices',
});

describe('price helpers', () => {
  it('computes medians', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('never mixes currencies in statistics', () => {
    const stats = statsByCurrency([price(1, 'EUR', '2026-01-01'), price(3, 'EUR', '2026-02-01'), price(100, 'MXN', '2026-01-15')]);
    expect(stats).toHaveLength(2);
    expect(stats[0]).toMatchObject({ currency: 'EUR', count: 2, min: 1, max: 3, median: 2, latest: { price: 3, date: '2026-02-01' } });
    expect(stats[1]).toMatchObject({ currency: 'MXN', count: 1 });
  });

  it('parses package quantities', () => {
    expect(quantityInGramsOrMl('400 g')).toBe(400);
    expect(quantityInGramsOrMl('1,5 L')).toBe(1500);
    expect(quantityInGramsOrMl('6 x 33 cl')).toBe(1980);
    expect(quantityInGramsOrMl('12 oz')).toBeCloseTo(340.2, 0);
    expect(quantityInGramsOrMl('family pack')).toBeUndefined();
  });
});

describe('PriceService (Open Prices fixture)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests newest prices first and maps stores', async () => {
    const fetch = stubFetch(defaultRoutes());
    const prices = await new PriceService().getProductPrices('3017620422003', { limit: 5 });
    const url = new URL(String(fetch.mock.calls[0]![0]));
    expect(url.searchParams.get('order_by')).toBe('-date');
    expect(prices.length).toBeGreaterThan(0);
    expect(prices[0]!.store?.name).toBeTruthy();
    const dates = prices.map((p) => p.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('filters by country client-side', async () => {
    stubFetch(defaultRoutes());
    const prices = await new PriceService().searchPrices({ barcode: '3017620422003', country: 'ZZ' });
    expect(prices).toEqual([]);
  });

  it('compares prices per kg in one currency', async () => {
    stubFetch(defaultRoutes());
    const service = new PriceService();
    const result = await service.comparePrices([
      makeProduct({ barcode: '3017620422003', name: 'Nutella', quantity: '400 g' }),
      makeProduct({ barcode: '3017620422003', name: 'Nutella copy', quantity: '200 g' }),
    ]);
    expect(result?.currency).toBe('EUR');
    expect(result?.bestValue).toBe('3017620422003');
    expect(result?.products[1]!.pricePerKgOrL).toBeGreaterThan(result!.products[0]!.pricePerKgOrL!);
  });
});
