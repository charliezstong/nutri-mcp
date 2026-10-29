import { describe, it, expect, afterEach, vi } from 'vitest';
import { fetchJson, userAgent } from '../../src/resilience/http.js';
import { getCircuitBreaker } from '../../src/resilience/circuit-breaker.js';
import { ApiError } from '../../src/errors/index.js';
import { stubFetch } from '../helpers/fetch-stub.js';

afterEach(() => vi.unstubAllGlobals());

describe('fetchJson', () => {
  it('sends an identifying User-Agent', async () => {
    const mock = stubFetch([{ match: () => true, body: { ok: true } }]);
    await fetchJson('https://api.fda.gov/x', { provider: 'openfda' });
    const init = mock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)['User-Agent']).toBe(userAgent());
    expect(userAgent()).toMatch(/^nutri-mcp\/\d+\.\d+\.\d+ \(/);
  });

  it('maps 404 to null when allowed, without tripping the breaker', async () => {
    stubFetch([{ match: () => true, status: 404 }]);
    const before = getCircuitBreaker('robotoff').getStats().failures;
    expect(await fetchJson('https://robotoff.example/x', { provider: 'robotoff', allowNotFound: true })).toBeNull();
    expect(getCircuitBreaker('robotoff').getStats().failures).toBe(before);
  });

  it('does not count client errors against the circuit breaker', async () => {
    stubFetch([{ match: () => true, status: 400 }]);
    const before = getCircuitBreaker('openprices').getStats().failures;
    await expect(fetchJson('https://prices.example/x', { provider: 'openprices' })).rejects.toBeInstanceOf(ApiError);
    expect(getCircuitBreaker('openprices').getStats().failures).toBe(before);
  });

  it('retries 5xx responses and counts the failure', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const mock = stubFetch([{ match: () => true, status: 503 }]);
    const before = getCircuitBreaker('usda').getStats().failures;
    const promise = fetchJson('https://usda.example/x', { provider: 'usda' });
    const assertion = expect(promise).rejects.toMatchObject({ statusCode: 503 });
    await vi.runAllTimersAsync();
    await assertion;
    expect(mock).toHaveBeenCalledTimes(3); // 1 + 2 retries
    expect(getCircuitBreaker('usda').getStats().failures).toBe(before + 1);
    vi.useRealTimers();
  });
});
