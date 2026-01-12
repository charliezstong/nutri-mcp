import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, CircuitBreakerOpenError } from '../../src/resilience/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('openfoodfacts');
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should allow requests initially', () => {
      expect(breaker.canRequest()).toBe(true);
    });
  });

  describe('recording success', () => {
    it('should reset failure count on success', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordSuccess();

      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
    });
  });

  describe('opening circuit', () => {
    it('should open after reaching failure threshold', () => {
      // Default threshold is 5
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      expect(breaker.getState()).toBe('OPEN');
      expect(breaker.canRequest()).toBe(false);
    });

    it('should throw CircuitBreakerOpenError when open', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      await expect(
        breaker.execute(() => Promise.resolve('test')),
      ).rejects.toThrow(CircuitBreakerOpenError);
    });
  });

  describe('half-open state', () => {
    it('should transition to HALF_OPEN after timeout', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      expect(breaker.getState()).toBe('OPEN');

      // Fast-forward time (mock the timeout)
      vi.useFakeTimers();
      vi.advanceTimersByTime(35000); // Default timeout is 30000

      expect(breaker.canRequest()).toBe(true);
      expect(breaker.getState()).toBe('HALF_OPEN');

      vi.useRealTimers();
    });
  });

  describe('execute', () => {
    it('should execute function and record success', async () => {
      const result = await breaker.execute(() => Promise.resolve('success'));
      expect(result).toBe('success');

      const stats = breaker.getStats();
      expect(stats.lastSuccess).toBeDefined();
    });

    it('should record failure on error', async () => {
      await expect(
        breaker.execute(() => Promise.reject(new Error('test error'))),
      ).rejects.toThrow('test error');

      const stats = breaker.getStats();
      expect(stats.failures).toBe(1);
    });
  });

  describe('forceReset', () => {
    it('should reset to CLOSED state', () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }

      expect(breaker.getState()).toBe('OPEN');

      breaker.forceReset();

      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.canRequest()).toBe(true);
    });
  });
});
