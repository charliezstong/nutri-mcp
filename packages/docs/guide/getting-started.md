# Getting Started

Get Nutri-MCP running in Claude Code in a few minutes.

## Prerequisites

- Node.js 20 or later
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code), Claude Desktop or another MCP host
- Optional: a free [USDA FoodData Central API key](https://fdc.nal.usda.gov/api-key-signup) and/or paid Nutritionix credentials

## Add the server

### From npm

Once the `nutri-mcp` package is published:

```bash
claude mcp add nutri-mcp -- npx -y nutri-mcp
```

::: tip Not published yet?
The npm package is published from version tags by the release workflow. Until the first release, run the server from source.
:::

### From source

```bash
git clone https://github.com/charliezstong/nutri-mcp.git
cd nutri-mcp
pnpm install
pnpm --filter nutri-mcp build
```

Register the built entry point with an absolute path:

```bash
claude mcp add nutri-mcp -- node "$(pwd)/packages/core/dist/index.js"
```

## Verify

```bash
claude mcp list
```

`nutri-mcp` should be listed as connected. Inside Claude Code, `/mcp` shows the server with its tools, resources and prompts.

## Try it

Ask Claude:

> "What's the nutrition for barcode 3017620422003?"

> "Find a healthier alternative to Prince biscuits."

> "Check product 7622210449283 against the EU 14 allergens."

Claude calls tools such as `getProductByBarcode`, `findHealthierAlternative` or `checkEU14` and answers from the returned data.

## Add optional keys

Open Food Facts, Open Prices and openFDA need no key. To add USDA data and identify yourself to Open Food Facts, re-add the server with environment variables:

```bash
claude mcp remove nutri-mcp
```

```bash
claude mcp add nutri-mcp \
  -e OFF_CONTACT_EMAIL=you@example.com \
  -e USDA_API_KEY=your-usda-key \
  -- npx -y nutri-mcp
```

| Variable | Effect |
|----------|--------|
| `OFF_CONTACT_EMAIL` | Sent in the User-Agent; Open Food Facts asks API users to identify themselves |
| `USDA_API_KEY` | Adds USDA FoodData Central branded foods (free key) |
| `NUTRITIONIX_APP_ID` + `NUTRITIONIX_APP_KEY` | Adds Nutritionix (paid) and the `estimateNutritionFromText` tool |

See [Configuration](/guide/configuration) for every variable.

## Next steps

- [Installation](/guide/installation): Claude Desktop, other hosts, MCP Inspector
- [Tools Overview](/tools/overview): all tools with examples
- [HTTP Transport](/guide/http-transport): run Nutri-MCP as a web service
