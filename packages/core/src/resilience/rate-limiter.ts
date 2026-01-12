import { RATE_LIMITS } from '../config/constants.js';

type ProviderName = keyof typeof RATE_LIMITS;
type EndpointName<P extends ProviderName> = keyof (typeof RATE_LIMITS)[P];

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  max: number;
  windowMs: number;
}

/**
 * Token Bucket Rate Limiter
 */
export class RateLimiter {
  private buckets = new Map<string, RateLimitEntry>();

  /**
   * Check if request is allowed and consume a token
   */
  tryAcquire<P extends ProviderName>(
    provider: P,
    endpoint: EndpointName<P>,
  ): { allowed: boolean; retryAfterMs?: number } {
    const config = this.getConfig(provider, endpoint);
    if (!config) {
      return { allowed: true };
    }

    const key = `${provider}:${String(endpoint)}`;
    const now = Date.now();

    let entry = this.buckets.get(key);

    if (!entry) {
      entry = { tokens: config.max, lastRefill: now };
      this.buckets.set(key, entry);
    }

    // Refill tokens based on time passed
    const timePassed = now - entry.lastRefill;
    const tokensToAdd = Math.floor((timePassed / config.windowMs) * config.max);

    if (tokensToAdd > 0) {
      entry.tokens = Math.min(config.max, entry.tokens + tokensToAdd);
      entry.lastRefill = now;
    }

    // Try to consume a token
    if (entry.tokens > 0) {
      entry.tokens--;
      return { allowed: true };
    }

    // Calculate retry time
    const tokensNeeded = 1;
    const msPerToken = config.windowMs / config.max;
    const retryAfterMs = Math.ceil(tokensNeeded * msPerToken);

    return { allowed: false, retryAfterMs };
  }

  /**
   * Get remaining tokens for an endpoint
   */
  getRemaining<P extends ProviderName>(
    provider: P,
    endpoint: EndpointName<P>,
  ): number {
    const key = `${provider}:${String(endpoint)}`;
    const entry = this.buckets.get(key);
    return entry?.tokens ?? this.getConfig(provider, endpoint)?.max ?? 0;
  }

  /**
   * Wait until a request is allowed
   */
  async waitForToken<P extends ProviderName>(
    provider: P,
    endpoint: EndpointName<P>,
    maxWaitMs = 30_000,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const result = this.tryAcquire(provider, endpoint);
      if (result.allowed) {
        return true;
      }

      const waitTime = Math.min(result.retryAfterMs ?? 1000, maxWaitMs - (Date.now() - startTime));
      if (waitTime <= 0) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    return false;
  }

  /**
   * Get configuration for provider/endpoint
   */
  private getConfig<P extends ProviderName>(
    provider: P,
    endpoint: EndpointName<P>,
  ): RateLimitConfig | null {
    const providerLimits = RATE_LIMITS[provider];
    if (!providerLimits) {
      return null;
    }

    const endpointConfig = providerLimits[endpoint as keyof typeof providerLimits];
    if (!endpointConfig) {
      return null;
    }

    return endpointConfig as unknown as RateLimitConfig;
  }

  /**
   * Reset rate limits (for testing)
   */
  reset(): void {
    this.buckets.clear();
  }

  /**
   * Get all rate limit stats
   */
  getStats(): Record<string, { tokens: number; lastRefill: Date }> {
    const stats: Record<string, { tokens: number; lastRefill: Date }> = {};
    for (const [key, entry] of this.buckets) {
      stats[key] = {
        tokens: entry.tokens,
        lastRefill: new Date(entry.lastRefill),
      };
    }
    return stats;
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Error thrown when rate limited
 */
export class RateLimitError extends Error {
  retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`Rate limited. Retry after ${retryAfterMs}ms`);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}
