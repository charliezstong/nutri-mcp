import { RETRY_CONFIG } from '../config/constants.js';

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown, nextDelayMs: number) => void;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown, statusCodes: number[]): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Check for status code in error
  if (error && typeof error === 'object') {
    const err = error as { status?: number; statusCode?: number; code?: string };

    // HTTP status codes
    if (err.status && statusCodes.includes(err.status)) {
      return true;
    }
    if (err.statusCode && statusCodes.includes(err.statusCode)) {
      return true;
    }

    // Network error codes
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
    if (err.code && retryableCodes.includes(err.code)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number,
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    initialDelayMs = RETRY_CONFIG.initialDelayMs,
    maxDelayMs = RETRY_CONFIG.maxDelayMs,
    backoffMultiplier = RETRY_CONFIG.backoffMultiplier,
    retryableStatusCodes = [...RETRY_CONFIG.retryableStatusCodes],
    shouldRetry,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const canRetry = shouldRetry
        ? shouldRetry(error)
        : isRetryableError(error, retryableStatusCodes);

      if (!canRetry || attempt > maxRetries) {
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, initialDelayMs, maxDelayMs, backoffMultiplier);

      // Callback before retry
      onRetry?.(attempt, error, delay);

      // Wait before retry
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Decorator for adding retry logic to async methods
 */
export function Retry(options: RetryOptions = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      return withRetry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * Create a retryable version of a function
 */
export function retryable<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions = {},
): T {
  return ((...args: Parameters<T>) => {
    return withRetry(() => fn(...args), options);
  }) as T;
}
