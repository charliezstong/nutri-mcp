import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getProductService } from '../../services/product.service.js';
import { getRecallService } from '../../services/recall.service.js';
import { barcodeInput, registerJsonTool } from '../shared.js';

export function registerSafetyTools(server: McpServer): void {
  const productService = getProductService();
  const recallService = getRecallService();

  registerJsonTool(
    server,
    'checkRecalls',
    {
      title: 'Check food recalls',
      description:
        'Search US FDA food recall / enforcement reports (openFDA) by barcode and/or product text. With only a barcode, the product name and brand are also searched. Matches by text are possible, not certain.',
      inputSchema: z.object({
        barcode: barcodeInput.optional(),
        query: z.string().trim().min(2).max(100).optional().describe('Product or brand words, e.g. "peanut butter"'),
        ongoingOnly: z.boolean().default(false).describe('Only recalls that are still ongoing'),
        limit: z.number().int().min(1).max(50).default(10),
      }).refine((v) => v.barcode || v.query, { message: 'Provide a barcode or a query' }),
      outputSchema: z.object({
        searched: z.object({ barcode: z.string().optional(), text: z.string().optional() }),
        count: z.number(),
        recalls: z.array(z.looseObject({
          recallNumber: z.string(),
          status: z.string(),
          classification: z.string(),
          reportDate: z.string().optional(),
          recallingFirm: z.string(),
          productDescription: z.string(),
          reason: z.string(),
          matchedBy: z.enum(['barcode', 'text']),
        })),
        coverage: z.string(),
      }),
    },
    async ({ barcode, query, ongoingOnly, limit }) => {
      let text = query;
      if (!text && barcode) {
        const product = await productService.getByBarcode(barcode).catch(() => null);
        if (product && product.name !== 'Unknown Product') {
          const brand = product.brand?.split(',')[0]?.trim();
          text = [brand, product.name].filter(Boolean).join(' ');
        }
      }

      const recalls = await recallService.search({ barcode, text, ongoingOnly, limit });
      return {
        searched: { barcode, text },
        count: recalls.length,
        recalls,
        coverage: 'United States (FDA-regulated foods), updated weekly. Classification: Class I = most serious health risk.',
      };
    },
  );
}
