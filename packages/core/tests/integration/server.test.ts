import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createServer } from '../../src/server.js';
import { HttpTransport } from '../../src/transport/http.js';
import { PRODUCT_VIEW_URI } from '../../src/ui/index.js';
import { stubFetch, defaultRoutes } from '../helpers/fetch-stub.js';

const NUTELLA = '3017620422003';
const PRINCE = '7622210449283';

/** One call per tool, with arguments that hit the fixtures */
const TOOL_CALLS: Record<string, Record<string, unknown>> = {
  getProductByBarcode: { barcode: NUTELLA },
  searchProducts: { query: 'nutella', pageSize: 3 },
  analyzeNutrition: { barcode: NUTELLA },
  getNutriScore: { barcode: PRINCE },
  getGreenScore: { barcode: NUTELLA },
  calculateDailyIntake: { barcode: PRINCE, servings: 2 },
  getMacroBreakdown: { barcode: NUTELLA },
  getNutrientDensity: { barcode: PRINCE },
  analyzeMeal: { barcodes: [NUTELLA, PRINCE], grams: [15, 40] },
  getNovaGroup: { barcode: PRINCE },
  checkAllergen: { barcode: NUTELLA, allergen: 'dairy' },
  checkMultipleAllergens: { barcode: PRINCE, allergens: ['wheat', 'peanuts'] },
  checkBig9: { barcode: NUTELLA },
  checkEU14: { barcode: PRINCE },
  getAllAllergens: { barcode: PRINCE },
  getCrossContaminationRisk: { barcode: PRINCE },
  checkDietCompliance: { barcode: NUTELLA, diet: 'vegan' },
  getAdditivesInfo: { barcode: PRINCE },
  compareProducts: { barcodes: [NUTELLA, PRINCE] },
  findHealthierAlternative: { barcode: NUTELLA, alternativeBarcodes: [PRINCE] },
  compareNutrientDensity: { barcodes: [NUTELLA, PRINCE] },
  rankByNutrient: { barcodes: [NUTELLA, PRINCE], nutrient: 'sugars' },
  getProductPrices: { barcode: NUTELLA, limit: 3 },
  searchPrices: { barcode: NUTELLA, currency: 'eur' },
  getPriceStats: { barcode: NUTELLA },
  findBestPrice: { barcode: NUTELLA },
  comparePrices: { barcodes: [NUTELLA, PRINCE] },
  getRecentPrices: { limit: 2 },
  getPriceHistory: { barcode: NUTELLA, months: 60 },
  findDeals: { currency: 'EUR' },
  suggestRecipes: { barcode: NUTELLA, diets: ['vegetarian'] },
  substituteIngredient: { ingredient: 'huevo', need: 'vegan' },
  analyzeMealPlan: { meals: [{ name: 'Breakfast', barcodes: [NUTELLA], grams: [20] }, { name: 'Snack', barcodes: [PRINCE] }] },
  calculateMealCost: { barcodes: [NUTELLA], grams: [20] },
  getProductInsights: { barcode: NUTELLA },
  getAIQuestions: { barcode: NUTELLA },
  qualityCheck: { barcode: PRINCE },
  checkRecalls: { query: 'peanut butter', limit: 2 },
};

for (const era of ['legacy', 'modern'] as const) {
  describe(`MCP server over Streamable HTTP (${era} era)`, () => {
    let client: Client;
    let http: HttpTransport;

    beforeAll(async () => {
      stubFetch(defaultRoutes());
      http = new HttpTransport(() => createServer());
      const handler = http.handler;
      client = new Client(
        { name: 'test', version: '1.0.0' },
        era === 'modern' ? { versionNegotiation: { mode: { pin: '2026-07-28' } } } : {},
      );
      await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost/mcp'), {
        fetch: (input, init) => handler.fetch(new Request(input, init)),
      }));
    });

    afterAll(async () => {
      await client.close();
      await http.handler.close();
      vi.unstubAllGlobals();
    });

    it('negotiates the expected protocol era', () => {
      expect(client.getProtocolEra()).toBe(era);
    });

    it('lists every tool with an output schema and read-only annotations', async () => {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual(Object.keys(TOOL_CALLS).sort());
      for (const tool of tools) {
        expect(tool.outputSchema, tool.name).toBeDefined();
        expect(tool.annotations?.readOnlyHint, tool.name).toBe(true);
        expect(tool.annotations?.title, tool.name).toBeTruthy();
      }
      const ui = tools.filter((t) => (t._meta as { ui?: { resourceUri?: string } } | undefined)?.ui?.resourceUri === PRODUCT_VIEW_URI);
      expect(ui.map((t) => t.name).sort()).toEqual(['compareProducts', 'getProductByBarcode']);
    });

    for (const [name, args] of Object.entries(TOOL_CALLS)) {
      it(`calls ${name}`, async () => {
        const result = await client.callTool({ name, arguments: args });
        const text = (result.content as { type: string; text?: string }[])[0]?.text;
        expect(result.isError, text).toBeFalsy();
        expect(result.structuredContent).toBeDefined();
        expect(JSON.parse(text!)).toEqual(result.structuredContent);
      });
    }

    it('returns a resource link with product lookups', async () => {
      const result = await client.callTool({ name: 'getProductByBarcode', arguments: { barcode: NUTELLA } });
      const link = (result.content as { type: string; uri?: string }[]).find((c) => c.type === 'resource_link');
      expect(link?.uri).toBe(`nutri://product/${NUTELLA}`);
      const sodium = (result.structuredContent as { product: { nutrients: { id: string; value: number; unit: string }[] } })
        .product.nutrients.find((n) => n.id === 'sodium');
      expect(sodium).toMatchObject({ unit: 'mg' });
      expect(sodium!.value).toBeCloseTo(42.8, 1);
    });

    it('reports unknown barcodes as tool errors', async () => {
      const result = await client.callTool({ name: 'getProductByBarcode', arguments: { barcode: '0000000000017' } });
      expect(result.isError).toBe(true);
      expect((result.content as { text: string }[])[0]!.text).toMatch(/PRODUCT_NOT_FOUND/);
    });

    it('rejects invalid input', async () => {
      const result = await client.callTool({ name: 'getProductByBarcode', arguments: { barcode: 'abc' } });
      expect(result.isError).toBe(true);
    });

    it('reads guides, the product template and the MCP Apps view', async () => {
      const { resources } = await client.listResources();
      expect(resources.map((r) => r.uri)).toEqual(expect.arrayContaining([
        'nutri://guides/nutriscore', 'nutri://guides/greenscore', PRODUCT_VIEW_URI,
      ]));
      const product = await client.readResource({ uri: `nutri://product/${PRINCE}` });
      expect(JSON.parse((product.contents[0] as { text: string }).text).name).toBe('Prince');
      const view = await client.readResource({ uri: PRODUCT_VIEW_URI });
      expect(view.contents[0]!.mimeType).toBe('text/html;profile=mcp-app');
      expect((view.contents[0] as { text: string }).text).toContain('ui/initialize');
    });

    it('serves prompts that reference existing tools', async () => {
      const { prompts } = await client.listPrompts();
      const toolNames = Object.keys(TOOL_CALLS);
      for (const prompt of prompts) {
        const args = Object.fromEntries((prompt.arguments ?? []).map((a) => [a.name, 'x']));
        const result = await client.getPrompt({ name: prompt.name, arguments: args });
        const text = (result.messages[0]!.content as { text: string }).text;
        const parameterNames = new Set(['nutriScoreMax', 'novaMax', 'pageSize']);
        const referenced = [...text.matchAll(/\b([a-z]+[A-Z][A-Za-z0-9]+)\b/g)]
          .map((m) => m[1]!)
          .filter((word) => !parameterNames.has(word));
        for (const ref of referenced) {
          expect(toolNames, `${prompt.name} references ${ref}`).toContain(ref);
        }
      }
    });
  });
}

describe('HTTP endpoints', () => {
  let http: HttpTransport;
  let base: string;

  beforeAll(async () => {
    http = new HttpTransport(() => createServer());
    const { port } = await http.start(0, '127.0.0.1');
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await http.stop();
  });

  it('serves /health', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'healthy', sources: ['openfoodfacts'] });
  });

  it('rejects foreign browser origins (DNS rebinding protection)', async () => {
    const res = await fetch(`${base}/mcp`, { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(403);
  });

  it('allows localhost origins with CORS headers', async () => {
    const res = await fetch(`${base}/mcp`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });
});
