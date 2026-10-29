import { describe, it, expect } from 'vitest';
import { gtinVariants, sameGtin } from '../../src/utils/barcode.js';
import { containsWord, toTagSlug } from '../../src/utils/text.js';

describe('GTIN helpers', () => {
  it('matches barcodes regardless of zero padding', () => {
    expect(sameGtin('009800895007', '0009800895007')).toBe(true);
    expect(sameGtin('00009800895007', '9800895007')).toBe(true);
    expect(sameGtin('3017620422003', '3017620422004')).toBe(false);
  });

  it('lists UPC/EAN/GTIN-14 spellings', () => {
    expect(gtinVariants('009800895007')).toEqual(expect.arrayContaining(['009800895007', '0009800895007', '00009800895007', '9800895007']));
    expect(gtinVariants('abc')).toEqual([]);
  });
});

describe('text helpers', () => {
  it('matches whole words only', () => {
    expect(containsWord('eggplant, tomato', 'egg')).toBe(false);
    expect(containsWord('whole egg, flour', 'egg')).toBe(true);
    expect(containsWord('Lait écrémé en poudre', 'lait')).toBe(true);
    expect(containsWord('jamón serrano', 'jamón')).toBe(true);
  });

  it('builds OFF-style tag slugs', () => {
    expect(toTagSlug("Lay's Crème Fraîche")).toBe('lay-s-creme-fraiche');
  });
});
