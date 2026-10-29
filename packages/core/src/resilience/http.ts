import { RATE_LIMIT_MAX_WAIT_MS, TIMEOUTS } from '../config/constants.js';
import { getEnv } from '../config/env.js';
import { ApiError, ProviderUnavailableError } from '../errors/index.js';
import { getLogger } from '../transport/logger.js';
import { VERSION } from '../version.js';
import { getCircuitBreaker, type ProviderName } from './circuit-breaker.js';
import { getRateLimiter, RateLimitError } from './rate-limiter.js';
import { withRetry } from './retry.js';

const logger = getLogger().child('http');

export interface FetchJsonOptions {
  /** Upstream service; selects the circuit breaker and rate-limit bucket. */
  provider: ProviderName;
  /** Rate-limit endpoint key within the provider (defaults to "all"). */
  endpoint?: string;
  init?: RequestInit;
  timeoutMs?: number;
  /** Return null on HTTP 404 instead of throwing (e.g. unknown barcode). */
  allowNotFound?: boolean;
}

const PROVIDER_LABELS: Record<ProviderName, string> = {
  openfoodfacts: 'Open Food Facts',
  robotoff: 'Robotoff',
  openprices: 'Open Prices',
  usda: 'USDA FoodData Central',
  nutritionix: 'Nutritionix',
  openfda: 'openFDA',
};

/**
 * User-Agent sent to every upstream API. Open Food Facts requires a custom
 * User-Agent of the form "AppName/Version (contact)".
 */
export function userAgent(): string {
  const contact = getEnv().OFF_CONTACT_EMAIL ?? 'https://github.com/charliezstong/nutri-mcp';
  return `nutri-mcp/${VERSION} (${contact})`;
}

/**
 * Errors that indicate the upstream service is unhealthy (as opposed to a
 * bad request), and should therefore count against the circuit breaker.
 */
function isServiceFailure(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode >= 500 || error.statusCode === 429;
  }
  return !(error instanceof RateLimitError);
}

/**
 * Fetch JSON with circuit breaker, rate limiting, timeout and retries.
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions & { allowNotFound: true }): Promise<T | null>;
export async function fetchJson<T>(url: string, options: FetchJsonOptions): Promise<T>;
export async function fetchJson<T>(url: string, options: FetchJsonOptions): Promise<T | null> {
  const { provider, endpoint = 'all', init = {}, allowNotFound = false } = options;
  const timeoutMs = options.timeoutMs ?? Math.max(getEnv().REQUEST_TIMEOUT, TIMEOUTS.default);
  const breaker = getCircuitBreaker(provider);
  const label = PROVIDER_LABELS[provider];

  if (!breaker.canRequest()) {
    throw new ProviderUnavailableError(label);
  }

  const acquired = await getRateLimiter().waitForToken(
    provider,
    endpoint as never,
    RATE_LIMIT_MAX_WAIT_MS,
  );
  if (!acquired) {
    throw new RateLimitError(RATE_LIMIT_MAX_WAIT_MS);
  }

  try {
    const result = await withRetry(async () => {
      const response = await fetch(url, {
        ...init,
        headers: {
          Accept: 'application/json',
          'User-Agent': userAgent(),
          ...(init.headers as Record<string, string> | undefined),
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.status === 404 && allowNotFound) {
        // Drain the body so the connection can be reused
        await response.body?.cancel();
        return null;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new ApiError(label, response.status, response.statusText || 'Request failed');
      }

      return (await response.json()) as T;
    });

    breaker.recordSuccess();
    return result;
  } catch (error) {
    if (isServiceFailure(error)) {
      breaker.recordFailure();
    }
    logger.warn(`${label} request failed`, { url: redact(url), error });
    throw error;
  }
}

/**
 * Remove API keys from URLs before logging them.
 */
function redact(url: string): string {
  return url.replace(/(api_key=)[^&]+/i, '$1***');
}
