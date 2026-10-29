# Architecture

Nutri-MCP is a TypeScript MCP server built on `@modelcontextprotocol/server` v2 and Zod 4. Tools validate their input, call services, and services call upstream APIs through providers and one shared resilient HTTP client.

## Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│ MCP host (Claude Code, Claude Desktop, any client)                   │
└───────────────┬──────────────────────────────────────┬───────────────┘
                │ stdio (serveStdio)                   │ Streamable HTTP
                │                                      │ (createMcpHandler + toNodeHandler)
┌───────────────▼──────────────────────────────────────▼───────────────┐
│ createServer()  src/server.ts                                        │
│  Tools (38 + 1 optional)   Resources + MCP Apps view    Prompts (6)  │
├──────────────────────────────────────────────────────────────────────┤
│ Services   Product · Nutrition · Allergen · Comparison · Price ·     │
│            Recall · Additive · daily-values                          │
├──────────────────────────────────────────────────────────────────────┤
│ Providers  OpenFoodFacts · USDA · Nutritionix   (extend BaseProvider)│
├──────────────────────────────────────────────────────────────────────┤
│ Resilience fetchJson: circuit breaker · rate limiter · timeout ·     │
│            retry   +  LRU cache                                      │
└──────────────────────────────────────────────────────────────────────┘
       │ Open Food Facts · search-a-licious · Robotoff · Open Prices ·
       ▼ openFDA · USDA FoodData Central · Nutritionix
```

## Source layout

```
packages/core/
├── src/
│   ├── index.ts            # Entry point: picks stdio or HTTP from TRANSPORT
│   ├── server.ts           # createServer(): registers tools, resources, prompts
│   ├── version.ts          # VERSION (read from package.json), SERVER_NAME
│   ├── config/
│   │   ├── env.ts          # Zod-validated environment variables
│   │   └── constants.ts    # API URLs, rate limits, TTLs, breakers, Daily Values, thresholds
│   ├── tools/              # One folder per category + shared.ts (schemas, registerJsonTool)
│   │   ├── product/  nutrition/  allergen/  comparison/
│   │   └── price/  recipe/  insights/  safety/
│   ├── resources/          # nutri://guides/*, nutri://reference/*, nutri://product/{barcode}
│   ├── prompts/            # The six prompts
│   ├── ui/                 # MCP Apps product view (product-view.html)
│   ├── services/           # Business logic
│   ├── providers/          # base.provider.ts + openfoodfacts/ usda/ nutritionix/
│   │                       #   (client.ts, mapper.ts, types.ts each)
│   ├── resilience/         # http.ts, circuit-breaker.ts, rate-limiter.ts, retry.ts, cache.ts
│   ├── transport/          # http.ts (Streamable HTTP), logger.ts (stderr + LOG_FILE)
│   ├── types/              # Product, Nutrient, Price and common types
│   ├── errors/             # NutriMcpError subclasses, formatErrorForMcp
│   └── utils/              # Barcode validation and GTIN matching, sanitizing, text helpers
├── tests/                  # unit/, integration/, live/, fixtures/, helpers/
├── scripts/                # generate-tool-docs.ts, pack-mcpb.mjs, copy-assets.mjs
├── mcpb/                   # .mcpb manifest template and icon
└── server.json             # MCP Registry metadata
```

## Server factory

`createServer()` builds an `McpServer` with name `nutri-mcp`, a title, description, website URL, icon and short instructions for the model (start with `searchProducts`, values are per 100 g, label data may be incomplete, prices are never mixed across currencies, recalls are US-only). It then registers:

- the tool categories (`registerProductTools`, `registerNutritionTools`, ..., and `registerSafetyTools` only when `ENABLE_RECALLS` is true),
- the resources and the MCP Apps view,
- the prompts.

The same factory serves both transports and both protocol eras:

- **stdio**: `serveStdio(() => createServer())` from `@modelcontextprotocol/server/stdio`.
- **HTTP**: `createMcpHandler(factory)` wrapped with `toNodeHandler` and a small Node `http` server that adds `/health`, `/`, CORS and the Origin check. The handler is stateless and creates a server per request.

## Tools

All tools are registered through `registerJsonTool()` in `src/tools/shared.ts`, which:

1. registers the tool with its Zod `inputSchema` and `outputSchema`,
2. adds annotations: `title`, `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, and `openWorldHint: true` for tools that call external APIs (`false` for `substituteIngredient`, which is computed locally),
3. converts the handler result to plain JSON (dates become ISO strings) and returns it as `structuredContent` plus a JSON text block,
4. turns thrown errors into `isError: true` results with a readable message.

Product tools also return a `resource_link` to `nutri://product/{barcode}`. `getProductByBarcode` and `compareProducts` set `_meta.ui.resourceUri` (and the older flat `ui/resourceUri` key) to `ui://nutri-mcp/product-view.html`. `estimateNutritionFromText` is only registered when Nutritionix is configured.

Shared input schemas enforce barcodes of 6-14 digits, allergen and diet enums, ISO 4217 currencies and ISO 3166-1 alpha-2 country codes (both upper-cased).

## Request flow

```
tools/call getNutriScore { barcode: "7622210449283" }
  │
  ├─ SDK validates the arguments against inputSchema (invalid → isError result)
  ├─ ProductService.requireByBarcode()
  │    ├─ Open Food Facts, USDA, Nutritionix in parallel (configured sources only)
  │    │    each: cache → fetchJson (breaker → rate limit → fetch with timeout + retries)
  │    │    → mapper → normalized Product (per 100 g, mg/mcg, %DV)
  │    └─ mergeProducts(): first product is the base, others fill gaps
  ├─ tool logic / services compute the result
  └─ registerJsonTool returns { content: [text, resource_link?], structuredContent }
```

### Merging sources

`ProductService.getByBarcode()` uses `Promise.allSettled` over the configured providers:

- Products found are merged by `mergeProducts()`: the first one (Open Food Facts when available) keeps its fields; missing fields (brand, quantity, serving size, ingredients, images, ids) come from the others; nutrients are merged by id; allergens and traces are unioned; `sources` lists every contributor.
- If no source knows the barcode, it returns `null` and tools raise `PRODUCT_NOT_FOUND`.
- If every source failed, the first error is thrown instead, so "unavailable" is not reported as "not found".

`ProductService.search()` queries the same providers, keeps the successful answers and deduplicates by barcode (ignoring leading zeros).

## Services

| Service | File | Responsibility |
|---------|------|----------------|
| `ProductService` | `product.service.ts` | Multi-source lookup, merge, search, `getMany` |
| `NutritionService` | `nutrition.service.ts` | Calories, macros, %DV summary, UK FSA traffic lights, concerns, benefits, nutrient density |
| `AllergenService` | `allergen.service.ts` | Allergen checks (Big 9, EU 14, implied wheat), cross-contamination, diet compliance |
| `ComparisonService` | `comparison.service.ts` | Comparisons, winner, healthier alternative, rankings |
| `PriceService` | `price.service.ts` | Open Prices queries, per-currency statistics, history, comparisons, price per kg/L |
| `RecallService` | `recall.service.ts` | openFDA food enforcement search by barcode variants and text |
| `AdditiveService` | `additive.service.ts` | Additive names, classes and EFSA risk from the OFF taxonomy |
| `daily-values` | `daily-values.ts` | Unit conversion and %DV against FDA Daily Values |

See the [Services API](/api/services).

## Providers

Product providers extend `BaseProvider` and map upstream responses to the normalized `Product` type:

| Provider | Endpoints |
|----------|-----------|
| `OpenFoodFactsProvider` | Product API v3.4 (`{OFF_BASE_URL}/api/v3.4/product/{barcode}`), search-a-licious (`search.openfoodfacts.org/search`), legacy `cgi/search.pl` as fallback |
| `USDAProvider` | FoodData Central `foods/search` (Branded, GTIN match ignoring leading zeros) and `food/{fdcId}` |
| `NutritionixProvider` | `search/item?upc=`, `search/instant`, `natural/nutrients` |

Robotoff (insights tools), Open Prices (`PriceService`), openFDA (`RecallService`) and the additives taxonomy (`AdditiveService`) are called directly with `fetchJson`. See the [Providers API](/api/providers).

## Logging

The logger never writes to stdout, which carries JSON-RPC on stdio. Every line goes to stderr as `<ISO timestamp> [LEVEL] [prefix] message {meta}`, filtered by `LOG_LEVEL`, and is optionally appended to `LOG_FILE`.

## Errors

| Class | Code | Retryable | When |
|-------|------|-----------|------|
| `ProductNotFoundError` | `PRODUCT_NOT_FOUND` | no | No source knows the barcode |
| `InvalidBarcodeError` | `INVALID_BARCODE` | no | Barcode is not 6-14 digits |
| `ValidationError` | `VALIDATION_ERROR` | no | Available for argument errors (input schemas normally reject bad arguments first) |
| `ProviderUnavailableError` | `PROVIDER_UNAVAILABLE` | yes | The source's circuit breaker is open |
| `ApiError` | `API_ERROR` | for 429/5xx | Upstream returned an HTTP error |

All extend `NutriMcpError` (`code`, `retryable`). `formatErrorForMcp()` turns them into `{ content: [{ type: 'text', text: 'Error [CODE]: message' }], isError: true }`. Other errors, such as `RateLimitError` when no rate-limit token frees up within 8 s, become `Error: message`.

## Testing and CI

```bash
pnpm --filter nutri-mcp test
```

Runs 200+ fixture-based Vitest tests: unit tests for mappers, services and resilience, and integration tests that call every tool, resource and prompt through the real HTTP handler in both protocol eras (2025 `initialize` and 2026-07-28), with `fetch` stubbed from `tests/fixtures`.

```bash
pnpm --filter nutri-mcp test:live
```

Runs smoke tests against the real APIs (`LIVE_TESTS=1`).

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests with coverage and the build on Node 20, 22 and 24; lists tools with the MCP Inspector CLI over stdio; starts the HTTP server and runs the MCP conformance protocol scenarios (`server-initialize`, `ping`, `tools-list`, `resources-list`, `prompts-list`, `dns-rebinding-protection`). A weekly scheduled job runs the live tests.

The tool reference in `packages/docs/tools/` is generated from the server code:

```bash
pnpm --filter nutri-mcp docs:tools
```
