import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getProductService } from '../../services/product.service.js';
import { getComparisonService } from '../../services/comparison.service.js';
import { uiToolMeta } from '../../ui/index.js';
import type { Product } from '../../types/product.types.js';
import {
  barcodeInput,
  barcodeListInput,
  registerJsonTool,
} from '../shared.js';

const KEY_NUTRIENTS = ['energy_kcal', 'fat', 'saturated_fat', 'sugars', 'fiber', 'protein', 'salt'];

const productScoresOutput = z.object({
  barcode: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  nutriScore: z.string().optional(),
  greenScore: z.string().optional(),
  novaGroup: z.number().optional(),
});

function scores(p: Product): z.infer<typeof productScoresOutput> {
  return {
    barcode: p.barcode,
    name: p.name,
    brand: p.brand,
    nutriScore: p.nutriScore?.grade,
    greenScore: p.greenScore?.grade,
    novaGroup: p.novaGroup,
  };
}

const CORE_NUTRIENTS = ['energy_kcal', 'fat', 'saturated_fat', 'sugars', 'salt', 'protein'];

function hasCoreNutrients(p: Product): boolean {
  return CORE_NUTRIENTS.every((id) => p.nutrients.some((n) => n.id === id));
}

async function requireAtLeastTwo(barcodes: string[]): Promise<{ found: Product[]; missing: string[] }> {
  const result = await getProductService().getMany(barcodes);
  if (result.found.length < 2) {
    throw new Error(
      `Need at least 2 known products to compare; found ${result.found.length}` +
      (result.missing.length ? ` (not found: ${result.missing.join(', ')})` : ''),
    );
  }
  return result;
}

export function registerComparisonTools(server: McpServer): void {
  const productService = getProductService();
  const comparisonService = getComparisonService();

  registerJsonTool(
    server,
    'compareProducts',
    {
      title: 'Compare products',
      description:
        'Compare 2-5 products side by side (Nutri-Score, Green-Score, NOVA and key nutrients per 100 g) and pick the healthier option.',
      inputSchema: z.object({
        barcodes: barcodeListInput(2, 5).describe('2-5 product barcodes'),
      }),
      outputSchema: z.object({
        products: z.array(productScoresOutput),
        missing: z.array(z.string()),
        winner: z.object({ barcode: z.string(), reason: z.string() }).optional(),
        summary: z.string(),
        keyNutrients: z.array(z.object({
          id: z.string(),
          name: z.string(),
          unit: z.string(),
          values: z.record(z.string(), z.number().nullable()),
          better: z.string().optional(),
        })),
      }),
      _meta: uiToolMeta(),
    },
    async ({ barcodes }) => {
      const { found, missing } = await requireAtLeastTwo(barcodes);
      const comparison = comparisonService.compare(found);

      const keyNutrients = comparison.comparison.nutritionComparison
        .filter((c) => KEY_NUTRIENTS.includes(c.nutrientId))
        .sort((a, b) => KEY_NUTRIENTS.indexOf(a.nutrientId) - KEY_NUTRIENTS.indexOf(b.nutrientId))
        .map((c) => ({
          id: c.nutrientId,
          name: c.name,
          unit: c.values.find((v) => v.unit)?.unit ?? '',
          values: Object.fromEntries(c.values.map((v) => [v.barcode, v.value])),
          better: c.better,
        }));

      return {
        products: found.map(scores),
        missing,
        winner: comparison.comparison.winner,
        summary: comparison.comparison.summary,
        keyNutrients,
      };
    },
  );

  registerJsonTool(
    server,
    'findHealthierAlternative',
    {
      title: 'Find healthier alternative',
      description:
        'Find a healthier alternative to a product (better Nutri-Score, less processed, less salt/sugar/saturated fat, more fiber/protein). Pass candidate barcodes, or omit them to search the product\'s own category.',
      inputSchema: z.object({
        barcode: barcodeInput.describe('Barcode of the original product'),
        alternativeBarcodes: barcodeListInput(1, 10).optional().describe('Candidate barcodes; omit to search the same category'),
      }),
      outputSchema: z.object({
        original: productScoresOutput,
        found: z.boolean(),
        alternative: productScoresOutput.optional(),
        improvements: z.array(z.string()),
        candidatesConsidered: z.number(),
        searchedCategory: z.string().optional(),
        message: z.string(),
      }),
    },
    async ({ barcode, alternativeBarcodes }) => {
      const original = await productService.requireByBarcode(barcode);
      let candidates: Product[];
      let searchedCategory: string | undefined;

      if (alternativeBarcodes && alternativeBarcodes.length > 0) {
        candidates = (await productService.getMany(alternativeBarcodes)).found;
      } else {
        searchedCategory = original.categoryTags?.[original.categoryTags.length - 1];
        if (!searchedCategory) {
          throw new Error('The product has no category to search in; pass alternativeBarcodes instead');
        }
        const better = original.nutriScore && original.nutriScore.grade !== 'A'
          ? (['A', 'B', 'C', 'D'] as const)[Math.max(0, ['A', 'B', 'C', 'D', 'E'].indexOf(original.nutriScore.grade) - 1)]
          : 'B';
        const search = await productService.search(
          { category: searchedCategory, nutriScoreMax: better },
          { page: 1, pageSize: 10 },
          ['openfoodfacts'],
        );
        // Detail lookups are rate limited; inspect the best few summaries only
        const shortlist = search.items
          .filter((s) => s.barcode !== original.barcode)
          .sort((a, b) => (a.nutriScoreGrade ?? 'Z').localeCompare(b.nutriScoreGrade ?? 'Z') || (a.novaGroup ?? 5) - (b.novaGroup ?? 5))
          .slice(0, 5)
          .map((s) => s.barcode);
        // Skip records too incomplete to compare fairly
        candidates = (await productService.getMany(shortlist)).found.filter(hasCoreNutrients);
      }

      const result = comparisonService.findHealthierAlternative(original, candidates);
      return {
        original: scores(original),
        found: !!result,
        alternative: result ? scores(result.alternative) : undefined,
        improvements: result?.improvements ?? [],
        candidatesConsidered: candidates.length,
        searchedCategory,
        message: result
          ? `${result.alternative.name} is a healthier alternative to ${original.name}`
          : 'No healthier alternative found among the candidates',
      };
    },
  );

  registerJsonTool(
    server,
    'compareNutrientDensity',
    {
      title: 'Compare nutrient density',
      description: 'Rank products by nutrient density (% Daily Value of beneficial nutrients per 100 kcal).',
      inputSchema: z.object({
        barcodes: barcodeListInput(2, 10).describe('Product barcodes'),
      }),
      outputSchema: z.object({
        ranking: z.array(z.object({ barcode: z.string(), name: z.string(), density: z.number() })),
        mostNutrientDense: z.string(),
        missing: z.array(z.string()),
      }),
    },
    async ({ barcodes }) => {
      const { found, missing } = await requireAtLeastTwo(barcodes);
      const result = comparisonService.compareNutrientDensity(found);
      return { ranking: result.ranking, mostNutrientDense: result.best, missing };
    },
  );

  registerJsonTool(
    server,
    'rankByNutrient',
    {
      title: 'Rank by nutrient',
      description: 'Rank products by one nutrient per 100 g (e.g. highest protein, lowest sugars). Products without data go last.',
      inputSchema: z.object({
        barcodes: barcodeListInput(2, 10).describe('Product barcodes'),
        nutrient: z.string().trim().min(2).describe('Nutrient id, e.g. protein, fiber, sugars, salt, sodium, saturated_fat, energy_kcal'),
        ascending: z.boolean().default(true).describe('true = lowest first, false = highest first'),
      }),
      outputSchema: z.object({
        nutrient: z.string(),
        sortOrder: z.string(),
        ranking: z.array(z.object({
          barcode: z.string(),
          name: z.string(),
          value: z.number().nullable(),
          unit: z.string().optional(),
        })),
        missing: z.array(z.string()),
      }),
    },
    async ({ barcodes, nutrient, ascending }) => {
      const { found, missing } = await requireAtLeastTwo(barcodes);
      return {
        nutrient,
        sortOrder: ascending ? 'lowest first' : 'highest first',
        ranking: comparisonService.rankByNutrient(found, nutrient, ascending),
        missing,
      };
    },
  );
}

