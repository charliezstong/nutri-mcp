# Use Cases

Real-world examples of Nutri-MCP in action.

## Mastra: AI Dietitian Agent

Build a nutrition assistant using [Mastra](https://mastra.ai), the TypeScript AI framework.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mastra Agent                              │
│                                                                  │
│   User: "Is this cereal good for my diabetic diet?"             │
│          │                                                       │
│          ▼                                                       │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│   │   Analyze    │────▶│  Nutri-MCP    │────▶│   Respond    │    │
│   │   Intent     │     │   Tools      │     │   w/ Data    │    │
│   └──────────────┘     └──────────────┘     └──────────────┘    │
│                              │                                   │
│                        getProduct()                              │
│                        analyzeNutrition()                        │
│                        getDietCompatibility()                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Setup

```bash
npm install @mastra/core @mastra/mcp @ai-sdk/anthropic
```

### Agent Code

```typescript
// src/agents/dietitian.ts
import { Agent } from "@mastra/core/agent";
import { MCPClient } from "@mastra/mcp";
import { anthropic } from "@ai-sdk/anthropic";

// Connect to Nutri-MCP
const nutritionClient = new MCPClient({
  servers: {
    nutrition: {
      command: "npx",
      args: ["nutri-mcp"],
      env: {
        USDA_API_KEY: process.env.USDA_API_KEY,
      },
    },
  },
});

// Create the agent
export const dietitian = new Agent({
  name: "Dietitian",
  model: anthropic("claude-sonnet-4-20250514"),
  instructions: `You are a registered dietitian assistant. Help users:
    - Understand nutritional content of foods
    - Check products against dietary restrictions
    - Find healthier alternatives
    - Plan balanced meals

    Always use the nutrition tools to get accurate data.
    Be specific about nutrients and percentages.
    Warn about allergens when relevant.`,
  tools: await nutritionClient.getTools(),
});
```

### Usage

```typescript
// Simple query
const response = await dietitian.generate(
  "What's the sugar content in Nutella? Is it ok for diabetics?"
);

// With streaming
const stream = await dietitian.stream(
  "Compare these cereals for a heart-healthy diet: " +
  "Cheerios (016000275287) vs Frosted Flakes (038000001062)"
);

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```

### Example Conversation

```
User: I have celiac disease. Is product 5000159407236 safe for me?

Agent: Let me check that product for gluten content.

[Calls checkAllergens with barcode and ["gluten"]]

This product is NOT safe for celiac disease. It contains:
- Wheat flour (main ingredient)
- Barley malt extract

Would you like me to find gluten-free alternatives in the same category?
```

---

## Claude Code: Personal Nutrition Lookup

Direct integration for ad-hoc nutrition queries.

### Setup

```bash
claude mcp add nutri-mcp -- npx nutri-mcp
```

### Example Prompts

**Product lookup:**
> "What's the Nutri-Score for barcode 3017620422003?"

**Diet check:**
> "Is product 5449000000996 keto-friendly?"

**Comparison:**
> "Compare the protein content of Greek yogurt vs regular yogurt"

**Meal planning:**
> "Analyze this meal: 150g chicken breast, 200g brown rice, 100g broccoli"

---

## Recipe App: Nutrition Calculator

Backend service for a recipe application.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Recipe App    │────▶│    Nutri-MCP     │────▶│   Recipe Card   │
│   (Next.js)     │     │   HTTP Mode     │     │   w/ Nutrition  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Start Server

```bash
TRANSPORT=http HTTP_PORT=3000 npx nutri-mcp
```

### API Integration

```typescript
// lib/nutrition.ts
async function analyzeRecipe(ingredients: Ingredient[]) {
  const response = await fetch("http://localhost:3000/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "analyzeRecipe",
        arguments: {
          ingredients: ingredients.map((i) => ({
            barcode: i.barcode,
            grams: i.grams,
          })),
          servings: 4,
        },
      },
    }),
  });

  const { result } = await response.json();
  return result;
}
```

### Response

```json
{
  "totalNutrition": {
    "calories": 1850,
    "protein": 95,
    "carbs": 180,
    "fat": 45
  },
  "perServing": {
    "calories": 462,
    "protein": 24
  },
  "allergens": ["gluten", "milk"],
  "nutriScore": "B"
}
```

---

## Grocery App: Barcode Scanner

Mobile app that scans barcodes and shows nutrition info.

```typescript
// React Native with Nutri-MCP HTTP endpoint

async function onBarcodeScan(barcode: string) {
  const product = await fetch("http://api.yourapp.com/nutrition/product", {
    method: "POST",
    body: JSON.stringify({ barcode }),
  }).then((r) => r.json());

  // Display product card
  return {
    name: product.name,
    brand: product.brand,
    nutriScore: product.nutriScore.grade,
    calories: product.nutrients.find((n) => n.id === "energy")?.value,
    allergens: product.allergens,
  };
}
```

---

## Meal Prep Service: Allergen Checker

Validate meal prep menus against customer allergen profiles.

```typescript
async function validateMenu(
  menuItems: string[], // barcodes
  customerAllergens: string[]
) {
  const results = await Promise.all(
    menuItems.map(async (barcode) => {
      const check = await callTool("checkAllergens", {
        barcode,
        allergens: customerAllergens,
      });
      return { barcode, ...check };
    })
  );

  const unsafe = results.filter((r) => !r.safe);

  if (unsafe.length > 0) {
    return {
      approved: false,
      conflicts: unsafe.map((u) => ({
        product: u.barcode,
        allergens: u.contains,
      })),
    };
  }

  return { approved: true };
}
```

---

## Health Dashboard: Daily Tracking

Track daily nutrition intake with real-time analysis.

```typescript
// Track consumed items
const dailyLog = [];

async function logFood(barcode: string, grams: number) {
  const nutrition = await callTool("calculateServingNutrition", {
    barcode,
    servingGrams: grams,
  });

  dailyLog.push({
    time: new Date(),
    barcode,
    grams,
    nutrients: nutrition.nutrients,
  });

  // Calculate daily totals
  const totals = aggregateNutrients(dailyLog);

  // Get daily value percentages
  return {
    consumed: totals,
    remaining: calculateRemaining(totals),
    warnings: checkExcesses(totals),
  };
}
```

---

## Multi-Agent: Nutrition + Fitness

Combine Nutri-MCP with other MCP servers for a complete health assistant.

```typescript
import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";

const clients = new MCPClient({
  servers: {
    nutrition: {
      command: "npx",
      args: ["nutri-mcp"],
    },
    fitness: {
      command: "npx",
      args: ["fitness-mcp"], // hypothetical
    },
    calendar: {
      command: "npx",
      args: ["@anthropic/mcp-google-calendar"],
    },
  },
});

const healthCoach = new Agent({
  name: "Health Coach",
  model: anthropic("claude-sonnet-4-20250514"),
  instructions: `You're a holistic health coach with access to:
    - Nutrition data (food, calories, allergens)
    - Fitness tracking (workouts, steps)
    - Calendar (meal planning, workout scheduling)

    Help users balance nutrition with exercise goals.`,
  tools: await clients.getTools(),
});
```

---

## Sources

- [Mastra Documentation](https://mastra.ai/docs)
- [Mastra MCP Guide](https://mastra.ai/docs/mcp/overview)
- [Model Context Protocol](https://modelcontextprotocol.io)
