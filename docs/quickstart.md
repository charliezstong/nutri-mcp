# Quick Start Guide

Get up and running with Nutri-MCP in 5 minutes.

## Prerequisites

- Node.js 20 or higher
- Claude Code or Claude Desktop

## Installation

### Option 1: From Source

```bash
# Clone the repository
git clone https://github.com/your-org/nutri-mcp.git
cd nutri-mcp

# Install dependencies
npm install

# Build
npm run build

# Verify installation
npm test
```

### Option 2: From npm (when published)

```bash
npm install -g nutri-mcp
```

## Configuration

### For Claude Code

Edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "nutri-mcp": {
      "command": "node",
      "args": ["/path/to/nutri-mcp/dist/index.js"]
    }
  }
}
```

### For Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nutri-mcp": {
      "command": "node",
      "args": ["/path/to/nutri-mcp/dist/index.js"]
    }
  }
}
```

## Verify Installation

Restart Claude Code/Desktop, then ask:

> "What nutrition information can you tell me about the product with barcode 3017620422003?"

Claude should use the `getProduct` tool and return detailed information about Nutella.

## Your First Queries

### Get Product Info

> "Look up the product with barcode 5000159407236"

### Compare Products

> "Compare the nutrition of barcodes 3017620422003 and 5000159407236"

### Check Allergens

> "Does the product 3017620422003 contain nuts or milk?"

### Find Healthier Options

> "Find a healthier alternative to product 3017620422003"

### Analyze Diet Compatibility

> "Is product 3017620422003 suitable for a vegan diet?"

## Optional: Add More Data Sources

### USDA FoodData Central (Free)

1. Get API key: [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup.html)
2. Update config:

```json
{
  "mcpServers": {
    "nutri-mcp": {
      "command": "node",
      "args": ["/path/to/nutri-mcp/dist/index.js"],
      "env": {
        "USDA_API_KEY": "your-key-here"
      }
    }
  }
}
```

### Nutritionix (Free tier)

1. Sign up: [developer.nutritionix.com](https://developer.nutritionix.com/)
2. Update config:

```json
{
  "env": {
    "NUTRITIONIX_APP_ID": "your-app-id",
    "NUTRITIONIX_APP_KEY": "your-app-key"
  }
}
```

## Common Barcodes for Testing

| Barcode | Product | Notes |
|---------|---------|-------|
| 3017620422003 | Nutella | Nutri-Score E, high sugar |
| 5000159407236 | Cadbury Dairy Milk | Chocolate bar |
| 5449000000996 | Coca-Cola | Beverage |
| 3228857000166 | Evian Water | Nutri-Score A |
| 7622210449283 | Oreo Cookies | Snack |
| 5000112637939 | Heinz Ketchup | Condiment |

## Troubleshooting

### "Tool not found" error

- Ensure the path in your config is correct
- Restart Claude Code/Desktop after config changes
- Check server logs: `LOG_LEVEL=debug node dist/index.js`

### "Product not found"

- Verify barcode format (should be EAN-13, UPC-A, or EAN-8)
- Check if product exists: `https://world.openfoodfacts.org/product/{barcode}`
- Some regional products may not be in the database

### Slow responses

- First request may be slow (cold start)
- Subsequent requests should be faster (cached)
- Check your internet connection

## Next Steps

- Read [TOOLS.md](TOOLS.md) for all available tools
- Read [CONFIGURATION.md](CONFIGURATION.md) for advanced settings
- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system
- Read [PROVIDERS.md](PROVIDERS.md) for data source details
