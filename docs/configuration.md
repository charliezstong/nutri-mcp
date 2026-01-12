# Configuration Guide

Complete guide to configuring Nutri-MCP for different environments.

## Environment Variables

### Required vs Optional

All environment variables are **optional**. The server works out of the box with Open Food Facts (no API key needed).

### Full Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `TRANSPORT` | `stdio` \| `http` | `stdio` | Communication protocol |
| `HTTP_PORT` | number | `3000` | Port for HTTP transport |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` | `info` | Logging verbosity |
| `USDA_API_KEY` | string | - | USDA FoodData Central API key |
| `NUTRITIONIX_APP_ID` | string | - | Nutritionix App ID |
| `NUTRITIONIX_APP_KEY` | string | - | Nutritionix App Key |
| `CACHE_MAX_SIZE` | number | `1000` | Max cached entries |
| `CACHE_TTL_MS` | number | `300000` | Cache TTL (5 min) |

---

## Claude Code Configuration

### Location

```bash
# macOS
~/.claude/settings.json

# Linux
~/.claude/settings.json

# Windows
%USERPROFILE%\.claude\settings.json
```

### Minimal Configuration

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

### Full Configuration

```json
{
  "mcpServers": {
    "nutri-mcp": {
      "command": "node",
      "args": ["/path/to/nutri-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info",
        "USDA_API_KEY": "your-usda-key",
        "NUTRITIONIX_APP_ID": "your-app-id",
        "NUTRITIONIX_APP_KEY": "your-app-key",
        "CACHE_MAX_SIZE": "2000",
        "CACHE_TTL_MS": "600000"
      }
    }
  }
}
```

### Using npx (No Local Install)

```json
{
  "mcpServers": {
    "nutri-mcp": {
      "command": "npx",
      "args": ["-y", "nutri-mcp"]
    }
  }
}
```

---

## Claude Desktop Configuration

### Location

```bash
# macOS
~/Library/Application Support/Claude/claude_desktop_config.json

# Windows
%APPDATA%\Claude\claude_desktop_config.json

# Linux
~/.config/Claude/claude_desktop_config.json
```

### Configuration

```json
{
  "mcpServers": {
    "nutri-mcp": {
      "command": "node",
      "args": ["/path/to/nutri-mcp/dist/index.js"],
      "env": {
        "USDA_API_KEY": "your-usda-key"
      }
    }
  }
}
```

---

## HTTP Transport Configuration

For web applications or custom integrations:

### Start Server

```bash
TRANSPORT=http HTTP_PORT=3001 node dist/index.js
```

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info |
| `/health` | GET | Health check |
| `/sse` | GET | SSE connection |
| `/mcp` | POST | JSON-RPC requests |

### Client Example

```javascript
// Connect via SSE
const eventSource = new EventSource('http://localhost:3001/sse');

eventSource.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};

// Send tool request
const response = await fetch('http://localhost:3001/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'getProduct',
      arguments: { barcode: '3017620422003' }
    }
  })
});
```

---

## API Keys Setup

### Open Food Facts

**No API key required!** Open Food Facts is free and open.

### USDA FoodData Central

1. Go to [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup.html)
2. Fill out the form
3. Receive API key via email (instant)
4. Add to config:
   ```json
   "env": {
     "USDA_API_KEY": "your-key-here"
   }
   ```

**Rate Limits:** 1,000 requests/hour (free)

### Nutritionix

1. Go to [developer.nutritionix.com](https://developer.nutritionix.com/)
2. Sign up for free account
3. Create an app to get App ID and App Key
4. Add to config:
   ```json
   "env": {
     "NUTRITIONIX_APP_ID": "your-app-id",
     "NUTRITIONIX_APP_KEY": "your-app-key"
   }
   ```

**Rate Limits:** 50 requests/day (free tier)

---

## Cache Configuration

### Tuning Cache Size

```bash
# Larger cache for heavy usage
CACHE_MAX_SIZE=5000 node dist/index.js

# Smaller cache for memory-constrained environments
CACHE_MAX_SIZE=100 node dist/index.js
```

### Tuning Cache TTL

```bash
# Longer TTL for mostly-static data (30 minutes)
CACHE_TTL_MS=1800000 node dist/index.js

# Shorter TTL for real-time needs (1 minute)
CACHE_TTL_MS=60000 node dist/index.js
```

### Disable Cache

Set TTL to 0:
```bash
CACHE_TTL_MS=0 node dist/index.js
```

---

## Logging Configuration

### Log Levels

| Level | Description |
|-------|-------------|
| `debug` | Everything including request/response details |
| `info` | Normal operations (default) |
| `warn` | Warnings and deprecations |
| `error` | Errors only |

### Debug Mode

```bash
LOG_LEVEL=debug node dist/index.js
```

### Production Mode

```bash
LOG_LEVEL=warn node dist/index.js
```

---

## Docker Configuration

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

ENV TRANSPORT=http
ENV HTTP_PORT=3000
ENV LOG_LEVEL=info

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  nutri-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - TRANSPORT=http
      - LOG_LEVEL=info
      - USDA_API_KEY=${USDA_API_KEY}
      - NUTRITIONIX_APP_ID=${NUTRITIONIX_APP_ID}
      - NUTRITIONIX_APP_KEY=${NUTRITIONIX_APP_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Run with Docker

```bash
# Build
docker build -t nutri-mcp .

# Run with env file
docker run -p 3000:3000 --env-file .env nutri-mcp
```

---

## Environment-Specific Configurations

### Development

```bash
export TRANSPORT=stdio
export LOG_LEVEL=debug
export CACHE_TTL_MS=60000  # 1 minute
```

### Production

```bash
export TRANSPORT=http
export LOG_LEVEL=warn
export CACHE_MAX_SIZE=5000
export CACHE_TTL_MS=600000  # 10 minutes
```

### Testing

```bash
export LOG_LEVEL=error
export CACHE_TTL_MS=0  # Disable cache
```

---

## Troubleshooting

### Server won't start

```bash
# Check Node version
node --version  # Should be 20+

# Check if port is in use
lsof -i :3000

# Run with debug logging
LOG_LEVEL=debug node dist/index.js
```

### No data from USDA/Nutritionix

1. Verify API keys are set correctly
2. Check rate limits haven't been exceeded
3. Enable debug logging to see API responses

### Cache not working

```bash
# Verify cache settings
LOG_LEVEL=debug node dist/index.js 2>&1 | grep -i cache
```
