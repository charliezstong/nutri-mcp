# Quick Start

## Requirements

- Node.js 20 or newer
- An MCP host: Claude Code, Claude Desktop, or any MCP client

## Install

### Claude Code (npm)

```bash
claude mcp add nutri-mcp -- npx -y nutri-mcp
```

Until the first npm release, use the source install below.

### Claude Desktop (one-click bundle)

Open the `nutri-mcp-<version>.mcpb` file from the GitHub releases, or build it:

```bash
pnpm install && pnpm --filter nutri-mcp build && pnpm --filter nutri-mcp pack:mcpb
```

The install dialog asks for the optional keys (contact email, USDA, Nutritionix).

### From source

```bash
git clone https://github.com/charliezstong/nutri-mcp.git
```

```bash
cd nutri-mcp && pnpm install && pnpm --filter nutri-mcp build
```

```bash
claude mcp add nutri-mcp -- node "$(pwd)/packages/core/dist/index.js"
```

Other hosts use the same command in their JSON config:

```json
{
  "mcpServers": {
    "nutri-mcp": {
      "command": "npx",
      "args": ["-y", "nutri-mcp"],
      "env": { "OFF_CONTACT_EMAIL": "you@example.com" }
    }
  }
}
```

## Verify

```bash
claude mcp list
```

```bash
npx @modelcontextprotocol/inspector@2 --cli npx -y nutri-mcp --method tools/list
```

## Try it

- "What's the nutrition for barcode 3017620422003?"
- "Is barcode 7622210449283 safe for someone allergic to wheat and peanuts?"
- "Compare 3017620422003 and 7622210449283 and tell me which is healthier."
- "Find a healthier alternative to 7622210449283."
- "How has the price of 3017620422003 changed this year?"
- "Are there any ongoing US recalls for peanut butter?"

## Next steps

- Add a free USDA key for US branded foods: see [configuration.md](configuration.md).
- Browse all tools: [tools.md](tools.md).
