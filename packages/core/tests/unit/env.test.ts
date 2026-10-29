import { describe, it, expect } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

describe('loadEnv', () => {
  it('parses boolean flags correctly ("false" is false)', () => {
    expect(loadEnv({ ENABLE_USDA: 'false' }).ENABLE_USDA).toBe(false);
    expect(loadEnv({ ENABLE_USDA: '0' }).ENABLE_USDA).toBe(false);
    expect(loadEnv({ ENABLE_USDA: 'TRUE' }).ENABLE_USDA).toBe(true);
    expect(loadEnv({}).ENABLE_USDA).toBe(true);
  });

  it('rejects invalid flag values', () => {
    expect(() => loadEnv({ ENABLE_CACHING: 'maybe' })).toThrow(/ENABLE_CACHING/);
  });

  it('treats empty API keys as unset', () => {
    expect(loadEnv({ USDA_API_KEY: '  ' }).USDA_API_KEY).toBeUndefined();
  });

  it('defaults to stdio on localhost', () => {
    const env = loadEnv({});
    expect(env.TRANSPORT).toBe('stdio');
    expect(env.HTTP_HOST).toBe('127.0.0.1');
    expect(env.LOG_FILE).toBeUndefined();
  });
});
