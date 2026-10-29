/**
 * Generates the tool reference (packages/docs/tools/*.md and docs/tools.md)
 * from the running server, so the docs always match the code.
 * Example outputs come from the recorded API fixtures in tests/fixtures.
 *
 *   pnpm docs:tools
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createServer } from '../src/server.js';
import { HttpTransport } from '../src/transport/http.js';
import { stubFetch, defaultRoutes } from '../tests/helpers/fetch-stub.js';
import { TOOL_CALLS } from '../tests/helpers/tool-calls.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const CATEGORIES: { id: string; title: string; intro: string; tools: string[] }[] = [
  {
    id: 'product',
    title: 'Product Tools',
    intro: 'Look up and search food products. Start here to get barcodes.',
    tools: ['getProductByBarcode', 'searchProducts', 'estimateNutritionFromText'],
  },
  {
    id: 'nutrition',
    title: 'Nutrition Tools',
    intro: 'Nutrients, Daily Values, Nutri-Score, Green-Score and NOVA. Values are per 100 g unless stated.',
    tools: ['analyzeNutrition', 'getNutriScore', 'getGreenScore', 'calculateDailyIntake', 'getMacroBreakdown', 'getNutrientDensity', 'analyzeMeal', 'getNovaGroup'],
  },
  {
    id: 'allergen',
    title: 'Allergen & Diet Tools',
    intro: 'Allergens (FDA Big 9, EU 14), cross-contamination, diet compatibility and additives. Based on label data, which can be incomplete.',
    tools: ['checkAllergen', 'checkMultipleAllergens', 'checkBig9', 'checkEU14', 'getAllAllergens', 'getCrossContaminationRisk', 'checkDietCompliance', 'getAdditivesInfo'],
  },
  {
    id: 'comparison',
    title: 'Comparison Tools',
    intro: 'Compare products and find healthier alternatives.',
    tools: ['compareProducts', 'findHealthierAlternative', 'compareNutrientDensity', 'rankByNutrient'],
  },
  {
    id: 'price',
    title: 'Price Tools',
    intro: 'Crowdsourced prices from Open Prices (prices.openfoodfacts.org). Prices in different currencies are never mixed.',
    tools: ['getProductPrices', 'searchPrices', 'getPriceStats', 'findBestPrice', 'comparePrices', 'getRecentPrices', 'getPriceHistory', 'findDeals'],
  },
  {
    id: 'recipe',
    title: 'Recipe & Meal Tools',
    intro: 'Meal analysis, meal cost, ingredient substitutes and recipe ideas.',
    tools: ['suggestRecipes', 'substituteIngredient', 'analyzeMealPlan', 'calculateMealCost'],
  },
  {
    id: 'insights',
    title: 'Insights Tools',
    intro: 'Robotoff machine-learning predictions and data quality checks.',
    tools: ['getProductInsights', 'getAIQuestions', 'qualityCheck'],
  },
  {
    id: 'safety',
    title: 'Safety Tools',
    intro: 'US FDA food recalls (openFDA food enforcement reports, updated weekly).',
    tools: ['checkRecalls'],
  },
];

interface JsonSchema {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  default?: unknown;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  anyOf?: JsonSchema[];
}

function typeOf(schema: JsonSchema): string {
  if (schema.enum) return schema.enum.map((v) => `\`${String(v)}\``).join(' \\| ');
  if (schema.anyOf) return schema.anyOf.map(typeOf).join(' \\| ');
  if (schema.type === 'array') return `${schema.items ? typeOf(schema.items) : 'any'}[]`;
  if (Array.isArray(schema.type)) return schema.type.join(' \\| ');
  return schema.type ?? 'any';
}

function constraints(schema: JsonSchema): string {
  const parts: string[] = [];
  if (schema.minimum !== undefined || schema.maximum !== undefined) {
    parts.push(`${schema.minimum ?? ''}–${schema.maximum ?? ''}`);
  }
  if (schema.minItems !== undefined || schema.maxItems !== undefined) {
    parts.push(`${schema.minItems ?? 0}–${schema.maxItems ?? '∞'} items`);
  }
  if (schema.default !== undefined) parts.push(`default \`${JSON.stringify(schema.default)}\``);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

/** Shorten arrays and strings so examples stay readable */
function trim(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) {
    const items = value.slice(0, depth === 0 ? 3 : 2).map((v) => trim(v, depth + 1));
    return value.length > items.length ? [...items, `… ${value.length - items.length} more`] : items;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, trim(v, depth + 1)]));
  }
  if (typeof value === 'string' && value.length > 160) return `${value.slice(0, 157)}…`;
  return value;
}

function hints(annotations: Record<string, unknown> | undefined): string {
  if (!annotations) return '';
  const flags = [
    annotations['readOnlyHint'] ? 'read-only' : null,
    annotations['openWorldHint'] ? 'calls external APIs' : 'local computation',
    annotations['idempotentHint'] ? 'idempotent' : null,
  ].filter(Boolean);
  return flags.join(' · ');
}

const BANNER = '<!-- Generated by `pnpm --filter nutri-mcp docs:tools` from the server code. Do not edit by hand. -->';

async function main(): Promise<void> {
  process.env['LOG_LEVEL'] = 'error';
  // Show the optional Nutritionix tool in the reference
  process.env['NUTRITIONIX_APP_ID'] ??= 'docs';
  process.env['NUTRITIONIX_APP_KEY'] ??= 'docs';
  stubFetch(defaultRoutes());

  const http = new HttpTransport(() => createServer());
  const client = new Client({ name: 'docs', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost/mcp'), {
    fetch: (input, init) => http.handler.fetch(new Request(input, init)),
  }));

  const { tools } = await client.listTools();
  const byName = new Map(tools.map((t) => [t.name, t]));
  const documented = new Set(CATEGORIES.flatMap((c) => c.tools));
  const undocumented = tools.filter((t) => !documented.has(t.name)).map((t) => t.name);
  if (undocumented.length > 0) {
    throw new Error(`Add these tools to a category in generate-tool-docs.ts: ${undocumented.join(', ')}`);
  }

  const sections: Record<string, string> = {};

  for (const category of CATEGORIES) {
    let md = `${BANNER}\n\n# ${category.title}\n\n${category.intro}\n`;

    for (const name of category.tools) {
      const tool = byName.get(name);
      if (!tool) continue;
      const input = tool.inputSchema as JsonSchema;
      const output = tool.outputSchema as JsonSchema | undefined;
      const required = new Set(input.required ?? []);

      md += `\n## ${name}\n\n**${tool.annotations?.title ?? tool.title ?? name}** — ${hints(tool.annotations as Record<string, unknown>)}\n\n${tool.description ?? ''}\n`;
      if (name === 'estimateNutritionFromText') {
        md += '\n::: info\nOnly available when `NUTRITIONIX_APP_ID` and `NUTRITIONIX_APP_KEY` are set.\n:::\n';
      }
      if ((tool._meta as { ui?: unknown } | undefined)?.ui) {
        md += '\n::: tip MCP Apps\nHosts that support MCP Apps render this result as an interactive card.\n:::\n';
      }

      const params = Object.entries(input.properties ?? {});
      if (params.length > 0) {
        md += '\n### Parameters\n\n| Name | Type | Required | Description |\n|------|------|----------|-------------|\n';
        for (const [param, schema] of params) {
          md += `| \`${param}\` | ${typeOf(schema)} | ${required.has(param) ? 'Yes' : 'No'} | ${(schema.description ?? '').replace(/\|/g, '\\|')}${constraints(schema)} |\n`;
        }
      }

      if (output?.properties) {
        md += `\n### Output\n\n${Object.entries(output.properties)
          .map(([field, schema]) => `- \`${field}\`${(output.required ?? []).includes(field) ? '' : ' (optional)'}: ${typeOf(schema)}`)
          .join('\n')}\n`;
      }

      const args = TOOL_CALLS[name];
      if (args) {
        const result = await client.callTool({ name, arguments: args });
        if (!result.isError && result.structuredContent !== undefined) {
          md += `\n### Example\n\n\`\`\`json\n// ${name}(${JSON.stringify(args)})\n${JSON.stringify(trim(result.structuredContent), null, 2)}\n\`\`\`\n`;
        }
      }
    }

    sections[category.id] = md;
    writeFileSync(join(root, 'packages', 'docs', 'tools', `${category.id}.md`), md);
  }

  // Overview page
  let overview = `${BANNER}\n\n# Tools Overview\n\nNutri-MCP exposes **${tools.length} tools** (plus \`estimateNutritionFromText\` when Nutritionix is configured). All tools are read-only and return both \`structuredContent\` (validated against an \`outputSchema\`) and a JSON text block.\n\n| Category | Tool | Description |\n|----------|------|-------------|\n`;
  for (const category of CATEGORIES) {
    for (const name of category.tools) {
      const tool = byName.get(name);
      if (!tool) continue;
      overview += `| [${category.title.replace(' Tools', '')}](./${category.id}.md) | [\`${name}\`](./${category.id}.md#${name.toLowerCase()}) | ${(tool.description ?? '').split(/\.\s+(?=[A-Z])/)[0]!.replace(/\.$/, '').replace(/\|/g, '\\|')} |\n`;
    }
  }
  writeFileSync(join(root, 'packages', 'docs', 'tools', 'overview.md'), overview);

  // Single-file reference for the repository docs folder: one level deeper
  // headings, in-page links, VitePress containers as blockquotes
  const demote = (md: string): string => md.replace(BANNER, '').replace(/^(#{1,5}) /gm, '#$1 ');
  const single = [
    overview
      .replace(/\]\(\.\/[a-z]+\.md#([a-z]+)\)/g, '](#$1)')
      .replace(/\]\(\.\/([a-z]+)\.md\)/g, (_m, id: string) => {
        const title = CATEGORIES.find((c) => c.id === id)!.title;
        // GitHub heading slugs: drop punctuation, each space becomes "-"
        return `](#${title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s/g, '-')})`;
      }),
    ...CATEGORIES.map((c) => demote(sections[c.id]!)),
  ]
    .join('\n')
    .replace(/::: *(?:info|tip)[^\n]*\n([\s\S]*?):::\n/g, '> $1');
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(join(root, 'docs', 'tools.md'), single);

  await client.close();
  await http.handler.close();
  console.log(`Documented ${tools.length} tools in ${CATEGORIES.length} categories`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
