# Resilience

Nutri-MCP includes a resilience layer to handle API failures, rate limits, and network issues.

## Components

### LRU Cache

In-memory cache with Least Recently Used eviction:

```typescript
const cache = new LRUCache(1000); // Max 1000 entries

// Set with TTL by type
cache.set('product:123', product, 'product');  // 1 hour TTL
cache.set('search:chocolate', results, 'search'); // 30 min TTL

// Get (returns null if expired or missing)
const cached = cache.get<Product>('product:123');

// Clear all
cache.clear();
```

#### TTL Configuration

| Type | Default TTL | Environment Variable |
|------|-------------|---------------------|
| product | 1 hour | `CACHE_TTL_PRODUCT` |
| search | 30 minutes | `CACHE_TTL_SEARCH` |
| nutrition | 1 hour | `CACHE_TTL_NUTRITION` |

### Circuit Breaker

Prevents cascading failures when APIs are down:

```
State Transitions:

     ┌──────────────────────────────────────────┐
     │                                          │
     ▼                                          │
┌─────────┐  failure >= threshold  ┌─────────┐  │
│ CLOSED  │───────────────────────▶│  OPEN   │  │
└─────────┘                        └─────────┘  │
     ▲                                  │       │
     │                          timeout │       │
     │                                  ▼       │
     │        success           ┌───────────┐  │
     └──────────────────────────│ HALF_OPEN │──┘
                   failure      └───────────┘
```

#### Configuration

| Setting | Default | Environment Variable |
|---------|---------|---------------------|
| Failure threshold | 5 | `CB_FAILURE_THRESHOLD` |
| Reset timeout | 30 seconds | `CB_RESET_TIMEOUT` |

#### Usage

```typescript
const breaker = new CircuitBreaker('openfoodfacts');

const result = await breaker.execute(async () => {
  return await fetchProduct(barcode);
});

// States
breaker.isOpen();    // true if circuit is open
breaker.isClosed();  // true if circuit is closed
breaker.reset();     // manually reset to closed
```

### Rate Limiter

Respects API quotas automatically:

```typescript
const limiter = new RateLimiter();

// Acquire before making request
await limiter.acquire('openfoodfacts');

// Check remaining quota
const remaining = limiter.remaining('usda');
```

#### Default Limits

| Provider | Requests | Window |
|----------|----------|--------|
| Open Food Facts | 100 | 1 minute |
| USDA | 1000 | 1 hour |
| Nutritionix | 50 | 1 day |

Configure with environment variables:
- `RATE_LIMIT_OFF`
- `RATE_LIMIT_USDA`
- `RATE_LIMIT_NUTRITIONIX`

### Retry with Exponential Backoff

Handles transient failures:

```typescript
const result = await retry(
  async () => fetchProduct(barcode),
  {
    maxRetries: 3,
    initialDelay: 1000,    // 1 second
    maxDelay: 10000,       // 10 seconds
    backoffMultiplier: 2,  // Double each retry
  }
);
```

#### Retry Schedule

| Attempt | Delay |
|---------|-------|
| 1 | 1 second |
| 2 | 2 seconds |
| 3 | 4 seconds |

Only retries on:
- Network errors
- 5xx server errors
- 429 rate limit responses

Does not retry on:
- 4xx client errors (except 429)
- Validation errors
- Circuit breaker open

## Integration

All resilience components work together:

```typescript
async function fetchWithResilience(barcode: string) {
  // 1. Check cache
  const cacheKey = `product:${barcode}`;
  const cached = cache.get<Product>(cacheKey);
  if (cached) return cached;

  // 2. Check circuit breaker
  return circuitBreaker.execute('openfoodfacts', async () => {
    // 3. Apply rate limiting
    await rateLimiter.acquire('openfoodfacts');

    // 4. Retry on failure
    const product = await retry(async () => {
      const response = await fetch(`${API_URL}/products/${barcode}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });

    // 5. Cache result
    cache.set(cacheKey, product, 'product');

    return product;
  });
}
```

## Monitoring

### Logging

Enable debug logging to see resilience events:

```bash
LOG_LEVEL=debug npx nutri-mcp
```

Output includes:
- Cache hits and misses
- Circuit breaker state changes
- Rate limiter queue status
- Retry attempts

### Health Check

The `/health` endpoint reports provider status:

```json
{
  "status": "healthy",
  "providers": {
    "openfoodfacts": "available",
    "usda": "available",
    "nutritionix": "circuit_open"
  },
  "cache": {
    "size": 450,
    "maxSize": 1000
  }
}
```

## Best Practices

1. **Use appropriate TTLs** - Product data changes rarely, search results more often
2. **Monitor circuit breakers** - Open circuits indicate upstream issues
3. **Size cache appropriately** - Balance memory vs hit rate
4. **Set realistic rate limits** - Stay well under API quotas
5. **Handle degraded mode** - Application should work with partial data
