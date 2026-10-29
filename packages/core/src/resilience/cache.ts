import { CACHE_CONFIG, CACHE_TTL } from '../config/constants.js';
import { getEnv } from '../config/env.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleAt: number;
}

type CacheCategory = keyof typeof CACHE_TTL;

/**
 * LRU Cache with TTL and stale-while-revalidate support
 */
export class LRUCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private maxSize: number;
  private enabled: boolean;

  constructor(maxSize: number = CACHE_CONFIG.maxSize, enabled = true) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.enabled = enabled;
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): { value: T; stale: boolean } | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const now = Date.now();

    // Expired completely
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    // Return with stale indicator
    return {
      value: entry.value,
      stale: now > entry.staleAt,
    };
  }

  /**
   * Set a value in cache with category-based TTL
   */
  set<T>(key: string, value: T, category: CacheCategory): void {
    if (!this.enabled) return;
    const ttl = CACHE_TTL[category];
    const now = Date.now();

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      staleAt: now + ttl * 0.8,        // 80% of TTL = stale
      expiresAt: now + ttl,
    });
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const result = this.get(key);
    return result !== null;
  }

  /**
   * Generate cache key from components
   */
  static makeKey(prefix: string, ...parts: (string | number | boolean | undefined)[]): string {
    const filteredParts = parts.filter((p) => p !== undefined);
    return `${prefix}:${filteredParts.join(':')}`;
  }
}

/**
 * Decorator for caching async function results
 */
export function withCache<T>(
  cache: LRUCache,
  keyFn: (...args: unknown[]) => string,
  category: CacheCategory,
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<T>;

    descriptor.value = async function (...args: unknown[]): Promise<T> {
      const key = keyFn(...args);
      const cached = cache.get<T>(key);

      if (cached && !cached.stale) {
        return cached.value;
      }

      // If stale, return stale value but revalidate in background
      if (cached?.stale && CACHE_CONFIG.staleWhileRevalidate) {
        // Fire and forget revalidation
        originalMethod.apply(this, args).then((value) => {
          cache.set(key, value, category);
        }).catch(() => {
          // Ignore revalidation errors
        });
        return cached.value;
      }

      const value = await originalMethod.apply(this, args);
      cache.set(key, value, category);
      return value;
    };

    return descriptor;
  };
}

// Singleton cache instance
let cacheInstance: LRUCache | null = null;

export function getCache(): LRUCache {
  if (!cacheInstance) {
    cacheInstance = new LRUCache(getEnv().CACHE_MAX_SIZE, getEnv().ENABLE_CACHING);
  }
  return cacheInstance;
}
