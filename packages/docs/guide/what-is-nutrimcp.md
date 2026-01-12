# What is Nutri-MCP?

Nutri-MCP is a Model Context Protocol (MCP) server that provides AI assistants with access to comprehensive food and nutrition data from multiple sources.

## The Problem

AI assistants like Claude don't have real-time access to nutrition databases. When users ask about food products, nutritional information, or dietary compatibility, the AI can only provide general knowledge.

## The Solution

Nutri-MCP bridges this gap by:

1. **Connecting to multiple data sources** - Open Food Facts (3M+ products), USDA FoodData Central (400K+ products), and Nutritionix (900K+ products)

2. **Providing 35 specialized tools** - From basic product lookup to complex nutritional analysis

3. **Handling the complexity** - Rate limiting, caching, error handling, and data normalization

## Key Features

### Multi-Source Aggregation

Query multiple databases simultaneously and get the best available data:

```
User: "What's in product 3017620422003?"

Nutri-MCP queries:
  ├── Open Food Facts → Nutri-Score, Eco-Score, ingredients
  ├── USDA → Detailed micronutrients
  └── Nutritionix → Restaurant data (if applicable)

Returns: Unified, enriched product data
```

### Comprehensive Toolset

| Category | Tools | Use Cases |
|----------|-------|-----------|
| Product | 2 | Lookup, search |
| Nutrition | 8 | Analysis, macros, scores |
| Allergen | 8 | Detection, alternatives |
| Comparison | 4 | Side-by-side, rankings |
| Price | 6 | Pricing, deals |
| Recipe | 4 | Meal analysis |
| Insights | 3 | Trends, brand analysis |

### Built for Reliability

- **Circuit Breaker**: Prevents cascading failures when APIs are down
- **Rate Limiting**: Respects API quotas automatically
- **Caching**: Reduces redundant API calls
- **Retry Logic**: Handles transient failures gracefully

## Who Is This For?

- **AI Application Developers** building nutrition-aware chatbots
- **Health & Fitness Apps** needing reliable food data
- **Dietary Planning Tools** requiring allergen information
- **Research Projects** analyzing food product trends

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Claude / AI    │────▶│    Nutri-MCP     │────▶│   Data Sources  │
│   Assistant     │◀────│     Server      │◀────│  OFF/USDA/etc   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ├── Validates input
        │                       ├── Queries providers
        │                       ├── Aggregates data
        │                       └── Returns structured response
        │
        └── User asks about food/nutrition
```

## Next Steps

- [Getting Started](/guide/getting-started) - Install and configure Nutri-MCP
- [Tools Overview](/tools/overview) - Explore available tools
- [Architecture](/guide/architecture) - Understand the system design
