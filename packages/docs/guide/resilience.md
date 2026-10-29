# Resilience

Every upstream call (Open Food Facts, Robotoff, Open Prices, USDA, Nutritionix, openFDA) goes through one function, `fetchJson()` in `src/resilience/http.ts`. It combines a circuit breaker, a token-bucket rate limiter, a timeout and retries. Responses are cached by the callers in a shared LRU cache.

All settings are constants in `src/config/constants.ts`; only the cache size, caching on/off and the timeout are configurable through [environment variables](/guide/configuration).

## Request pipeline

```
fetchJson(url, { provider, endpoint, allowNotFound, init, timeoutMs })
  │
  ├─ 1. Circuit breaker for `provider` open?      → ProviderUnavailableError
  ├─ 2. Wait up to 8 s for a rate-limit token      → RateLimitError if none
  ├─ 3. fetch() with User-Agent and timeout
  │      ├─ 404 and allowNotFound                  → null
  │      ├─ non-2xx                                → ApiError(status)
  │      └─ retry on 429 / 5xx / network / timeout (max 2 retries)
  └─ 4. Success → breaker.recordSuccess()
        Failure → breaker.recordFailure() only for 429, 5xx, network errors and timeouts
```

Every request sends `Accept: application/json` and `User-Agent: nutri-mcp/<version> (<OFF_CONTACT_EMAIL or repository URL>)`, as Open Food Facts requires. API keys are redacted from logged URLs.

## Circuit breaker

One breaker per upstream service (`src/resilience/circuit-breaker.ts`):

```
            failures >= threshold
  CLOSED ───────────────────────────▶ OPEN
    ▲                                   │ after timeoutMs
    │ successThreshold successes        ▼
    └──────────────────────────── HALF_OPEN ── any failure ──▶ OPEN
```

| Provider | Failure threshold | Success threshold (half-open) | Open for |
|----------|-------------------|-------------------------------|----------|
| `openfoodfacts` | 5 | 2 | 30 s |
| `robotoff` | 5 | 2 | 60 s |
| `openprices` | 5 | 2 | 60 s |
| `usda` | 3 | 2 | 60 s |
| `nutritionix` | 3 | 2 | 60 s |
| `openfda` | 3 | 2 | 60 s |

A success in the closed state resets the failure count. Client errors (4xx other than 429) and local rate-limit timeouts do **not** count as failures, so a bad barcode or query cannot open the breaker. While a breaker is open, calls fail fast with `PROVIDER_UNAVAILABLE`; for barcode lookups the other sources still answer.

Breaker state is visible in `GET /health` in HTTP mode.

## Rate limiting

A token bucket per provider and endpoint (`src/resilience/rate-limiter.ts`), refilled continuously over the window. When the bucket is empty, a request waits for a token for up to **8 seconds** (`RATE_LIMIT_MAX_WAIT_MS`) and then fails with `RateLimitError`.

| Provider | Bucket | Limit |
|----------|--------|-------|
| `openfoodfacts` | `product` (product reads, additives taxonomy) | 15 / minute |
| `openfoodfacts` | `search` (search-a-licious and legacy search) | 10 / minute |
| `robotoff` | `all` | 60 / minute |
| `openprices` | `all` | 60 / minute |
| `usda` | `all` | 1000 / hour |
| `nutritionix` | `all` | 200 / day |
| `openfda` | `all` | 240 / minute |

The Open Food Facts limits match its [documented quotas](https://openfoodfacts.github.io/openfoodfacts-server/api/) (15 product reads and 10 searches per minute per IP). Limits are per process and shared by all clients of an HTTP server.

## Timeouts

| Calls | Timeout |
|-------|---------|
| Default | `REQUEST_TIMEOUT` ms (10 s by default) |
| Robotoff insights and questions | 20 s |
| Open Food Facts additives taxonomy | 20 s |

## Retries

`withRetry()` (`src/resilience/retry.ts`) retries up to **2 times** (3 attempts in total) on:

- HTTP 429, 500, 502, 503, 504,
- network errors (`TypeError: fetch failed`, `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `ECONNREFUSED`),
- timeouts and aborts.

The delay is exponential with jitter: 500 ms × 2<sup>attempt−1</sup> plus 0-30 %, capped at 8 s (about 0.5 s, then 1 s). Other 4xx responses are not retried.

## Cache

An in-memory LRU cache (`src/resilience/cache.ts`) shared by all providers and services. `CACHE_MAX_SIZE` (default 1000) limits the number of entries; the least recently used entry is evicted when full. `ENABLE_CACHING=false` stops storing entries.

| Category | TTL | Used for |
|----------|-----|----------|
| `product` | 30 min | Product records (OFF, USDA, Nutritionix) |
| `search` | 5 min | Search result pages |
| `price` | 1 hour | Open Prices queries |
| `taxonomy` | 24 hours | Open Food Facts additives taxonomy |
| `robotoff` | 30 min | Defined, but Robotoff responses are currently not cached |
| `recall` | 6 hours | openFDA queries (openFDA updates weekly) |
| `notFound` | 5 min | Negative cache for barcodes a source does not know |

Entries are marked stale after 80 % of their TTL; providers then fetch fresh data instead of serving the stale entry. The negative cache means repeated lookups of an unknown barcode do not use up the Open Food Facts quota.

## Graceful degradation

- Barcode lookups query all configured sources in parallel. If Open Food Facts is down but USDA knows the product, the USDA record is returned; only when every source fails is the error surfaced.
- Product search falls back from search-a-licious to the legacy `cgi/search.pl` endpoint when the former fails.
- If the additives taxonomy cannot be loaded, `getAdditivesInfo` still returns the additive codes, without names and risk levels.

## Monitoring

```bash
LOG_LEVEL=debug npx -y nutri-mcp
```

Failed upstream requests are logged as warnings with the URL (keys redacted) and the error. In HTTP mode, `GET /health` returns the enabled sources and the state of every circuit breaker used so far:

```json
{
  "status": "healthy",
  "version": "0.2.0",
  "timestamp": "2026-10-29T16:39:28.526Z",
  "sources": ["openfoodfacts"],
  "circuitBreakers": {
    "openfoodfacts": { "failures": 0, "successes": 0, "lastSuccess": "2026-10-29T16:38:50.151Z", "state": "CLOSED" }
  }
}
```
