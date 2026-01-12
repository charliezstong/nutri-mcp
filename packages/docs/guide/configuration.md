# Configuration

Nutri-MCP is configured through environment variables. All configuration is optional with sensible defaults.

## Environment Variables

### API Keys

| Variable | Required | Description |
|----------|----------|-------------|
| `USDA_API_KEY` | No | USDA FoodData Central API key |
| `NUTRITIONIX_APP_ID` | No | Nutritionix application ID |
| `NUTRITIONIX_APP_KEY` | No | Nutritionix API key |

Open Food Facts does not require an API key.

### Transport

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSPORT` | `stdio` | Transport mode: `stdio` or `http` |
| `HTTP_PORT` | `3000` | Port for HTTP transport |
| `HTTP_HOST` | `localhost` | Host for HTTP transport |

### Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |

### Cache

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_MAX_SIZE` | `1000` | Maximum cache entries |
| `CACHE_TTL_PRODUCT` | `3600000` | Product cache TTL (ms) |
| `CACHE_TTL_SEARCH` | `1800000` | Search cache TTL (ms) |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_OFF` | `100` | Open Food Facts requests/minute |
| `RATE_LIMIT_USDA` | `1000` | USDA requests/hour |
| `RATE_LIMIT_NUTRITIONIX` | `50` | Nutritionix requests/day |

### Circuit Breaker

| Variable | Default | Description |
|----------|---------|-------------|
| `CB_FAILURE_THRESHOLD` | `5` | Failures before opening |
| `CB_RESET_TIMEOUT` | `30000` | Time before half-open (ms) |

## Configuration Examples

### Basic (Open Food Facts Only)

```bash
# No configuration needed
npx nutri-mcp
```

### With USDA

```bash
USDA_API_KEY=your-key npx nutri-mcp
```

### With All Providers

```bash
USDA_API_KEY=your-usda-key \
NUTRITIONIX_APP_ID=your-app-id \
NUTRITIONIX_APP_KEY=your-app-key \
npx nutri-mcp
```

### HTTP Transport

```bash
TRANSPORT=http \
HTTP_PORT=8080 \
npx nutri-mcp
```

### Production Settings

```bash
LOG_LEVEL=warn \
CACHE_MAX_SIZE=5000 \
CACHE_TTL_PRODUCT=7200000 \
CB_FAILURE_THRESHOLD=10 \
npx nutri-mcp
```

## Provider Priority

When multiple providers are configured, Nutri-MCP queries them in this order:

1. **Open Food Facts** - Always queried first (no API key required)
2. **USDA FoodData Central** - Queried if API key is configured
3. **Nutritionix** - Queried if both APP_ID and APP_KEY are configured

Results are aggregated with data merged from all available sources.

## Validation

Configuration is validated at startup using Zod schemas. Invalid values will cause the server to exit with an error message.

```typescript
// Example validation schema
const envSchema = z.object({
  TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
  HTTP_PORT: z.coerce.number().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});
```
