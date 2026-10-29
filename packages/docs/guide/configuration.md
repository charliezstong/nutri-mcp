# Configuration

Nutri-MCP is configured with environment variables. Everything is optional: with no configuration it runs over stdio using Open Food Facts, Open Prices, Robotoff and openFDA.

Variables are validated with Zod at startup (`src/config/env.ts`). An invalid value stops the server with a message such as:

```
Error: Invalid environment configuration:
  HTTP_PORT: Invalid input: expected number, received NaN
```

Empty strings are treated as "not set", which is convenient for MCP client configs and `.env` files.

## Transport

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSPORT` | `stdio` | `stdio` or `http` |
| `HTTP_PORT` | `3000` | Port for the HTTP transport (1-65535) |
| `HTTP_HOST` | `127.0.0.1` | Interface the HTTP transport binds to |
| `ALLOWED_ORIGINS` | not set | Comma-separated browser origins allowed to call `/mcp`; `*` allows any. When not set, only `localhost`, `127.0.0.1` and `[::1]` origins are allowed |

Requests without an `Origin` header (CLIs, server-to-server calls) are always accepted. See [HTTP Transport](/guide/http-transport).

## Data sources

| Variable | Default | Description |
|----------|---------|-------------|
| `OFF_CONTACT_EMAIL` | not set | Contact sent in the User-Agent (`nutri-mcp/<version> (<contact>)`). Open Food Facts asks API users to identify themselves; without it the repository URL is sent |
| `OFF_BASE_URL` | `https://world.openfoodfacts.org` | Open Food Facts server for product reads and legacy search. Use `https://world.openfoodfacts.net` for staging |
| `USDA_API_KEY` | not set | USDA FoodData Central key ([free sign-up](https://fdc.nal.usda.gov/api-key-signup)) |
| `NUTRITIONIX_APP_ID` | not set | Nutritionix application id (paid API) |
| `NUTRITIONIX_APP_KEY` | not set | Nutritionix application key (paid API) |

Open Food Facts, Open Prices, Robotoff and openFDA need no key.

## Feature flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_USDA` | `true` | Use USDA when `USDA_API_KEY` is set |
| `ENABLE_NUTRITIONIX` | `true` | Use Nutritionix when both Nutritionix variables are set; also registers `estimateNutritionFromText` |
| `ENABLE_RECALLS` | `true` | Register the `checkRecalls` tool (openFDA) |
| `ENABLE_CACHING` | `true` | Store upstream responses in the in-memory cache |

Boolean values accept `true`/`false`, `1`/`0`, `yes`/`no` and `on`/`off` (case-insensitive). Anything else is rejected at startup.

## Cache, timeouts and logging

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_MAX_SIZE` | `1000` | Maximum cache entries (100-100000); least recently used entries are evicted first |
| `REQUEST_TIMEOUT` | `10000` | Upstream request timeout in ms (1000-60000). Robotoff and the additives taxonomy use 20 s |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn` or `error` |
| `LOG_FILE` | not set | Also append log lines to this file. Logs always go to stderr; stdout is reserved for JSON-RPC |

Cache TTLs, rate limits, retry and circuit breaker settings are constants in `src/config/constants.ts`, not environment variables. See [Resilience](/guide/resilience).

## Examples

### Default (stdio, no keys)

```bash
npx -y nutri-mcp
```

### With USDA and a contact email

```bash
OFF_CONTACT_EMAIL=you@example.com USDA_API_KEY=your-usda-key npx -y nutri-mcp
```

### With every provider

```bash
OFF_CONTACT_EMAIL=you@example.com \
USDA_API_KEY=your-usda-key \
NUTRITIONIX_APP_ID=your-app-id \
NUTRITIONIX_APP_KEY=your-app-key \
npx -y nutri-mcp
```

### HTTP server for a browser app

```bash
TRANSPORT=http \
HTTP_PORT=8080 \
ALLOWED_ORIGINS=https://app.example.com \
npx -y nutri-mcp
```

### Against the Open Food Facts staging server

```bash
OFF_BASE_URL=https://world.openfoodfacts.net LOG_LEVEL=debug npx -y nutri-mcp
```

### Without recalls and USDA

```bash
ENABLE_RECALLS=false ENABLE_USDA=false npx -y nutri-mcp
```

## How sources are combined

For a barcode lookup, every configured product source (Open Food Facts, then USDA, then Nutritionix) is queried in parallel:

- The first product found, Open Food Facts when it knows the barcode, is the base record. Other sources only fill missing fields and nutrients; allergens and traces are merged.
- If no source knows the barcode, the tool reports `PRODUCT_NOT_FOUND`.
- If every source failed (for example all were unreachable), the error is surfaced instead of "not found".

Searches query the same sources (USDA and Nutritionix only for text queries) and deduplicate results by barcode, ignoring leading zeros.
