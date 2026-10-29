import { describe, it, expect } from 'vitest';
import { convertUnit, dailyValuePercent } from '../../src/services/daily-values.js';

describe('daily values', () => {
  it('converts between mass units', () => {
    expect(convertUnit(1, 'g', 'mg')).toBe(1000);
    expect(convertUnit(500, 'mcg', 'mg')).toBeCloseTo(0.5);
    expect(convertUnit(1, 'kcal', 'g')).toBeUndefined();
  });

  it('computes %DV in the Daily Value unit', () => {
    expect(dailyValuePercent('sodium', 2300, 'mg')).toBe(100);
    expect(dailyValuePercent('sodium', 1.15, 'g')).toBe(50);
    expect(dailyValuePercent('vitamin_d', 10, 'mcg')).toBe(50);
    expect(dailyValuePercent('sugars', 10, 'g')).toBeUndefined();
    expect(dailyValuePercent('added_sugars', 25, 'g')).toBe(50);
  });
});
