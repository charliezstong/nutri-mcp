# Nutri-MCP

Nutrition data for AI agents. Look up packaged foods by barcode or name and get nutrients, Nutri-Score, Green-Score, NOVA, allergens, diet compatibility, prices and recalls through one [Model Context Protocol](https://modelcontextprotocol.io) server.

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────────────────────┐
│ Claude Code     │     │                 │────▶│ Open Food Facts (products, scores)│
│ Claude Desktop  │────▶│    Nutri-MCP    │────▶│ Open Prices (crowdsourced prices) │
│ Any MCP host    │◀────│  38 tools, UI   │────▶│ openFDA (US food recalls)         │
└─────────────────┘     │                 │────▶│ USDA FoodData Central (optional)  │
                        └─────────────────┘────▶│ Nutritionix (optional, paid)      │
                                                └──────────────────────────────────┘
```

- **Correct numbers**: nutrients per 100 g and per serving, units normalized (mg, mcg), % Daily Value from FDA references, UK FSA traffic lights.
- **Scores**: Nutri-Score 2023 with its points breakdown, Green-Score (formerly Eco-Score, A+ to F), NOVA group.
- **Safety**: FDA Big 9 / EU 14 allergens (wheat inferred from gluten), traces, diet checks with evidence, additive risk (EFSA), US recalls.
- **Prices**: newest prices, per-currency statistics, monthly history, deals, price per kg/L.
- **Modern MCP**: structured output with schemas for every tool, read-only annotations, resource links, an interactive [MCP Apps](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) product card, and support for both 2025-era clients and the 2026-07-28 protocol.

## Quick start

### Claude Code

```bash
claude mcp add nutri-mcp -- npx -y nutri-mcp
```

Ask: *"What's the nutrition for barcode 3017620422003?"* or *"Find a healthier alternative to Prince biscuits."*

> The npm package is published from tags by the release workflow. Until the first release, run it from source (below).

### Claude Desktop

Download `nutri-mcp-<version>.mcpb` from the [releases](https://github.com/charliezstong/nutri-mcp/releases) and open it, or build it yourself with `pnpm --filter nutri-mcp pack:mcpb`. Optional API keys are asked for in the install dialog.

### From source

```bash
git clone https://github.com/charliezstong/nutri-mcp.git
```

```bash
cd nutri-mcp && pnpm install && pnpm --filter nutri-mcp build
```

```bash
claude mcp add nutri-mcp -- node "$(pwd)/packages/core/dist/index.js"
```

## Optional API keys

Open Food Facts, Open Prices and openFDA need no key.

```bash
claude mcp add nutri-mcp \
  -e OFF_CONTACT_EMAIL=you@example.com \
  -e USDA_API_KEY=your-key \
  -- npx -y nutri-mcp
```

- `OFF_CONTACT_EMAIL`: sent in the User-Agent; Open Food Facts asks API users to identify themselves.
- `USDA_API_KEY`: free at [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup). Adds US branded foods (matched by GTIN, ignoring leading zeros) and fills nutrient gaps.
- `NUTRITIONIX_APP_ID` / `NUTRITIONIX_APP_KEY`: Nutritionix no longer has a public free tier. When set, adds the `estimateNutritionFromText` tool ("2 eggs and a slice of toast").

## Tools

38 read-only tools (plus one with Nutritionix). Full reference with real example outputs: [docs/tools.md](https://github.com/charliezstong/nutri-mcp/blob/main/docs/tools.md).

| Category | Tools |
|----------|-------|
| Product | `getProductByBarcode`, `searchProducts` (text, brand, category, max Nutri-Score, max NOVA), `estimateNutritionFromText`* |
| Nutrition | `analyzeNutrition`, `getNutriScore`, `getGreenScore`, `calculateDailyIntake`, `getMacroBreakdown`, `getNutrientDensity`, `analyzeMeal`, `getNovaGroup` |
| Allergens & diets | `checkAllergen`, `checkMultipleAllergens`, `checkBig9`, `checkEU14`, `getAllAllergens`, `getCrossContaminationRisk`, `checkDietCompliance`, `getAdditivesInfo` |
| Comparison | `compareProducts`, `findHealthierAlternative`, `compareNutrientDensity`, `rankByNutrient` |
| Prices | `getProductPrices`, `searchPrices`, `getPriceStats`, `findBestPrice`, `comparePrices`, `getRecentPrices`, `getPriceHistory`, `findDeals` |
| Recipes & meals | `suggestRecipes`, `substituteIngredient`, `analyzeMealPlan`, `calculateMealCost` |
| Insights | `getProductInsights`, `getAIQuestions`, `qualityCheck` |
| Safety | `checkRecalls` (openFDA, US) |

\* only with Nutritionix credentials.

Every tool returns `structuredContent` validated against its `outputSchema`, plus the same JSON as text. `getProductByBarcode` and `compareProducts` link to an interactive view (`ui://nutri-mcp/product-view.html`) that MCP Apps hosts render as a card.

**Resources**: `nutri://guides/{nutriscore,greenscore,nova,allergens}`, `nutri://reference/daily-values`, `nutri://reference/traffic-lights`, and `nutri://product/{barcode}`.
**Prompts**: `analyze-product`, `compare-products`, `find-alternatives`, `check-allergens`, `plan-meal`, `check-diet`.

## Example

`getNutriScore({ "barcode": "7622210449283" })`

```json
{
  "product": { "barcode": "7622210449283", "name": "Prince" },
  "available": true,
  "nutriScore": {
    "grade": "E",
    "score": 20,
    "version": "2023",
    "negative": [
      { "id": "energy", "value": 1962, "unit": "kJ", "points": 5, "pointsMax": 10 },
      { "id": "sugars", "value": 32, "unit": "g", "points": 9, "pointsMax": 15 },
      { "id": "saturated_fat", "value": 5.6, "unit": "g", "points": 5, "pointsMax": 10 },
      { "id": "salt", "value": 0.49, "unit": "g", "points": 2, "pointsMax": 20 }
    ],
    "positive": [
      { "id": "fiber", "value": 4, "unit": "g", "points": 1, "pointsMax": 5 },
      { "id": "fruits_vegetables_legumes", "value": 0, "unit": "%", "points": 0, "pointsMax": 5 }
    ]
  },
  "meaning": "Lowest nutritional quality"
}
```

## HTTP mode

```bash
TRANSPORT=http HTTP_PORT=3000 npx -y nutri-mcp
```

- `POST /mcp`: Streamable HTTP, stateless; serves 2025-era clients and the 2026-07-28 protocol.
- `GET /health`: status, version, enabled sources and circuit breakers.
- Binds to `127.0.0.1` by default (`HTTP_HOST`). Browser origins other than localhost get `403` unless listed in `ALLOWED_ORIGINS`.

```bash
curl -s localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2025-06-18' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"getNovaGroup","arguments":{"barcode":"3017620422003"}}}'
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSPORT` | `stdio` | `stdio` or `http` |
| `HTTP_PORT` / `HTTP_HOST` | `3000` / `127.0.0.1` | HTTP listener |
| `ALLOWED_ORIGINS` | – | Comma-separated browser origins (`*` for any) |
| `OFF_CONTACT_EMAIL` | – | Contact in the User-Agent sent to Open Food Facts |
| `OFF_BASE_URL` | `https://world.openfoodfacts.org` | Use `https://world.openfoodfacts.net` for staging |
| `USDA_API_KEY` | – | USDA FoodData Central key |
| `NUTRITIONIX_APP_ID` / `NUTRITIONIX_APP_KEY` | – | Nutritionix credentials (paid) |
| `ENABLE_USDA` / `ENABLE_NUTRITIONIX` / `ENABLE_RECALLS` / `ENABLE_CACHING` | `true` | Feature switches (`true`/`false`) |
| `CACHE_MAX_SIZE` | `1000` | Cached responses |
| `REQUEST_TIMEOUT` | `10000` | Upstream timeout (ms) |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` (logs go to stderr) |
| `LOG_FILE` | – | Also append logs to this file |

## How it works

1. Each barcode lookup queries every configured source in parallel. Open Food Facts is the base record; USDA and Nutritionix fill gaps. "Not found" and "source unavailable" are reported differently.
2. Upstream calls share one resilient client: per-source circuit breaker, token-bucket rate limits that match Open Food Facts (15 product reads and 10 searches per minute), timeouts, retries on 429/5xx, and an LRU cache (including a short negative cache for unknown barcodes).
3. Values are normalized to per 100 g with consistent units before any calculation.

## Development

```bash
pnpm install
```

```bash
pnpm --filter nutri-mcp test          # 200+ fixture-based unit and integration tests
```

```bash
pnpm --filter nutri-mcp test:live     # smoke tests against the real APIs
```

```bash
pnpm --filter nutri-mcp inspect       # MCP Inspector
```

```bash
pnpm --filter nutri-mcp docs:tools    # regenerate the tool reference
```

```bash
pnpm docs:dev                         # VitePress site at localhost:5173
```

CI runs lint, typecheck and tests on Node 20/22/24, an Inspector CLI check and the MCP conformance protocol scenarios. Pushing a `v*` tag publishes to npm and the [MCP Registry](https://registry.modelcontextprotocol.io) (`io.github.charliezstong/nutri-mcp`) and attaches the `.mcpb` bundle to the GitHub release.

```
nutri-mcp/
├── packages/core     # MCP server (npm: nutri-mcp)
└── packages/docs     # VitePress docs
```

## Data and licenses

Open Food Facts and Open Prices data are available under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/). openFDA data is public domain; FDA asks not to rely on it for medical decisions. Allergen and diet answers are based on label data that can be incomplete: people with severe allergies should always check the package.

## License

MIT
