---
layout: home

hero:
  name: Nutri-MCP
  text: Nutrition data for AI agents
  tagline: Look up packaged foods by barcode or name and get nutrients, Nutri-Score, Green-Score, NOVA, allergens, diets, prices and recalls through one MCP server.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Tools Reference
      link: /tools/overview
    - theme: alt
      text: View on GitHub
      link: https://github.com/charliezstong/nutri-mcp

features:
  - icon: 🔗
    title: Open data, optional enrichment
    details: Open Food Facts, Open Prices and openFDA recalls with no API key. USDA FoodData Central and Nutritionix fill gaps when you configure them.
  - icon: 🛠️
    title: 38 read-only tools
    details: Product lookup, nutrition analysis, allergens and diets, comparisons, prices, meal planning, data quality and recalls. Every tool has an output schema and returns structured content.
  - icon: 📏
    title: Normalized numbers
    details: Nutrients per 100 g / 100 ml with consistent units (g, mg, mcg), % Daily Value from FDA references, UK FSA traffic lights, Nutri-Score 2023 points.
  - icon: 🧩
    title: Modern MCP
    details: Serves 2025-era clients and the 2026-07-28 protocol from one server over stdio or Streamable HTTP, with resources, prompts and an MCP Apps product view.
  - icon: ⚡
    title: Resilient upstream calls
    details: Per-source circuit breakers, rate limits that match Open Food Facts quotas, timeouts, retries with backoff and an LRU cache.
  - icon: 🔒
    title: Type-safe
    details: TypeScript with Zod 4 validation for environment variables, tool inputs and tool outputs.
---

## Quick start

Add the server to Claude Code (once the npm package is published):

```bash
claude mcp add nutri-mcp -- npx -y nutri-mcp
```

Or run it from source:

```bash
git clone https://github.com/charliezstong/nutri-mcp.git
cd nutri-mcp && pnpm install && pnpm --filter nutri-mcp build
claude mcp add nutri-mcp -- node "$(pwd)/packages/core/dist/index.js"
```

See [Installation](/guide/installation) for Claude Desktop (`.mcpb` bundle), HTTP mode and other hosts.

## Example prompts

> "What's the nutrition for barcode 3017620422003?"

> "Compare Nutella (3017620422003) and Prince biscuits (7622210449283) and tell me which is healthier."

> "Is product 7622210449283 safe for someone allergic to wheat and peanuts?"

> "Are there any FDA recalls for peanut butter?"
