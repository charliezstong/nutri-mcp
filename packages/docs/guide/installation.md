# Installation

Detailed installation instructions for different environments.

## Requirements

- **Node.js**: 20.0.0 or higher
- **Package Manager**: npm, pnpm, or yarn

## Installation Methods

### Using npx (No Install)

The simplest method. Runs directly without installation:

```bash
npx nutri-mcp
```

### Global Installation

Install once, use anywhere:

::: code-group

```bash [npm]
npm install -g nutri-mcp
```

```bash [pnpm]
pnpm add -g nutri-mcp
```

```bash [yarn]
yarn global add nutri-mcp
```

:::

### Local Installation

Add to a project:

::: code-group

```bash [npm]
npm install nutri-mcp
```

```bash [pnpm]
pnpm add nutri-mcp
```

```bash [yarn]
yarn add nutri-mcp
```

:::

### From Source

For development or customization:

```bash
# Clone repository
git clone https://github.com/nutrimcp/nutri-mcp.git
cd nutri-mcp

# Install dependencies
pnpm install

# Build
pnpm build

# Run
node packages/core/dist/index.js
```

## Claude Code Integration

### Add Server

```bash
# Basic (Open Food Facts only)
claude mcp add nutri-mcp -- npx nutri-mcp

# With USDA
claude mcp add nutri-mcp \
  -e USDA_API_KEY=your-key \
  -- npx nutri-mcp

# With all providers
claude mcp add nutri-mcp \
  -e USDA_API_KEY=your-usda-key \
  -e NUTRITIONIX_APP_ID=your-app-id \
  -e NUTRITIONIX_APP_KEY=your-app-key \
  -- npx nutri-mcp
```

### Verify Connection

```bash
claude mcp list
```

### Remove Server

```bash
claude mcp remove nutri-mcp
```

## Claude Desktop Integration

Edit the configuration file:

::: code-group

```json [macOS]
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "nutri-mcp": {
      "command": "npx",
      "args": ["nutri-mcp"],
      "env": {
        "USDA_API_KEY": "your-key"
      }
    }
  }
}
```

```json [Windows]
// %APPDATA%\Claude\claude_desktop_config.json
{
  "mcpServers": {
    "nutri-mcp": {
      "command": "npx",
      "args": ["nutri-mcp"],
      "env": {
        "USDA_API_KEY": "your-key"
      }
    }
  }
}
```

```json [Linux]
// ~/.config/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "nutri-mcp": {
      "command": "npx",
      "args": ["nutri-mcp"],
      "env": {
        "USDA_API_KEY": "your-key"
      }
    }
  }
}
```

:::

## Docker

```dockerfile
FROM node:20-alpine
RUN npm install -g nutri-mcp
ENV TRANSPORT=http
ENV HTTP_PORT=3000
EXPOSE 3000
CMD ["nutri-mcp"]
```

```bash
docker build -t nutri-mcp .
docker run -p 3000:3000 -e USDA_API_KEY=your-key nutri-mcp
```

## Troubleshooting

### Command not found

Ensure Node.js 20+ is installed:

```bash
node --version
```

### Permission errors

Try with sudo (Linux/macOS) or run as administrator (Windows):

```bash
sudo npm install -g nutri-mcp
```

### Connection issues

Check the server is running:

```bash
claude mcp list
```

Enable debug logging:

```bash
claude mcp add nutri-mcp -e LOG_LEVEL=debug -- npx nutri-mcp
```
