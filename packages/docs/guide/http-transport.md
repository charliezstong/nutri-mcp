# HTTP Transport

Nutri-MCP supports HTTP/SSE transport for web applications and external integrations.

## Starting the HTTP Server

```bash
TRANSPORT=http npx nutri-mcp
```

Default: `http://localhost:3000`

### Custom Port and Host

```bash
TRANSPORT=http \
HTTP_PORT=8080 \
HTTP_HOST=0.0.0.0 \
npx nutri-mcp
```

## Endpoints

### GET /

Server information and status.

```bash
curl http://localhost:3000/
```

Response:

```json
{
  "name": "nutri-mcp",
  "version": "1.0.0",
  "transport": "http",
  "status": "running"
}
```

### GET /health

Health check endpoint for load balancers and monitoring.

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "healthy",
  "uptime": 12345,
  "providers": {
    "openfoodfacts": "available",
    "usda": "available",
    "nutritionix": "unavailable"
  }
}
```

### GET /sse

Server-Sent Events connection for receiving responses.

```bash
curl -N http://localhost:3000/sse
```

### POST /mcp

JSON-RPC endpoint for MCP requests.

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "getProduct",
      "arguments": {
        "barcode": "3017620422003"
      }
    }
  }'
```

## MCP Protocol Methods

### tools/list

List all available tools.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

### tools/call

Call a specific tool.

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "searchProducts",
    "arguments": {
      "query": "chocolate",
      "limit": 5
    }
  }
}
```

### resources/list

List available resources.

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/list"
}
```

### resources/read

Read a specific resource.

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/read",
  "params": {
    "uri": "nutrimcp://guide/getting-started"
  }
}
```

## JavaScript Client Example

```javascript
async function callTool(name, args) {
  const response = await fetch('http://localhost:3000/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: args }
    })
  });

  const result = await response.json();
  return result.result;
}

// Get product information
const product = await callTool('getProduct', {
  barcode: '3017620422003'
});

console.log(product);
```

## Docker Deployment

```dockerfile
FROM node:20-alpine
RUN npm install -g nutri-mcp
ENV TRANSPORT=http
ENV HTTP_PORT=3000
ENV HTTP_HOST=0.0.0.0
EXPOSE 3000
CMD ["nutri-mcp"]
```

Build and run:

```bash
docker build -t nutri-mcp .
docker run -p 3000:3000 \
  -e USDA_API_KEY=your-key \
  nutri-mcp
```

## Docker Compose

```yaml
version: '3.8'
services:
  nutri-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - TRANSPORT=http
      - HTTP_PORT=3000
      - HTTP_HOST=0.0.0.0
      - USDA_API_KEY=${USDA_API_KEY}
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## CORS Configuration

The HTTP transport includes CORS headers for browser access:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

For production, configure specific origins using environment variables.

## Rate Limiting

HTTP requests are subject to the same rate limits as stdio transport. Monitor the `X-RateLimit-*` headers in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```
