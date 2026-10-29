import { describe, it, expect } from 'vitest';
import { mapOFFProduct, mapOFFSearchResult } from '../../src/providers/openfoodfacts/mapper.js';
import { buildSearchQuery } from '../../src/providers/openfoodfacts/client.js';
import type { OFFProduct, OFFSearchResponse } from '../../src/providers/openfoodfacts/types.js';
import { fixture } from '../helpers/fetch-stub.js';

const nutella = fixture<{ product: OFFProduct }>('off-product-3017620422003.json').product;
const prince = fixture<{ product: OFFProduct }>('off-product-7622210449283.json').product;

describe('mapOFFProduct', () => {
  it('converts OFF gram-based nutriments to mg/mcg units', () => {
    const product = mapOFFProduct(nutella);
    const sodium = product.nutrients.find((n) => n.id === 'sodium')!;
    // OFF stores sodium_100g = 0.0428 g
    expect(sodium.unit).toBe('mg');
    expect(sodium.value).toBeCloseTo(42.8, 1);
    expect(sodium.dailyValuePercent).toBeCloseTo((42.8 / 2300) * 100, 1);
  });

  it('keeps macronutrients in grams and computes %DV', () => {
    const product = mapOFFProduct(nutella);
    const satFat = product.nutrients.find((n) => n.id === 'saturated_fat')!;
    expect(satFat.unit).toBe('g');
    expect(satFat.value).toBe(10.6);
    expect(satFat.dailyValuePercent).toBe(53);
    // Total sugars have no FDA Daily Value
    expect(product.nutrients.find((n) => n.id === 'sugars')!.dailyValuePercent).toBeUndefined();
  });

  it('computes per-serving values from serving_quantity', () => {
    const product = mapOFFProduct(prince);
    expect(product.servingSize?.grams).toBe(20);
    const energy = product.nutrients.find((n) => n.id === 'energy_kcal')!;
    expect(energy.perServing).toBeCloseTo(energy.value * 0.2, 3);
  });

  it('maps the Nutri-Score 2023 breakdown', () => {
    const ns = mapOFFProduct(prince).nutriScore!;
    expect(ns.grade).toBe('E');
    expect(ns.version).toBe('2023');
    expect(ns.negative.map((c) => c.id)).toEqual(expect.arrayContaining(['energy', 'sugars', 'saturated_fat', 'salt']));
    expect(ns.positive.find((c) => c.id === 'fiber')?.points).toBeGreaterThanOrEqual(0);
  });

  it('omits Nutri-Score when OFF reports "unknown"', () => {
    expect(mapOFFProduct(nutella).nutriScore).toBeUndefined();
  });

  it('maps Green-Score from environmental_score fields, including F', () => {
    expect(mapOFFProduct(nutella).greenScore?.grade).toBe('F');
    expect(mapOFFProduct({ code: '1', environmental_score_grade: 'a-plus' }).greenScore?.grade).toBe('A+');
    expect(mapOFFProduct({ code: '1', ecoscore_grade: 'b' }).greenScore?.grade).toBe('B');
    expect(mapOFFProduct({ code: '1', environmental_score_grade: 'not-applicable' }).greenScore).toBeUndefined();
  });

  it('maps ingredient analysis and allergens', () => {
    const product = mapOFFProduct(nutella);
    expect(product.ingredientsAnalysis).toEqual({ vegan: 'maybe', vegetarian: 'yes', palmOilFree: 'no' });
    expect(product.allergens.map((a) => a.id)).toEqual(expect.arrayContaining(['dairy', 'tree_nuts', 'soy']));
  });

  it('keeps only canonical English category tags', () => {
    const tags = mapOFFProduct(nutella).categoryTags ?? [];
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.every((t) => /^en:[a-z0-9-]+$/.test(t))).toBe(true);
  });

  it('dedupes brands and links to the OFF page', () => {
    const product = mapOFFProduct({ code: '123', brands: 'Ferrero, Ferrero , Nutella' });
    expect(product.brand).toBe('Ferrero, Nutella');
    expect(product.url).toBe('https://world.openfoodfacts.org/product/123');
  });
});

describe('mapOFFSearchResult', () => {
  it('maps search-a-licious hits (brands as arrays)', () => {
    const hits = fixture<OFFSearchResponse>('off-search-nutella.json').hits;
    const summary = mapOFFSearchResult(hits[0]!);
    expect(summary.barcode).toBe(hits[0]!.code);
    expect(typeof summary.brand).toBe('string');
    expect(summary.sources).toEqual(['openfoodfacts']);
  });
});

describe('buildSearchQuery', () => {
  it('combines text and filters', () => {
    expect(buildSearchQuery({ query: 'dark chocolate', brand: 'Lindt & Sprüngli', category: 'Chocolates', nutriScoreMax: 'B', novaMax: 3 }))
      .toBe('dark chocolate brands_tags:"lindt-sprungli" categories_tags:"en:chocolates" nutriscore_grade:(a OR b) nova_group:[1 TO 3]');
  });

  it('keeps explicit taxonomy tags and strips query operators', () => {
    expect(buildSearchQuery({ query: 'milk AND (cookies)', category: 'en:biscuits' }))
      .toBe('milk AND cookies categories_tags:"en:biscuits"');
  });

  it('returns an empty query when no filter is given', () => {
    expect(buildSearchQuery({})).toBe('');
  });
});
