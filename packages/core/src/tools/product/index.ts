import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getProductService } from '../../services/product.service.js';
import { getNutritionixProvider } from '../../providers/nutritionix/index.js';
import { ProductNotFoundError } from '../../errors/index.js';
import { uiToolMeta } from '../../ui/index.js';
import type { NovaGroup } from '../../types/common.types.js';
import {
  barcodeInput,
  nutrientOutput,
  paginationOutput,
  productLink,
  productOutput,
  productSummaryOutput,
  registerJsonTool,
} from '../shared.js';

/**
 * Register product-related MCP tools
 */
export function registerProductTools(server: McpServer): void {
  const productService = getProductService();

  registerJsonTool(
    server,
    'getProductByBarcode',
    {
      title: 'Get product by barcode',
      description:
        'Get the full product record for a barcode: name, brand, nutrients per 100 g (and per serving), Nutri-Score, Green-Score, NOVA group, ingredients, allergens and additives. Data from Open Food Facts, merged with USDA/Nutritionix when configured.',
      inputSchema: z.object({ barcode: barcodeInput }),
      outputSchema: z.object({ product: productOutput }),
      _meta: uiToolMeta(),
      links: ({ product }) => [productLink(product.barcode, product.name)],
    },
    async ({ barcode }) => ({ product: await productService.requireByBarcode(barcode) }),
  );

  registerJsonTool(
    server,
    'searchProducts',
    {
      title: 'Search products',
      description:
        'Search food products by text, brand and/or category, optionally limited to a maximum Nutri-Score grade or NOVA group. Returns summaries with barcodes; use getProductByBarcode for details.',
      inputSchema: z.object({
        query: z.string().trim().min(1).max(200).optional().describe('Free text, e.g. "greek yogurt"'),
        brand: z.string().trim().max(100).optional().describe('Brand name, e.g. "Danone"'),
        category: z.string().trim().max(100).optional().describe('Category name or OFF tag, e.g. "breakfast cereals" or "en:breakfast-cereals"'),
        nutriScoreMax: z.enum(['A', 'B', 'C', 'D', 'E']).optional().describe('Worst acceptable Nutri-Score grade (e.g. "B" returns A and B)'),
        novaMax: z.number().int().min(1).max(4).optional().describe('Most processed acceptable NOVA group'),
        page: z.number().int().min(1).max(100).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      }).refine((v) => v.query || v.brand || v.category, {
        message: 'Provide at least one of query, brand or category',
      }),
      outputSchema: z.object({
        items: z.array(productSummaryOutput),
        pagination: paginationOutput,
        sources: z.array(z.string()),
      }),
    },
    async ({ query, brand, category, nutriScoreMax, novaMax, page, pageSize }) =>
      productService.search({ query, brand, category, nutriScoreMax, novaMax: novaMax as NovaGroup | undefined }, { page, pageSize }),
  );

  // Natural-language nutrition needs Nutritionix credentials (paid API)
  const nix = getNutritionixProvider();
  if (nix.isConfigured()) {
    registerJsonTool(
      server,
      'estimateNutritionFromText',
      {
        title: 'Estimate nutrition from text',
        description:
          'Estimate nutrients for foods described in natural language, e.g. "2 eggs and a slice of whole wheat toast" (Nutritionix).',
        inputSchema: z.object({
          query: z.string().trim().min(2).max(500).describe('Foods and amounts in natural language'),
        }),
        outputSchema: z.object({
          foods: z.array(z.looseObject({
            name: z.string(),
            servingGrams: z.number().optional(),
            nutrients: z.array(nutrientOutput),
          })),
        }),
      },
      async ({ query }) => {
        const foods = await nix.getNutrients(query);
        if (foods.length === 0) throw new ProductNotFoundError(query);
        return {
          foods: foods.map((f) => ({
            name: f.name,
            servingGrams: f.servingSize?.grams,
            serving: f.servingSize?.description,
            nutrients: f.nutrients,
          })),
        };
      },
    );
  }
}
