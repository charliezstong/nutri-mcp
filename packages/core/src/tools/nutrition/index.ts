import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getProductService } from '../../services/product.service.js';
import { getNutritionService } from '../../services/nutrition.service.js';
import { round } from '../../utils/text.js';
import {
  barcodeInput,
  barcodeListInput,
  greenScoreOutput,
  nutrientOutput,
  nutriScoreOutput,
  productRef,
  productRefOutput,
  registerJsonTool,
} from '../shared.js';

const NOVA_DESCRIPTIONS: Record<number, string> = {
  1: 'Unprocessed or minimally processed foods',
  2: 'Processed culinary ingredients',
  3: 'Processed foods',
  4: 'Ultra-processed food and drink products',
};

const NUTRISCORE_MEANING: Record<string, string> = {
  A: 'Highest nutritional quality',
  B: 'Good nutritional quality',
  C: 'Average nutritional quality',
  D: 'Poor nutritional quality',
  E: 'Lowest nutritional quality',
};

const trafficLight = z.enum(['low', 'medium', 'high']);

export function registerNutritionTools(server: McpServer): void {
  const productService = getProductService();
  const nutritionService = getNutritionService();

  registerJsonTool(
    server,
    'analyzeNutrition',
    {
      title: 'Analyze nutrition',
      description:
        'Complete nutritional analysis of a product per 100 g: calories, macro split, % Daily Values, UK FSA traffic lights, concerns (high fat/saturates/sugars/salt) and benefits (good/excellent sources).',
      inputSchema: z.object({ barcode: barcodeInput }),
      outputSchema: z.object({
        product: productRefOutput,
        calories: z.number(),
        macros: z.looseObject({}),
        nutrients: z.array(nutrientOutput),
        dailyValueSummary: z.object({ exceeds: z.array(z.string()), adequate: z.array(z.string()), low: z.array(z.string()) }),
        trafficLights: z.object({
          fat: trafficLight.optional(),
          saturated_fat: trafficLight.optional(),
          sugars: trafficLight.optional(),
          salt: trafficLight.optional(),
        }),
        concerns: z.array(z.object({ nutrient: z.string(), level: z.string(), message: z.string() })),
        benefits: z.array(z.object({ nutrient: z.string(), level: z.string(), message: z.string() })),
        basis: z.string(),
      }),
    },
    async ({ barcode }) => {
      const product = await productService.requireByBarcode(barcode);
      return { product: productRef(product), ...nutritionService.analyzeProduct(product) };
    },
  );

  registerJsonTool(
    server,
    'getNutriScore',
    {
      title: 'Get Nutri-Score',
      description:
        'Get the Nutri-Score grade (A-E) with its points breakdown (2023 algorithm when available: negative points for energy, sugars, saturated fat, salt; positive points for fiber, protein, fruits/vegetables/legumes).',
      inputSchema: z.object({ barcode: barcodeInput }),
      outputSchema: z.object({
        product: productRefOutput,
        available: z.boolean(),
        nutriScore: nutriScoreOutput.optional(),
        meaning: z.string().optional(),
      }),
    },
    async ({ barcode }) => {
      const product = await productService.requireByBarcode(barcode);
      const ns = product.nutriScore;
      return {
        product: productRef(product),
        available: !!ns,
        nutriScore: ns,
        meaning: ns ? NUTRISCORE_MEANING[ns.grade] : 'Nutri-Score not computed for this product (missing data or category not applicable)',
      };
    },
  );

  registerJsonTool(
    server,
    'getGreenScore',
    {
      title: 'Get Green-Score',
      description:
        'Get the Green-Score (formerly Eco-Score) environmental impact grade (A+ best to F worst) and score, from Open Food Facts life-cycle analysis.',
      inputSchema: z.object({ barcode: barcodeInput }),
      outputSchema: z.object({
        product: productRefOutput,
        available: z.boolean(),
        greenScore: greenScoreOutput.optional(),
      }),
    },
    async ({ barcode }) => {
      const product = await productService.requireByBarcode(barcode);
      return { product: productRef(product), available: !!product.greenScore, greenScore: product.greenScore };
    },
  );

  registerJsonTool(
    server,
    'calculateDailyIntake',
    {
      title: 'Calculate daily intake',
      description:
        'Nutrients and % Daily Values for a given number of servings (uses the labelled serving size, or `grams` when given).',
      inputSchema: z.object({
        barcode: barcodeInput,
        servings: z.number().positive().max(50).default(1).describe('Number of servings'),
        grams: z.number().positive().max(5000).optional().describe('Override serving size in grams'),
      }),
      outputSchema: z.object({
        product: productRefOutput,
        servings: z.number(),
        gramsPerServing: z.number(),
        servingSource: z.enum(['label', 'input', 'default_100g']),
        totalGrams: z.number(),
        nutrients: z.array(z.object({
          id: z.string(),
          name: z.string(),
          amount: z.number(),
          unit: z.string(),
          dailyValuePercent: z.number().optional(),
        })),
      }),
    },
    async ({ barcode, servings, grams }) => {
      const product = await productService.requireByBarcode(barcode);
      const labelGrams = product.servingSize?.grams;
      const gramsPerServing = grams ?? labelGrams ?? 100;
      const servingSource = grams ? 'input' : labelGrams ? 'label' : 'default_100g';
      const factor = (gramsPerServing * servings) / 100;

      return {
        product: productRef(product),
        servings,
        gramsPerServing,
        servingSource,
        totalGrams: round(gramsPerServing * servings, 1),
        nutrients: product.nutrients
          .filter((n) => n.per100g !== undefined)
          .map((n) => ({
            id: n.id,
            name: n.name,
            amount: round(n.per100g! * factor),
            unit: n.unit,
            dailyValuePercent: n.dailyValuePercent !== undefined ? round(n.dailyValuePercent * factor, 1) : undefined,
          })),
      };
    },
  );

  registerJsonTool(
    server,
    'getMacroBreakdown',
    {
      title: 'Get macro breakdown',
      description: 'Macronutrient breakdown per 100 g: grams, calories and share of energy from protein, carbohydrates and fat.',
      inputSchema: z.object({ barcode: barcodeInput }),
      outputSchema: z.object({ product: productRefOutput, calories: z.number(), macros: z.looseObject({}) }),
    },
    async ({ barcode }) => {
      const product = await productService.requireByBarcode(barcode);
      return {
        product: productRef(product),
        calories: nutritionService.getCalories(product.nutrients),
        macros: nutritionService.calculateMacros(product.nutrients),
      };
    },
  );

  registerJsonTool(
    server,
    'getNutrientDensity',
    {
      title: 'Get nutrient density',
      description: 'Nutrient density score: sum of % Daily Value of beneficial nutrients (fiber, protein, vitamins, minerals) per 100 kcal.',
      inputSchema: z.object({ barcode: barcodeInput }),
      outputSchema: z.object({
        product: productRefOutput,
        calories: z.number(),
        nutrientDensityScore: z.number(),
        interpretation: z.string(),
      }),
    },
    async ({ barcode }) => {
      const product = await productService.requireByBarcode(barcode);
      const density = nutritionService.calculateNutrientDensity(product);
      return {
        product: productRef(product),
        calories: nutritionService.getCalories(product.nutrients),
        nutrientDensityScore: density,
        interpretation: density > 50 ? 'High nutrient density' : density > 25 ? 'Moderate nutrient density' : 'Low nutrient density',
      };
    },
  );

  registerJsonTool(
    server,
    'analyzeMeal',
    {
      title: 'Analyze meal',
      description:
        'Combined nutrition of several products eaten together. Give portion sizes in grams (same order as barcodes); 100 g is assumed when omitted.',
      inputSchema: z.object({
        barcodes: barcodeListInput(1, 20).describe('Product barcodes in the meal'),
        grams: z.array(z.number().positive().max(5000)).max(20).optional().describe('Portion in grams for each barcode'),
      }),
      outputSchema: z.object({
        items: z.array(z.object({ barcode: z.string(), name: z.string(), grams: z.number(), calories: z.number() })),
        missing: z.array(z.string()),
        totalGrams: z.number(),
        totalCalories: z.number(),
        totals: z.array(z.object({ id: z.string(), amount: z.number(), unit: z.string(), dailyValuePercent: z.number().optional() })),
        macros: z.looseObject({}),
      }),
    },
    async ({ barcodes, grams }) => {
      const results = await Promise.all(barcodes.map((b) => productService.getByBarcode(b)));
      const items: { barcode: string; name: string; grams: number; calories: number }[] = [];
      const totals = new Map<string, { amount: number; unit: string; dv?: number }>();
      const missing: string[] = [];

      results.forEach((product, i) => {
        if (!product) {
          missing.push(barcodes[i]!);
          return;
        }
        const portion = grams?.[i] ?? 100;
        const factor = portion / 100;
        items.push({
          barcode: product.barcode,
          name: product.name,
          grams: portion,
          calories: round(nutritionService.getCalories(product.nutrients) * factor, 0),
        });
        for (const n of product.nutrients) {
          const per100 = n.per100g ?? n.value;
          const entry = totals.get(n.id) ?? { amount: 0, unit: n.unit, dv: 0 };
          entry.amount += per100 * factor;
          if (n.dailyValuePercent !== undefined) entry.dv = (entry.dv ?? 0) + n.dailyValuePercent * factor;
          totals.set(n.id, entry);
        }
      });

      if (items.length === 0) {
        throw new Error(`None of the products were found: ${missing.join(', ')}`);
      }

      const totalNutrients = [...totals.entries()].map(([id, t]) => ({
        id,
        amount: round(t.amount),
        unit: t.unit,
        dailyValuePercent: t.dv ? round(t.dv, 1) : undefined,
      }));
      const asNutrients = totalNutrients.map((t) => ({
        id: t.id as never, name: t.id, value: t.amount, unit: t.unit as never, source: 'calculated' as const,
      }));

      return {
        items,
        missing,
        totalGrams: items.reduce((s, i) => s + i.grams, 0),
        totalCalories: items.reduce((s, i) => s + i.calories, 0),
        totals: totalNutrients,
        macros: nutritionService.calculateMacros(asNutrients),
      };
    },
  );

  registerJsonTool(
    server,
    'getNovaGroup',
    {
      title: 'Get NOVA group',
      description: 'NOVA food processing classification (1 = unprocessed ... 4 = ultra-processed) for a product.',
      inputSchema: z.object({ barcode: barcodeInput }),
      outputSchema: z.object({
        product: productRefOutput,
        novaGroup: z.number().int().min(1).max(4).optional(),
        description: z.string(),
        ultraProcessed: z.boolean().optional(),
      }),
    },
    async ({ barcode }) => {
      const product = await productService.requireByBarcode(barcode);
      return {
        product: productRef(product),
        novaGroup: product.novaGroup,
        description: product.novaGroup ? NOVA_DESCRIPTIONS[product.novaGroup]! : 'Not available',
        ultraProcessed: product.novaGroup ? product.novaGroup === 4 : undefined,
      };
    },
  );
}
