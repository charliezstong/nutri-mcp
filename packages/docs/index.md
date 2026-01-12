---
layout: home

hero:
  name: Nutri-MCP
  text: Nutrition Data for AI
  tagline: Multi-source nutrition MCP server for Claude and other AI assistants
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/nutrimcp/nutri-mcp

features:
  - icon: 🔗
    title: Multi-Source Data
    details: Aggregates nutrition data from Open Food Facts, USDA FoodData Central, and Nutritionix into a unified API.
  - icon: 🛠️
    title: 35 MCP Tools
    details: Comprehensive tools for nutrition analysis, allergen detection, product comparison, and more.
  - icon: ⚡
    title: Resilient Architecture
    details: Built-in circuit breaker, rate limiting, caching, and retry with exponential backoff.
  - icon: 🔒
    title: Type-Safe
    details: Full TypeScript with Zod validation for reliable, predictable behavior.
---

## Quick Start

```bash
# Install
npm install nutri-mcp

# Add to Claude Code
claude mcp add nutri-mcp -- npx nutri-mcp
```

## Example Usage

Once configured, ask Claude:

> "What's the nutritional information for product barcode 3017620422003?"

> "Compare the nutrition of Nutella vs peanut butter"

> "Find gluten-free alternatives to this product"
