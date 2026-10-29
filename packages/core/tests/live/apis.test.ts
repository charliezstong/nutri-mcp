/**
 * Smoke tests against the real APIs. Skipped unless LIVE_TESTS=1
 * (pnpm test:live). They detect upstream schema changes early.
 */
import { describe, it, expect } from 'vitest';
import { getProductService } from '../../src/services/product.service.js';
import { getPriceService } from '../../src/services/price.service.js';
import { getRecallService } from '../../src/services/recall.service.js';

describe.skipIf(!process.env['LIVE_TESTS'])('live APIs', () => {
  it('Open Food Facts v3.4 product + Nutri-Score 2023 + Green-Score', async () => {
    const product = await getProductService().requireByBarcode('7622210449283');
    expect(product.name).toBeTruthy();
    expect(product.nutrients.find((n) => n.id === 'sodium')?.unit).toBe('mg');
    expect(product.nutriScore?.version).toBe('2023');
    expect(product.greenScore?.grade).toMatch(/^(A\+|[A-F])$/);
  }, 30_000);

  it('search-a-licious search', async () => {
    const result = await getProductService().search({ query: 'nutella' }, { page: 1, pageSize: 3 });
    expect(result.items.length).toBeGreaterThan(0);
  }, 30_000);

  it('Open Prices', async () => {
    const prices = await getPriceService().getProductPrices('3017620422003', { limit: 3 });
    expect(prices.length).toBeGreaterThan(0);
  }, 30_000);

  it('openFDA recalls', async () => {
    const recalls = await getRecallService().search({ text: 'peanut butter', limit: 1 });
    expect(recalls.length).toBe(1);
  }, 30_000);
});
