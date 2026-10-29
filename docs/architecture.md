# Architecture

## Layout

```
packages/core/src/
├── index.ts            # Entry: serveStdio() or the HTTP transport
├── server.ts           # createServer(): one McpServer per connection/request
├── version.ts          # Version read from package.json
├── config/             # env.ts (zod-validated env), constants.ts (URLs, limits, DVs, thresholds)
├── providers/          # Product sources: openfoodfacts/, usda/, nutritionix/ (client + mapper + types)
├── services/           # product (merge), nutrition, allergen, comparison, price, recall, additive, daily-values
├── tools/              # One module per category + shared.ts (schemas, registerJsonTool helper)
├── resources/          # Guides, references and the nutri://product/{barcode} template
├── prompts/            # Prompt templates
├── ui/                 # MCP Apps view (product-view.html) and its resource
├── resilience/         # http.ts (fetchJson), circuit-breaker, rate-limiter, retry, cache
├── transport/          # http.ts (Streamable HTTP), logger.ts (stderr)
├── types/ errors/ utils/
```

## Request flow

```
MCP client ──▶ serveStdio / createMcpHandler (era negotiation: 2025 initialize or 2026-07-28)
                 │
                 ▼
            McpServer (SDK v2) ── validates input with the tool's zod schema
                 │
                 ▼
            registerJsonTool handler ── services ── providers ── fetchJson ──▶ upstream APIs
                 │
                 ▼
   { content: [text JSON, resource_link?], structuredContent }  (validated against outputSchema)
   or { isError: true, content: [message] }
```

- `registerJsonTool` (tools/shared.ts) converts results to plain JSON, sends them as `structuredContent` and as a text block, adds resource links, sets read-only annotations, and turns exceptions into `isError` results.
- The HTTP transport is stateless: `createMcpHandler(createServer)` builds a server per request; `toNodeHandler` adapts it to `node:http`. Origin checks and CORS run before the MCP handler.

## Resilience

`resilience/http.ts` `fetchJson(url, { provider, endpoint, allowNotFound, timeoutMs, init })` is the only way the server calls upstream APIs:

1. **Circuit breaker** per provider (`openfoodfacts`, `robotoff`, `openprices`, `usda`, `nutritionix`, `openfda`). Only 5xx, 429, network errors and timeouts count as failures; client errors do not.
2. **Token-bucket rate limit** per provider/endpoint (`RATE_LIMITS`); waits up to 8 s for a token.
3. **Timeout** (`REQUEST_TIMEOUT`) and **retries** (2, exponential backoff with jitter) on 429/5xx/network errors.
4. **404 → null** when `allowNotFound` is set (unknown barcode, no recalls).
5. Identifying **User-Agent** on every request.

An LRU cache (`CACHE_TTL`) stores products, searches, prices, recalls, the additives taxonomy and a short negative cache for unknown barcodes.

## Units and scoring

- All nutrient values are per 100 g / 100 ml (`perServing` when the serving size is known).
- `services/daily-values.ts` converts units before computing % Daily Value (FDA 2016 values in `DAILY_VALUES`).
- Concerns use UK FSA traffic-light thresholds; "good/excellent source" uses FDA 10 % / 20 % DV; `low_sodium` and `low_sugar` use EU claim thresholds.

## MCP Apps

`ui/product-view.html` is a dependency-free view implementing the MCP Apps postMessage protocol (`ui/initialize`, `ui/notifications/tool-result`, `ui/notifications/size-changed`). `getProductByBarcode` and `compareProducts` reference it via `_meta.ui.resourceUri`; hosts without MCP Apps ignore it. The build copies the HTML to `dist/ui/`.

## Adding a provider

1. Create `providers/<name>/` with a client extending `BaseProvider`, a mapper to `Product`, and raw types.
2. Override `isConfigured()` if it needs credentials; implement `getProductByBarcode`, `searchProducts` and `supports`.
3. Call upstream only through `this.fetchWithResilience(url, rateLimitKey, { allowNotFound, init })`.
4. Register the name everywhere providers are enumerated: `CIRCUIT_BREAKER` and `RATE_LIMITS` in `config/constants.ts`, `PROVIDER_LABELS` in `resilience/http.ts`, the `DataSource` type (`types/common.types.ts`), the `ProductProviderName` union in `providers/base.provider.ts`, and the provider list in `services/product.service.ts`.
5. Record a fixture in `tests/fixtures/`, add a route in `tests/helpers/fetch-stub.ts` and mapper tests.

## Testing

| Command | What it runs |
|---------|--------------|
| `pnpm --filter nutri-mcp test` | Unit tests and an integration suite that calls every tool over Streamable HTTP in both protocol eras, using recorded API fixtures |
| `pnpm --filter nutri-mcp test:coverage` | Same, with coverage thresholds |
| `pnpm --filter nutri-mcp test:live` | Smoke tests against the real APIs |
| `pnpm --filter nutri-mcp docs:tools` | Regenerates the tool reference from the server |

CI (`.github/workflows/ci.yml`) also runs the MCP Inspector CLI and the protocol scenarios of the official conformance suite. `release.yml` publishes to npm and the MCP Registry and attaches the `.mcpb` bundle.
