import { CIRCUIT_BREAKER } from '../config/constants.js';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
type ProviderName = keyof typeof CIRCUIT_BREAKER;

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  state: CircuitState;
  nextRetry?: Date;
}

/**
 * Circuit Breaker implementation for API resilience
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private nextRetry?: Date;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeoutMs: number;

  constructor(provider: ProviderName) {
    const config = CIRCUIT_BREAKER[provider];
    this.failureThreshold = config.failureThreshold;
    this.successThreshold = config.successThreshold;
    this.timeoutMs = config.timeoutMs;
  }

  /**
   * Check if request should be allowed
   */
  canRequest(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      // Check if timeout has passed
      if (this.nextRetry && Date.now() >= this.nextRetry.getTime()) {
        this.state = 'HALF_OPEN';
        this.successes = 0;
        return true;
      }
      return false;
    }

    // HALF_OPEN - allow limited requests
    return true;
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.lastSuccess = new Date();

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.reset();
      }
    } else {
      this.failures = 0;
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.lastFailure = new Date();
    this.failures++;

    if (this.state === 'HALF_OPEN') {
      this.trip();
    } else if (this.failures >= this.failureThreshold) {
      this.trip();
    }
  }

  /**
   * Trip the circuit breaker (open it)
   */
  private trip(): void {
    this.state = 'OPEN';
    this.nextRetry = new Date(Date.now() + this.timeoutMs);
  }

  /**
   * Reset the circuit breaker
   */
  private reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextRetry = undefined;
  }

  /**
   * Force reset (for testing/admin)
   */
  forceReset(): void {
    this.reset();
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats(): CircuitStats {
    return {
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      state: this.state,
      nextRetry: this.nextRetry,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canRequest()) {
      throw new CircuitBreakerOpenError(
        `Circuit breaker is OPEN. Next retry at ${this.nextRetry?.toISOString()}`,
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

// Circuit breaker instances per provider
const breakers = new Map<ProviderName, CircuitBreaker>();

export function getCircuitBreaker(provider: ProviderName): CircuitBreaker {
  let breaker = breakers.get(provider);
  if (!breaker) {
    breaker = new CircuitBreaker(provider);
    breakers.set(provider, breaker);
  }
  return breaker;
}

/**
 * Get all circuit breaker stats
 */
export function getAllCircuitBreakerStats(): Record<string, CircuitStats> {
  const stats: Record<string, CircuitStats> = {};
  for (const [name, breaker] of breakers) {
    stats[name] = breaker.getStats();
  }
  return stats;
}
