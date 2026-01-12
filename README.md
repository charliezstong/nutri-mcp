# Nutri-MCP

Nutrition data for AI agents. Query 4M+ food products from Open Food Facts, USDA, and Nutritionix through a single MCP server.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────┐
│   Claude Code   │────▶│   Nutri-MCP     │────▶│   Open Food Facts (3M+) │
│   Agno Agent    │◀────│     Server      │────▶│   USDA FoodData (400K+) │
│   Any MCP Host  │     │                 │────▶│   Nutritionix (900K+)   │
└─────────────────┘     └─────────────────┘     └─────────────────────────┘
```

## Quick Start

```bash
# Add to Claude Code (no install needed)
claude mcp add nutri-mcp -- npx nutri-mcp

# Verify
claude mcp list
```

Ask Claude: *"What's the nutrition for barcode 3017620422003?"*

## With API Keys

Open Food Facts works without keys. Add USDA for better micronutrient data:

```bash
claude mcp add nutri-mcp \
  -e USDA_API_KEY=your-key \
  -- npx nutri-mcp
```

Get a free USDA key: [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup.html)

## Tools

35 tools across 7 categories:

| Category | Tools | What it does |
|----------|-------|--------------|
| Product | 2 | `getProduct`, `searchProducts` |
| Nutrition | 8 | Macros, daily values, Nutri-Score, NOVA, Eco-Score |
| Allergen | 8 | Detection, alternatives, diet compatibility |
| Comparison | 4 | Side-by-side, healthier alternatives, rankings |
| Price | 6 | Retailer prices, deals, price history |
| Recipe | 4 | Recipe analysis, scaling, substitutes |
| Insights | 3 | Category trends, brand analysis |

## How It Works

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             Nutri-MCP                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   getProduct("3017620422003")                                            │
│          │                                                               │
│          ▼                                                               │
│   ┌──────────────┐                                                       │
│   │   Cache?     │──── hit ───▶ return cached                            │
│   └──────┬───────┘                                                       │
│          │ miss                                                          │
│          ▼                                                               │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│   │     OFF      │     │     USDA     │     │  Nutritionix │            │
│   │   Provider   │     │   Provider   │     │   Provider   │            │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘            │
│          │                    │                    │                     │
│          └────────────────────┼────────────────────┘                     │
│                               ▼                                          │
│                    ┌──────────────────┐                                  │
│                    │  Merge & Return  │                                  │
│                    └──────────────────┘                                  │
│                                                                          │
│   Built-in: Circuit Breaker │ Rate Limiter │ Retry w/ Backoff           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Example Output

```json
{
  "barcode": "3017620422003",
  "name": "Nutella",
  "brand": "Ferrero",
  "nutriScore": { "grade": "E", "score": 26 },
  "novaGroup": 4,
  "nutrients": [
    { "id": "energy", "value": 539, "unit": "kcal" },
    { "id": "sugar", "value": 56.3, "unit": "g", "dailyValuePercent": 113 }
  ],
  "allergens": ["milk", "tree_nuts"],
  "sources": ["openfoodfacts", "usda"]
}
```

## HTTP Mode

For web apps, run as HTTP server:

```bash
TRANSPORT=http HTTP_PORT=3000 npx nutri-mcp
```

```bash
# Health check
curl localhost:3000/health

# Query
curl -X POST localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"getProduct","arguments":{"barcode":"3017620422003"}}}'
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSPORT` | `stdio` | `stdio` or `http` |
| `HTTP_PORT` | `3000` | Port for HTTP mode |
| `USDA_API_KEY` | - | USDA FoodData Central key |
| `NUTRITIONIX_APP_ID` | - | Nutritionix app ID |
| `NUTRITIONIX_APP_KEY` | - | Nutritionix app key |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `CACHE_MAX_SIZE` | `1000` | Max cached items |

## Monorepo

```
nutri-mcp/
├── packages/core     # MCP server (npm: nutri-mcp)
└── packages/docs     # VitePress docs
```

```bash
pnpm install          # Install deps
pnpm build            # Build all
pnpm docs:dev         # Dev server at localhost:5173
```

## Links

- **Docs**: [nutri-mcp.com](https://nutri-mcp.com)

## License

MIT
