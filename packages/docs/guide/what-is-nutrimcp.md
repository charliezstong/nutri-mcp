# What is Nutri-MCP?

Nutri-MCP is a [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that gives AI assistants accurate, up-to-date data about packaged food: nutrients, scores, allergens, diet compatibility, prices and recalls.

It is published on npm as `nutri-mcp` (version 0.2.0), requires Node.js 20 or later and is built on the MCP TypeScript SDK v2 (`@modelcontextprotocol/server` 2.4) with Zod 4.

## Why

Language models know general nutrition facts but not the label of a specific product, its current Nutri-Score, whether it was recalled last week or what it costs in a given country. Nutri-MCP looks this up in open databases, normalizes the numbers and returns structured results the model can reason about.

## Data sources

| Source | What it provides | Key |
|--------|------------------|-----|
| [Open Food Facts](https://world.openfoodfacts.org) | Base product record (product API v3.4): name, brand, categories, nutrients, Nutri-Score 2023 with components, Green-Score (formerly Eco-Score), NOVA group, ingredients, allergens, traces, additives, images | None |
| Open Food Facts search-a-licious | Product search (`search.openfoodfacts.org`), with fallback to the legacy `cgi/search.pl` endpoint | None |
| Open Food Facts additives taxonomy | Additive names, classes and EFSA over-exposure risk | None |
| [Robotoff](https://robotoff.openfoodfacts.org) | Machine-learning insights and verification questions | None |
| [Open Prices](https://prices.openfoodfacts.org) | Crowdsourced prices backed by receipts and price tags | None |
| [openFDA food enforcement](https://open.fda.gov/apis/food/enforcement/) | US food recalls | None |
| [USDA FoodData Central](https://fdc.nal.usda.gov) | US branded foods, matched by GTIN ignoring leading zeros; fills nutrient gaps | Optional, free |
| [Nutritionix](https://www.nutritionix.com) | Barcode and text search, natural-language nutrition (`estimateNutritionFromText`) | Optional, paid (no public free tier) |

## What you get

### Tools

38 read-only tools, plus `estimateNutritionFromText` when Nutritionix credentials are set. `checkRecalls` can be switched off with `ENABLE_RECALLS=false`.

| Category | Tools |
|----------|-------|
| [Product](/tools/product) | 2 (+1 with Nutritionix) |
| [Nutrition](/tools/nutrition) | 8 |
| [Allergen & Diet](/tools/allergen) | 8 |
| [Comparison](/tools/comparison) | 4 |
| [Price](/tools/price) | 8 |
| [Recipe & Meal](/tools/recipe) | 4 |
| [Insights](/tools/insights) | 3 |
| [Safety](/tools/safety) | 1 |

Every tool declares an `outputSchema` and returns `structuredContent` plus the same JSON as text, and carries annotations (`readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, and `openWorldHint` depending on whether it calls external APIs). Failures such as an unknown barcode come back as tool results with `isError: true` and a message like `Error [PRODUCT_NOT_FOUND]: Product not found: 0000000000017`.

### Resources

| URI | Content |
|-----|---------|
| `nutri://guides/nutriscore` | How Nutri-Score (2023) works |
| `nutri://guides/greenscore` | How the Green-Score works |
| `nutri://guides/nova` | NOVA processing groups |
| `nutri://guides/allergens` | FDA Big 9, EU 14 and hidden allergen names |
| `nutri://reference/daily-values` | FDA Daily Values used for %DV (JSON) |
| `nutri://reference/traffic-lights` | UK FSA traffic light thresholds (JSON) |
| `nutri://product/{barcode}` | Normalized product record (template) |
| `ui://nutri-mcp/product-view.html` | Interactive product card and comparison table ([MCP Apps](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/), `text/html;profile=mcp-app`) |

`getProductByBarcode` and `compareProducts` reference the product view through `_meta.ui.resourceUri`, so hosts that render MCP Apps show a card; other hosts ignore it. Product lookups also return a `resource_link` to `nutri://product/{barcode}`.

### Prompts

`analyze-product`, `compare-products`, `find-alternatives`, `check-allergens`, `plan-meal` and `check-diet`. Each prompt walks the model through the relevant tools.

## How numbers are normalized

- Nutrient values are **per 100 g (or 100 ml)**; `perServing` is added when the serving size is known.
- Open Food Facts reports nutrients in grams; sodium, cholesterol, minerals and vitamins are converted to mg or mcg.
- **% Daily Value** uses the FDA Daily Values for adults (2,000 kcal diet, 21 CFR 101.9).
- **Traffic lights** (fat, saturated fat, sugars, salt) use UK FSA thresholds per 100 g.
- The `low_sodium` and `low_sugar` diet checks use EU nutrition-claim thresholds (Regulation 1924/2006).
- Prices are never mixed across currencies.

## Protocol support

The same server factory (`createServer()` in `src/server.ts`) serves:

- **2025-era clients** that start with an `initialize` handshake (for example protocol versions 2025-06-18 and 2025-11-25), and
- **2026-07-28 clients** using the stateless revision,

over **stdio** (default) or **Streamable HTTP** (`TRANSPORT=http`, stateless, endpoint `/mcp`).

## How it works

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────────────┐
│ Claude Code     │     │      Nutri-MCP       │────▶│ Open Food Facts + Robotoff  │
│ Claude Desktop  │────▶│ tools · resources ·  │────▶│ Open Prices                 │
│ Any MCP host    │◀────│ prompts · UI view    │────▶│ openFDA (US recalls)        │
└─────────────────┘     │                      │────▶│ USDA FoodData Central (opt.)│
                        └──────────────────────┘────▶│ Nutritionix (opt., paid)    │
                                                     └─────────────────────────────┘
```

1. A barcode lookup queries every configured product source in parallel. Open Food Facts provides the base record; USDA and Nutritionix only fill gaps.
2. All upstream calls go through one resilient HTTP client: circuit breaker per source, token-bucket rate limits, timeouts, retries and an LRU cache.
3. Services compute the analysis (Daily Values, traffic lights, comparisons, diet checks, price statistics) on the normalized data.

::: warning Label data
Allergen and diet answers are based on label data that can be incomplete. People with severe allergies should always check the package.
:::

## Next steps

- [Getting Started](/guide/getting-started): add the server to Claude Code
- [Tools Overview](/tools/overview): every tool with parameters and example output
- [Architecture](/guide/architecture): how the code is organized
