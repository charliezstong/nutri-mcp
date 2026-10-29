# Configuration

All settings are environment variables, validated at startup (an invalid value stops the server with a clear message). Empty values count as unset.

## Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSPORT` | `stdio` | `stdio` for local hosts, `http` for Streamable HTTP |
| `HTTP_PORT` | `3000` | HTTP port |
| `HTTP_HOST` | `127.0.0.1` | HTTP bind address; use `0.0.0.0` only behind a proxy or in a container |
| `ALLOWED_ORIGINS` | – | Comma-separated browser origins allowed to call `/mcp` (`*` for any). Without it only localhost origins are accepted |
| `OFF_CONTACT_EMAIL` | – | Contact sent in the `User-Agent` (`nutri-mcp/<version> (<contact>)`), as Open Food Facts requests |
| `OFF_BASE_URL` | `https://world.openfoodfacts.org` | Open Food Facts server; `https://world.openfoodfacts.net` is the staging server |
| `USDA_API_KEY` | – | [USDA FoodData Central key](https://fdc.nal.usda.gov/api-key-signup) (free) |
| `NUTRITIONIX_APP_ID` | – | Nutritionix app id (paid API) |
| `NUTRITIONIX_APP_KEY` | – | Nutritionix app key |
| `ENABLE_USDA` | `true` | Use USDA when a key is set |
| `ENABLE_NUTRITIONIX` | `true` | Use Nutritionix when credentials are set |
| `ENABLE_RECALLS` | `true` | Register `checkRecalls` (openFDA) |
| `ENABLE_CACHING` | `true` | In-memory response cache |
| `CACHE_MAX_SIZE` | `1000` | Maximum cached entries (100–100000) |
| `REQUEST_TIMEOUT` | `10000` | Upstream request timeout in ms (1000–60000) |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `LOG_FILE` | – | Also append logs to this file. Logs always go to stderr (stdout is reserved for the protocol) |

Boolean flags accept `true/false`, `1/0`, `yes/no`, `on/off`.

## HTTP mode

```bash
TRANSPORT=http HTTP_PORT=3000 npx -y nutri-mcp
```

| Endpoint | Description |
|----------|-------------|
| `POST /mcp` (and `GET`/`DELETE`) | Streamable HTTP, stateless. Serves 2025-era clients (initialize handshake) and the 2026-07-28 protocol |
| `GET /health` | Status, version, enabled sources, circuit breaker states |
| `GET /` | Server info |

Security defaults:

- Binds to `127.0.0.1`.
- Requests with an `Origin` header that is not localhost or in `ALLOWED_ORIGINS` get `403` (DNS-rebinding protection required by the MCP spec). Requests without `Origin` (CLIs, servers) are allowed.
- There is no authentication: put the server behind your own gateway if you expose it.

## Claude Code examples

```bash
claude mcp add nutri-mcp -e USDA_API_KEY=your-key -e OFF_CONTACT_EMAIL=you@example.com -- npx -y nutri-mcp
```

```bash
claude mcp add --transport http nutri-mcp http://localhost:3000/mcp
```

## Limits worth knowing

- Open Food Facts allows 15 product reads and 10 searches per minute per IP. The server enforces these limits locally, waiting up to 8 seconds for a slot before failing, and caches results (products 30 min, searches 5 min, unknown barcodes 5 min).
- USDA keys allow 1,000 requests per hour.
- openFDA allows 240 requests per minute without a key.
