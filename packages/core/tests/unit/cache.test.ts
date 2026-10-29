import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../../src/resilience/cache.js';

describe('LRUCache', () => {
  let cache: LRUCache;

  beforeEach(() => {
    cache = new LRUCache(3);
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1', 'product');
      const result = cache.get<string>('key1');
      expect(result?.value).toBe('value1');
    });

    it('should return null for missing keys', () => {
      expect(cache.get('nonexistent')).toBe(null);
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1', 'product');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1', 'product');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBe(null);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1', 'product');
      cache.set('key2', 'value2', 'product');
      cache.clear();
      expect(cache.stats().size).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when at capacity', () => {
      cache.set('key1', 'value1', 'product');
      cache.set('key2', 'value2', 'product');
      cache.set('key3', 'value3', 'product');
      cache.set('key4', 'value4', 'product'); // Should evict key1

      expect(cache.get('key1')).toBe(null);
      expect(cache.get('key2')?.value).toBe('value2');
      expect(cache.get('key3')?.value).toBe('value3');
      expect(cache.get('key4')?.value).toBe('value4');
    });

    it('should update LRU order on access', () => {
      cache.set('key1', 'value1', 'product');
      cache.set('key2', 'value2', 'product');
      cache.set('key3', 'value3', 'product');

      // Access key1 to make it most recently used
      cache.get('key1');

      cache.set('key4', 'value4', 'product'); // Should evict key2, not key1

      expect(cache.get('key1')?.value).toBe('value1');
      expect(cache.get('key2')).toBe(null);
    });
  });

  describe('makeKey', () => {
    it('should create consistent cache keys', () => {
      expect(LRUCache.makeKey('prefix', 'a', 'b')).toBe('prefix:a:b');
      expect(LRUCache.makeKey('product', '123')).toBe('product:123');
    });

    it('should filter undefined values', () => {
      expect(LRUCache.makeKey('prefix', 'a', undefined, 'b')).toBe('prefix:a:b');
    });
  });

  describe('stats', () => {
    it('should return correct statistics', () => {
      cache.set('key1', 'value1', 'product');
      cache.set('key2', 'value2', 'product');

      const stats = cache.stats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
    });
  });
});
