import { describe, it, expect, afterEach } from 'vitest';
import { ProductService, mergeProducts } from '../../src/services/product.service.js';
import { resetEnvForTests } from '../../src/config/env.js';
import { getCache } from '../../src/resilience/cache.js';
import { ApiError } from '../../src/errors/index.js';
import { stubFetch, defaultRoutes, restoreFetch } from '../helpers/fetch-stub.js';
import { makeProduct, nutrient } from '../helpers/products.js';

afterEach(() => {
  restoreFetch();
  resetEnvForTests();
  getCache().clear();
});

describe('mergeProducts', () => {
  it('keeps the first source and fills gaps from the others', () => {
    const off = makeProduct({ barcode: '1', name: 'OFF name', nutrients: [nutrient('fat', 10)], sources: ['openfoodfacts'] });
    const usda = makeProduct({
      barcode: '1', name: 'USDA name', fdcId: '42', ingredientsText: 'sugar',
      nutrients: [nutrient('fat', 11), nutrient('calcium', 100, 'mg')], sources: ['usda'],
    });
    const merged = mergeProducts([off, usda]);
    expect(merged.name).toBe('OFF name');
    expect(merged.fdcId).toBe('42');
    expect(merged.ingredientsText).toBe('sugar');
    expect(merged.nutrients.find((n) => n.id === 'fat')!.value).toBe(10);
    expect(merged.nutrients.find((n) => n.id === 'calcium')).toBeDefined();
    expect(merged.sources).toEqual(['openfoodfacts', 'usda']);
  });
});

describe('ProductService.getByBarcode', () => {
  it('merges USDA data when a key is configured (leading zeros ignored)', async () => {
    resetEnvForTests({ USDA_API_KEY: 'test-key' });
    const routes = defaultRoutes();
    // OFF does not know this US barcode; USDA stores it as 12-digit UPC
    stubFetch(routes);
    const product = await new ProductService().getByBarcode('0009800895007');
    expect(product?.sources).toEqual(['usda']);
    expect(product?.fdcId).toBe('2041155');
    expect(product?.barcode).toBe('0009800895007');
  });

  it('returns null when every source answers "not found"', async () => {
    stubFetch(defaultRoutes());
    expect(await new ProductService().getByBarcode('0000000000017')).toBeNull();
  });

  it('throws when the sources fail instead of reporting "not found"', async () => {
    stubFetch([{ match: () => true, status: 400, body: { error: 'bad request' } }]);
    await expect(new ProductService().getByBarcode('3017620422003')).rejects.toBeInstanceOf(ApiError);
  });
});
