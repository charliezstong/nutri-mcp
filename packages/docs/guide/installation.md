# Installation

## Requirements

- Node.js 20 or later (CI tests Node 20, 22 and 24)
- pnpm 9 to build from source

## Run with npx

Once the `nutri-mcp` package is published to npm, no install step is needed:

```bash
npx -y nutri-mcp
```

The server speaks MCP over stdio by default, so it waits for a client on stdin. Logs go to stderr.

## Build from source

```bash
git clone https://github.com/charliezstong/nutri-mcp.git
cd nutri-mcp
pnpm install
pnpm --filter nutri-mcp build
```

The entry point is `packages/core/dist/index.js`:

```bash
node packages/core/dist/index.js
```

## Claude Code

```bash
claude mcp add nutri-mcp -- npx -y nutri-mcp
```

From a source checkout (run from the repository root, or use any absolute path):

```bash
claude mcp add nutri-mcp -- node "$(pwd)/packages/core/dist/index.js"
```

See [Claude Code Setup](/guide/claude-code) for API keys, scopes and troubleshooting.

## Claude Desktop

### One-click bundle (.mcpb)

Nutri-MCP ships as an [MCP Bundle](https://github.com/modelcontextprotocol/mcpb). Download `nutri-mcp-<version>.mcpb` from the [GitHub releases](https://github.com/charliezstong/nutri-mcp/releases) and open it with Claude Desktop. The install dialog asks for the optional settings (contact email, USDA key, Nutritionix app id and key).

To build the bundle yourself:

```bash
pnpm --filter nutri-mcp build
pnpm --filter nutri-mcp pack:mcpb
```

This writes `packages/core/nutri-mcp-<version>.mcpb`. The release workflow (`.github/workflows/release.yml`) builds the same bundle and attaches it to each GitHub release.

### Manual configuration

Alternatively, edit `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "nutri-mcp": {
      "command": "npx",
      "args": ["-y", "nutri-mcp"],
      "env": {
        "OFF_CONTACT_EMAIL": "you@example.com",
        "USDA_API_KEY": "your-usda-key"
      }
    }
  }
}
```

For a source checkout, use `"command": "node"` and `"args": ["/absolute/path/to/nutri-mcp/packages/core/dist/index.js"]`. Restart Claude Desktop after editing.

## Other MCP hosts

Any host that launches stdio servers can use the same command (`npx -y nutri-mcp` or `node .../dist/index.js`). Hosts that connect to remote servers can use [HTTP mode](/guide/http-transport).

## MCP Registry

The server is described in `packages/core/server.json` for the official [MCP Registry](https://registry.modelcontextprotocol.io) under the name `io.github.charliezstong/nutri-mcp` (npm package, stdio transport, optional `OFF_CONTACT_EMAIL`, `USDA_API_KEY`, `NUTRITIONIX_APP_ID`, `NUTRITIONIX_APP_KEY`). The release workflow publishes it when a `v*` tag is pushed.

## MCP Inspector

To browse tools, resources and prompts interactively, build first and then run:

```bash
pnpm --filter nutri-mcp inspect
```

This starts the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) against `node dist/index.js`.

## Docker

Nutri-MCP has no official image. A minimal HTTP image, once the npm package is published:

```dockerfile
FROM node:22-alpine
RUN npm install -g nutri-mcp
ENV TRANSPORT=http
ENV HTTP_PORT=3000
ENV HTTP_HOST=0.0.0.0
EXPOSE 3000
CMD ["nutri-mcp"]
```

```bash
docker build -t nutri-mcp .
docker run -p 3000:3000 -e USDA_API_KEY=your-usda-key nutri-mcp
```

`HTTP_HOST=0.0.0.0` is needed inside a container because the server binds to `127.0.0.1` by default. Do not expose it to untrusted networks without a reverse proxy; see [HTTP Transport](/guide/http-transport#security).

## Troubleshooting

**Check the Node.js version**

```bash
node --version
```

**Run the server directly to see startup errors.** Invalid environment variables stop the server with a message such as `Invalid environment configuration: HTTP_PORT: ...`.

```bash
LOG_LEVEL=debug npx -y nutri-mcp
```

**Keep logs in a file.** Logs always go to stderr (stdout is reserved for JSON-RPC); `LOG_FILE` mirrors them to a file:

```bash
claude mcp add nutri-mcp -e LOG_LEVEL=debug -e LOG_FILE=/tmp/nutri-mcp.log -- npx -y nutri-mcp
```
