# Claude Code Setup

Detailed instructions for integrating Nutri-MCP with Claude Code.

## Adding the Server

### Basic Setup

```bash
claude mcp add nutri-mcp -- npx nutri-mcp
```

### With USDA API Key

```bash
claude mcp add nutri-mcp \
  -e USDA_API_KEY=your-key \
  -- npx nutri-mcp
```

### With All Providers

```bash
claude mcp add nutri-mcp \
  -e USDA_API_KEY=your-usda-key \
  -e NUTRITIONIX_APP_ID=your-app-id \
  -e NUTRITIONIX_APP_KEY=your-app-key \
  -- npx nutri-mcp
```

### With Debug Logging

```bash
claude mcp add nutri-mcp \
  -e LOG_LEVEL=debug \
  -e USDA_API_KEY=your-key \
  -- npx nutri-mcp
```

## Verifying the Connection

Check that the server is connected:

```bash
claude mcp list
```

Expected output:

```
nutri-mcp: ... - Connected
```

## Removing the Server

```bash
claude mcp remove nutri-mcp
```

## Using a Local Installation

If you prefer a local installation over npx:

```bash
# Install globally
npm install -g nutri-mcp

# Add to Claude Code
claude mcp add nutri-mcp -- nutri-mcp
```

## Using From Source

For development or customization:

```bash
# Clone and build
git clone https://github.com/nutrimcp/nutri-mcp.git
cd nutri-mcp/packages/core
pnpm install
pnpm build

# Add to Claude Code (use absolute path)
claude mcp add nutri-mcp -- node /path/to/nutri-mcp/packages/core/dist/index.js
```

## Testing the Integration

Once configured, ask Claude:

> "What's the nutritional information for product barcode 3017620422003?"

Claude will use Nutri-MCP to fetch data from Open Food Facts and return detailed nutrition information for Nutella.

## Troubleshooting

### Server Not Connecting

1. Check that Node.js 20+ is installed:
   ```bash
   node --version
   ```

2. Try running the server directly:
   ```bash
   npx nutri-mcp
   ```

3. Check for errors in the output

### Tools Not Available

1. Remove and re-add the server:
   ```bash
   claude mcp remove nutri-mcp
   claude mcp add nutri-mcp -- npx nutri-mcp
   ```

2. Restart Claude Code

### API Key Issues

1. Verify the key is correct:
   ```bash
   # Test USDA key
   curl "https://api.nal.usda.gov/fdc/v1/foods/search?query=apple&api_key=YOUR_KEY"
   ```

2. Re-add with the correct key:
   ```bash
   claude mcp remove nutri-mcp
   claude mcp add nutri-mcp -e USDA_API_KEY=correct-key -- npx nutri-mcp
   ```

### Debug Mode

Enable debug logging to see detailed request/response information:

```bash
claude mcp remove nutri-mcp
claude mcp add nutri-mcp -e LOG_LEVEL=debug -- npx nutri-mcp
```

Debug output appears in stderr and includes:
- API requests and responses
- Cache hits and misses
- Rate limiter status
- Circuit breaker state changes
