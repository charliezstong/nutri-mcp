# Nutri-MCP Documentation

| Document | Description |
|----------|-------------|
| [quickstart.md](quickstart.md) | Install and first queries |
| [tools.md](tools.md) | Reference for every tool, generated from the code with real example outputs |
| [configuration.md](configuration.md) | Environment variables, HTTP mode and security |
| [providers.md](providers.md) | Data sources, coverage, limits and licenses |
| [architecture.md](architecture.md) | Code layout, data flow, resilience and testing |

The same content, with more guides, is published as the VitePress site in [`packages/docs`](../packages/docs) (`pnpm docs:dev`).
Regenerate `tools.md` after changing tools with `pnpm --filter nutri-mcp docs:tools`.
