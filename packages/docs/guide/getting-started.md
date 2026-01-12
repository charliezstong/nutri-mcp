# Getting Started

Get Nutri-MCP running with Claude Code in under 5 minutes.

## Prerequisites

- Node.js 20 or higher
- Claude Code or Claude Desktop
- (Optional) API keys for USDA and/or Nutritionix

## Quick Install

### Option 1: npx (Recommended)

No installation required. Add directly to Claude Code:

```bash
claude mcp add nutri-mcp -- npx nutri-mcp
```

### Option 2: Global Install

```bash
npm install -g nutri-mcp
claude mcp add nutri-mcp -- nutri-mcp
```

### Option 3: From Source

```bash
git clone https://github.com/nutrimcp/nutri-mcp.git
cd nutri-mcp/packages/core
pnpm install
pnpm build
claude mcp add nutri-mcp -- node /path/to/nutri-mcp/packages/core/dist/index.js
```

## Verify Installation

Check that the server is connected:

```bash
claude mcp list
```

You should see:

```
nutri-mcp: ... - Connected
```

## Test It Out

Ask Claude a nutrition question:

> "What's the nutritional information for the product with barcode 3017620422003?"

Claude will use Nutri-MCP to fetch real data from Open Food Facts and respond with detailed nutrition information.

## Add API Keys (Optional)

For access to more data sources, add API keys:

```bash
# Remove existing server
claude mcp remove nutri-mcp

# Add with USDA API key
claude mcp add nutri-mcp \
  -e USDA_API_KEY=your-key-here \
  -- npx nutri-mcp
```

### Getting API Keys

| Provider | Cost | Sign Up |
|----------|------|---------|
| Open Food Facts | Free | No key needed |
| USDA FoodData Central | Free | [fdc.nal.usda.gov](https://fdc.nal.usda.gov/api-key-signup.html) |
| Nutritionix | Free tier | [developer.nutritionix.com](https://developer.nutritionix.com/) |

## Next Steps

- [Configuration](/guide/configuration) - Environment variables and options
- [Tools Overview](/tools/overview) - See all 35 available tools
- [Architecture](/guide/architecture) - Understand the system design
