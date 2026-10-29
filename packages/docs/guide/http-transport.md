# HTTP Transport

Besides stdio, Nutri-MCP can run as an MCP [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http) server for remote hosts, web apps and agents.

The HTTP transport (`src/transport/http.ts`) is **stateless**: every request is handled by a fresh server from the same factory (`createServer()`), built with `createMcpHandler` from `@modelcontextprotocol/server` and adapted to Node's `http` module with `toNodeHandler` from `@modelcontextprotocol/node`. It serves both 2025-era clients (with an `initialize` handshake, for example protocol 2025-06-18 or 2025-11-25) and clients of the 2026-07-28 stateless revision.

## Start the server

```bash
TRANSPORT=http npx -y nutri-mcp
```

From a source checkout:

```bash
TRANSPORT=http node packages/core/dist/index.js
```

The server listens on `http://127.0.0.1:3000/mcp`. Change it with `HTTP_PORT` and `HTTP_HOST`:

```bash
TRANSPORT=http HTTP_PORT=8080 HTTP_HOST=0.0.0.0 npx -y nutri-mcp
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST`, `GET`, `DELETE` | `/mcp` | MCP Streamable HTTP endpoint |
| `GET` | `/health` | Status, version, enabled sources and circuit breaker state |
| `GET` | `/` | Server name, version and endpoint list |
| `OPTIONS` | any | CORS preflight (`204`) |

Any other path returns `404`. There is no `/sse` endpoint (the old HTTP+SSE transport was removed); responses to `POST /mcp` may themselves be sent as a `text/event-stream`.

### GET /

```bash
curl -s http://127.0.0.1:3000/
```

```json
{
  "name": "nutri-mcp",
  "version": "0.2.0",
  "transport": "streamable-http",
  "endpoints": { "mcp": "/mcp", "health": "/health" }
}
```

### GET /health

```bash
curl -s http://127.0.0.1:3000/health
```

```json
{
  "status": "healthy",
  "version": "0.2.0",
  "timestamp": "2026-10-29T16:38:42.264Z",
  "sources": ["openfoodfacts"],
  "circuitBreakers": {
    "openfoodfacts": { "failures": 0, "successes": 0, "state": "CLOSED" },
    "usda": { "failures": 0, "successes": 0, "state": "CLOSED" },
    "nutritionix": { "failures": 0, "successes": 0, "state": "CLOSED" }
  }
}
```

`sources` lists the product sources that are configured. `circuitBreakers` contains one entry per upstream service that has been used so far (`robotoff`, `openprices` and `openfda` appear after their first request), with `state` `CLOSED`, `OPEN` or `HALF_OPEN` and the times of the last success, failure and next retry when known.

## Calling /mcp with curl

Clients must accept both JSON and server-sent events. A 2025-era session starts with `initialize`:

```bash
curl -s http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1.0.0"}}}'
```

Because the server is stateless, there is no session id to carry over. Later requests send the negotiated version in the `MCP-Protocol-Version` header:

```bash
curl -s http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2025-06-18' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"getNovaGroup","arguments":{"barcode":"3017620422003"}}}'
```

The response is an SSE `message` event whose data is the JSON-RPC result:

```
event: message
data: {"result":{"content":[{"type":"text","text":"{\"product\":{\"barcode\":\"3017620422003\",\"name\":\"Nutella\"},\"novaGroup\":3,\"description\":\"Processed foods\",\"ultraProcessed\":false}"}],"structuredContent":{"product":{"barcode":"3017620422003","name":"Nutella"},"novaGroup":3,"description":"Processed foods","ultraProcessed":false}},"jsonrpc":"2.0","id":2}
```

Other methods work the same way: `tools/list`, `resources/list`, `resources/read` (for example `nutri://guides/nutriscore` or `nutri://product/3017620422003`), `prompts/list` and `prompts/get`.

::: tip 2026-07-28 requests
Requests that declare `MCP-Protocol-Version: 2026-07-28` must carry the per-request `_meta` envelope defined by that revision; the server answers `400 Invalid params` otherwise. Use an MCP SDK rather than hand-written requests for that revision.
:::

## TypeScript client

With the official client SDK (`@modelcontextprotocol/client` v2):

```typescript
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const client = new Client({ name: 'my-app', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp')));

const result = await client.callTool({
  name: 'getNovaGroup',
  arguments: { barcode: '3017620422003' },
});
console.log(result.structuredContent);
// { product: { barcode: '3017620422003', name: 'Nutella' }, novaGroup: 3, ... }

await client.close();
```

By default the client negotiates a 2025-era version. To use the stateless 2026-07-28 revision, pin it:

```typescript
const client = new Client(
  { name: 'my-app', version: '1.0.0' },
  { versionNegotiation: { mode: { pin: '2026-07-28' } } },
);
```

## Security

### Origin checks (DNS rebinding protection)

Browsers send an `Origin` header. Requests from a browser origin that is not allowed get `403 {"error":"Origin not allowed: ..."}`:

- With `ALLOWED_ORIGINS` unset, only `http(s)://localhost`, `127.0.0.1` and `[::1]` origins (any port) are allowed.
- With `ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com`, exactly those origins are allowed.
- `ALLOWED_ORIGINS=*` allows every origin.

Requests without an `Origin` header (curl, server-to-server) are always allowed. Allowed origins get CORS headers (`Access-Control-Allow-Origin` echoing the origin, methods `GET, POST, DELETE, OPTIONS`, and the MCP headers such as `Mcp-Protocol-Version`).

### Binding and authentication

The server binds to `127.0.0.1` unless `HTTP_HOST` says otherwise, and has **no authentication**. If you expose it beyond localhost, put it behind a reverse proxy that handles TLS and access control.

## Docker Compose

Once the npm package is published, with the Dockerfile from [Installation](/guide/installation#docker):

```yaml
services:
  nutri-mcp:
    build: .
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      TRANSPORT: http
      HTTP_PORT: "3000"
      HTTP_HOST: 0.0.0.0
      OFF_CONTACT_EMAIL: you@example.com
      USDA_API_KEY: ${USDA_API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Rate limits

HTTP clients share the same upstream rate limits as stdio (they are per process, not per HTTP client). The server does not add rate-limit headers to responses; see [Resilience](/guide/resilience).
