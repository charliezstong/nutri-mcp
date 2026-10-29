# Use Cases

Examples of what Nutri-MCP is good at, from chat prompts to code. Tool names and parameters are documented in the [Tools Reference](/tools/overview).

## Ask in Claude Code or Claude Desktop

After [adding the server](/guide/getting-started), plain questions are enough. The model picks the tools.

| You ask | Tools typically used |
|---------|----------------------|
| "What's the nutrition for barcode 3017620422003?" | `getProductByBarcode`, `analyzeNutrition` |
| "Why does Prince get a Nutri-Score E?" | `searchProducts`, `getNutriScore` |
| "Is 3017620422003 vegan? Explain the evidence." | `checkDietCompliance` |
| "I'm allergic to wheat and peanuts. Is 7622210449283 safe?" | `checkMultipleAllergens`, `getCrossContaminationRisk` |
| "Find a less processed chocolate spread with a better Nutri-Score." | `findHealthierAlternative`, `searchProducts` (`nutriScoreMax`, `novaMax`) |
| "Which of these has the least sugar: 3017620422003, 7622210449283?" | `rankByNutrient` |
| "What does Nutella cost in France, and is it cheaper than last year?" | `getPriceStats` (`country: "FR"`), `getPriceHistory` |
| "Any discounted prices reported in EUR recently?" | `findDeals` |
| "Breakfast is 20 g of Nutella and 40 g of Prince. How many calories?" | `analyzeMeal` |
| "Are there FDA recalls for peanut butter that are still ongoing?" | `checkRecalls` (`ongoingOnly: true`) |
| "How complete is the Open Food Facts data for 7622210449283?" | `qualityCheck`, `getProductInsights` |

In hosts that render [MCP Apps](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/), `getProductByBarcode` and `compareProducts` also display an interactive product card or comparison table.

## Use the built-in prompts

The server ships six prompts that guide the model through a multi-tool workflow:

| Prompt | Arguments | Workflow |
|--------|-----------|----------|
| `analyze-product` | `barcode` | Full analysis: scores, macros, %DV, allergens, NOVA, additives, recommendation |
| `compare-products` | `barcodes` (comma-separated) | Nutrients, scores, allergens and price per kg/L side by side |
| `find-alternatives` | `barcode`, optional `category` | Healthier options in the same or a given category |
| `check-allergens` | `barcode`, `allergens` (comma-separated ids) | Allergens, cross-contamination, traces and recalls, with a SAFE / UNSAFE / UNCERTAIN verdict |
| `plan-meal` | `barcodes` | Calories, macros, gaps and cost of a meal |
| `check-diet` | `barcodes`, `diet` | Diet compliance for a shopping list |

In Claude Code, prompts are available as slash commands under `/mcp`.

## Call tools from TypeScript (stdio)

Any MCP client can launch the server as a subprocess. With the official SDK (`@modelcontextprotocol/client` v2):

```typescript
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const client = new Client({ name: 'nutrition-script', version: '1.0.0' });
await client.connect(new StdioClientTransport({
  command: 'npx',
  args: ['-y', 'nutri-mcp'],
  env: { ...process.env, LOG_LEVEL: 'warn' },
}));

const { structuredContent } = await client.callTool({
  name: 'checkDietCompliance',
  arguments: { barcode: '3017620422003', diet: 'vegan' },
});
console.log(structuredContent);
// { product: {...}, diet: 'vegan', compliant: false, verdict: 'not_compliant', violations: [...], ... }

await client.close();
```

For a source checkout, use `command: 'node'` and `args: ['/absolute/path/to/nutri-mcp/packages/core/dist/index.js']`.

Every tool returns `structuredContent` that matches its `outputSchema`, so results can be used directly without parsing text. Failed calls return `isError: true` with a message in `content[0].text`.

## Check a menu against a customer's allergens

A meal-prep or catering backend can validate a list of products. Allergen ids are `gluten`, `wheat`, `dairy`, `eggs`, `fish`, `shellfish`, `mollusks`, `tree_nuts`, `peanuts`, `soy`, `celery`, `mustard`, `sesame`, `sulfites` and `lupin`.

```typescript
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const client = new Client({ name: 'menu-checker', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp')));

async function checkMenu(barcodes: string[], allergens: string[]) {
  const results = [];
  for (const barcode of barcodes) {
    const result = await client.callTool({
      name: 'checkMultipleAllergens',
      arguments: { barcode, allergens },
    });
    if (result.isError) {
      results.push({ barcode, safe: false, reason: 'not found or lookup failed' });
      continue;
    }
    const out = result.structuredContent as {
      overallSafe: boolean;
      allergensFound: string[];
      dataAvailable: boolean;
    };
    // No allergen data on the label record means "unknown", not "safe"
    results.push({ barcode, safe: out.overallSafe && out.dataAvailable, allergensFound: out.allergensFound });
  }
  return results;
}

console.log(await checkMenu(['3017620422003', '7622210449283'], ['wheat', 'peanuts']));
await client.close();
```

This assumes the server runs in [HTTP mode](/guide/http-transport) (`TRANSPORT=http`). A product counts as unsafe when the allergen is declared, listed in traces or "may contain", or implied (wheat is inferred from a gluten declaration).

::: warning
Label data can be incomplete. Treat these answers as a first check and always confirm on the package for severe allergies.
:::

## Cost and nutrition of a meal

`analyzeMeal` adds up nutrients for portions in grams; `calculateMealCost` estimates the cost from crowdsourced median prices in one currency:

```typescript
const meal = { barcodes: ['3017620422003', '7622210449283'], grams: [20, 40] };

const nutrition = await client.callTool({ name: 'analyzeMeal', arguments: meal });
const cost = await client.callTool({ name: 'calculateMealCost', arguments: { ...meal, currency: 'EUR' } });

console.log(nutrition.structuredContent); // totalGrams, totalCalories, totals, macros, ...
console.log(cost.structuredContent);      // currency, items, estimatedTotalCost, itemsWithoutPrices, ...
```

For a whole day, `analyzeMealPlan` takes named meals and a `targetCalories` value.

## Monitor recalls

`checkRecalls` searches openFDA food enforcement reports (US only, updated weekly) by barcode and/or text. A scheduled job can flag new ongoing recalls for products you sell:

```typescript
const result = await client.callTool({
  name: 'checkRecalls',
  arguments: { query: 'peanut butter', ongoingOnly: true, limit: 10 },
});
const { recalls } = result.structuredContent as {
  recalls: { recallNumber: string; classification: string; reason: string; matchedBy: 'barcode' | 'text' }[];
};
for (const r of recalls) console.log(r.recallNumber, r.classification, r.reason);
```

Text matches are possible matches, not certain ones (`matchedBy: "text"`).

## Combine with other MCP servers

Because Nutri-MCP is a standard MCP server, a host can use it next to other servers, for example a calendar for meal planning or a notes server for a shopping list. Each server is registered separately in the host (`claude mcp add ...` or the host's config file) and the model chooses tools from all of them.
