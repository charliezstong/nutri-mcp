import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function fixture<T = unknown>(name: string): T {
  const path = fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export interface Route {
  match: (url: URL) => boolean;
  status?: number;
  body?: unknown;
  /** Called with the request URL; return a body to send */
  handler?: (url: URL) => unknown;
}

type FetchInput = string | URL | Request;

export interface FetchStub {
  (input: FetchInput, init?: RequestInit): Promise<Response>;
  mock: { calls: [FetchInput, RequestInit | undefined][] };
}

const originalFetch = globalThis.fetch;

/**
 * Replace global fetch with a router over fixtures. Unmatched URLs answer 404.
 * Framework-agnostic (also used by scripts/generate-tool-docs.ts).
 * Returns the stub so tests can inspect calls; undo with restoreFetch().
 */
export function stubFetch(routes: Route[]): FetchStub {
  const calls: FetchStub['mock']['calls'] = [];
  const stub = (async (input: FetchInput, init?: RequestInit) => {
    calls.push([input, init]);
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const route = routes.find((r) => r.match(url));
    if (!route) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    }
    const body = route.handler ? route.handler(url) : route.body;
    return new Response(JSON.stringify(body ?? {}), {
      status: route.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as FetchStub;
  stub.mock = { calls };
  globalThis.fetch = stub as typeof fetch;
  return stub;
}

export function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

/** Routes serving every captured fixture */
export function defaultRoutes(): Route[] {
  return [
    {
      match: (u) => u.hostname === 'world.openfoodfacts.org' && u.pathname.endsWith('/product/3017620422003'),
      body: fixture('off-product-3017620422003.json'),
    },
    {
      match: (u) => u.hostname === 'world.openfoodfacts.org' && u.pathname.endsWith('/product/7622210449283'),
      body: fixture('off-product-7622210449283.json'),
    },
    {
      match: (u) => u.hostname === 'search.openfoodfacts.org',
      body: fixture('off-search-nutella.json'),
    },
    {
      match: (u) => u.hostname === 'prices.openfoodfacts.org',
      body: fixture('openprices-nutella.json'),
    },
    {
      match: (u) => u.hostname === 'api.fda.gov',
      body: fixture('openfda-peanut-butter.json'),
    },
    {
      match: (u) => u.hostname === 'static.openfoodfacts.org' && u.pathname.endsWith('additives.json'),
      body: fixture('off-additives-taxonomy.json'),
    },
    {
      match: (u) => u.hostname === 'robotoff.openfoodfacts.org',
      body: { insights: [], questions: [], count: 0 },
    },
    {
      match: (u) => u.hostname === 'api.nal.usda.gov' && u.pathname.endsWith('/foods/search'),
      body: fixture('usda-search-gtin.json'),
    },
    {
      match: (u) => u.hostname === 'api.nal.usda.gov' && u.pathname.endsWith('/food/2041155'),
      body: fixture('usda-food-2041155.json'),
    },
  ];
}
