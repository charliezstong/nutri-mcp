# Claude Code Setup

## Add the server

From npm (once the package is published):

```bash
claude mcp add nutri-mcp -- npx -y nutri-mcp
```

From a source checkout (after `pnpm install && pnpm --filter nutri-mcp build`, run from the repository root):

```bash
claude mcp add nutri-mcp -- node "$(pwd)/packages/core/dist/index.js"
```

Everything after `--` is the command Claude Code starts; the server talks to it over stdio.

### With API keys

Pass environment variables with `-e`:

```bash
claude mcp add nutri-mcp \
  -e OFF_CONTACT_EMAIL=you@example.com \
  -e USDA_API_KEY=your-usda-key \
  -- npx -y nutri-mcp
```

With Nutritionix (paid), which also enables the `estimateNutritionFromText` tool:

```bash
claude mcp add nutri-mcp \
  -e NUTRITIONIX_APP_ID=your-app-id \
  -e NUTRITIONIX_APP_KEY=your-app-key \
  -- npx -y nutri-mcp
```

### Share with a project

`--scope project` stores the server in `.mcp.json` at the project root so everyone working in the repository gets it:

```bash
claude mcp add --scope project nutri-mcp -- npx -y nutri-mcp
```

```json
{
  "mcpServers": {
    "nutri-mcp": {
      "command": "npx",
      "args": ["-y", "nutri-mcp"],
      "env": {}
    }
  }
}
```

Use `--scope user` to make it available in all your projects.

### Connect to a running HTTP server

If Nutri-MCP runs in [HTTP mode](/guide/http-transport), add it by URL instead of a command:

```bash
claude mcp add --transport http nutri-mcp http://127.0.0.1:3000/mcp
```

## Verify

```bash
claude mcp list
```

Inside a session, `/mcp` shows the connection status and the server's tools, resources and prompts. Prompts appear as slash commands, for example `/mcp__nutri-mcp__analyze-product`.

## Try it

> "What's the nutrition for barcode 3017620422003?"

> "Rank 3017620422003 and 7622210449283 by sugar."

> "Check whether 3017620422003 is vegan and explain why."

> "Are there ongoing FDA recalls for peanut butter?"

## Remove

```bash
claude mcp remove nutri-mcp
```

## Troubleshooting

### The server does not connect

1. Check Node.js 20 or later:
   ```bash
   node --version
   ```
2. Run the command yourself to see startup errors (invalid environment variables are reported on stderr):
   ```bash
   npx -y nutri-mcp
   ```
3. For a source checkout, make sure you built it and used an absolute path to `packages/core/dist/index.js`.

### A tool is missing

- `estimateNutritionFromText` only exists when both `NUTRITIONIX_APP_ID` and `NUTRITIONIX_APP_KEY` are set and `ENABLE_NUTRITIONIX` is not `false`.
- `checkRecalls` is not registered when `ENABLE_RECALLS=false`.

After changing variables, remove and re-add the server, then restart the session.

### USDA data does not show up

Check the key directly:

```bash
curl "https://api.nal.usda.gov/fdc/v1/foods/search?query=apple&pageSize=1&api_key=YOUR_KEY"
```

USDA only covers US branded foods; most European barcodes come from Open Food Facts alone. The `sources` field of each product shows which sources contributed.

### Debug logging

```bash
claude mcp remove nutri-mcp
```

```bash
claude mcp add nutri-mcp \
  -e LOG_LEVEL=debug \
  -e LOG_FILE=/tmp/nutri-mcp.log \
  -- npx -y nutri-mcp
```

Debug logs include cache hits; failed upstream requests are logged as warnings with API keys redacted from URLs. Follow them with `tail -f /tmp/nutri-mcp.log`.
