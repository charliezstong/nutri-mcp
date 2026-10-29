import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/server';

/**
 * MCP Apps (io.modelcontextprotocol/ui) support: tools that reference this
 * resource get an interactive product card / comparison table in hosts that
 * render MCP Apps. Other hosts ignore the metadata.
 */
export const PRODUCT_VIEW_URI = 'ui://nutri-mcp/product-view.html';
export const MCP_APP_MIME_TYPE = 'text/html;profile=mcp-app';

/**
 * Tool `_meta` linking a tool to the product view. Both the current nested
 * key and the older flat "ui/resourceUri" key are set for host compatibility.
 */
export function uiToolMeta(): Record<string, unknown> {
  return {
    ui: { resourceUri: PRODUCT_VIEW_URI },
    'ui/resourceUri': PRODUCT_VIEW_URI,
  };
}

const RESOURCE_META = {
  ui: {
    csp: {
      resourceDomains: ['https://images.openfoodfacts.org', 'https://static.openfoodfacts.org'],
    },
    prefersBorder: true,
  },
};

let cachedHtml: string | null = null;

/**
 * The view HTML, loaded from the file next to this module (src/ui in
 * development, dist/ui once built).
 */
export function productViewHtml(): string {
  cachedHtml ??= readFileSync(fileURLToPath(new URL('./product-view.html', import.meta.url)), 'utf8');
  return cachedHtml;
}

export function registerUiResources(server: McpServer): void {
  server.registerResource(
    'product-view',
    PRODUCT_VIEW_URI,
    {
      title: 'Nutri-MCP product view',
      description: 'Interactive product card and comparison table (MCP Apps)',
      mimeType: MCP_APP_MIME_TYPE,
      _meta: RESOURCE_META,
    },
    async () => ({
      contents: [{
        uri: PRODUCT_VIEW_URI,
        mimeType: MCP_APP_MIME_TYPE,
        text: productViewHtml(),
        _meta: RESOURCE_META,
      }],
    }),
  );
}
