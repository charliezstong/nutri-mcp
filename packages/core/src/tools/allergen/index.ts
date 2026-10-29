import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getProductService } from '../../services/product.service.js';
import { getAllergenService } from '../../services/allergen.service.js';
import { getAdditiveService } from '../../services/additive.service.js';
import {
  allergenCheckOutput,
  allergenIdInput,
  allergenOutput,
  barcodeInput,
  dietTypeInput,
  productRef,
  productRefOutput,
  registerJsonTool,
} from '../shared.js';

const DISCLAIMER = 'Based on declared label data, which can be incomplete. People with severe allergies should always check the physical package.';

const multiCheckOutput = z.object({
  product: productRefOutput,
  overallSafe: z.boolean(),
  allergensFound: z.array(z.string()),
  results: z.array(allergenCheckOutput),
  dataAvailable: z.boolean(),
  disclaimer: z.string(),
});

export function registerAllergenTools(server: McpServer): void {
  const productService = getProductService();
  const allergenService = getAllergenService();
  const additiveService = getAdditiveService();

  const hasAllergenData = (p: { ingredientsText?: string; allergens: unknown[]; traces: unknown[] }): boolean =>
    !!p.ingredientsText || p.allergens.length > 0 || p.traces.length > 0;

  registerJsonTool(
    server,
    'checkAllergen',
    {
      title: 'Check allergen',
      description: 'Check whether a product contains (or may contain traces of) a specific allergen.',
      inputSchema: z.object({
        barcode: barcodeInput,
        allergen: allergenIdInput.describe('Allergen to check'),
      }),
      outputSchema: z.object({
        product: productRefOutput,
        result: allergenCheckOutput,
        dataAvailable: z.boolean(),
        message: z.string(),
        disclaimer: z.string(),
      }),
    },
    async ({ barcode, allergen }) => {
      const product = await productService.requireByBarcode(barcode);
      const result = allergenService.checkAllergen(product, allergen);
      const dataAvailable = hasAllergenData(product);
      const message = !dataAvailable
        ? `No ingredient or allergen data for ${product.name}; cannot confirm it is free of ${allergen}`
        : result.safe
          ? `${product.name} does not declare ${allergen}`
          : result.found
            ? `WARNING: ${product.name} contains ${allergen}${result.note ? ` (${result.note})` : ''}`
            : `WARNING: ${product.name} may contain traces of ${allergen}`;
      return { product: productRef(product), result, dataAvailable, message, disclaimer: DISCLAIMER };
    },
  );

  registerJsonTool(
    server,
    'checkMultipleAllergens',
    {
      title: 'Check multiple allergens',
      description: 'Check a product against a list of allergens at once.',
      inputSchema: z.object({
        barcode: barcodeInput,
        allergens: z.array(allergenIdInput).min(1).max(15).describe('Allergens to check'),
      }),
      outputSchema: multiCheckOutput,
    },
    async ({ barcode, allergens }) => {
      const product = await productService.requireByBarcode(barcode);
      const result = allergenService.checkMultipleAllergens(product, allergens);
      return {
        product: productRef(product),
        overallSafe: result.safe,
        allergensFound: result.results.filter((r) => !r.safe).map((r) => r.allergen),
        results: result.results,
        dataAvailable: hasAllergenData(product),
        disclaimer: DISCLAIMER,
      };
    },
  );

  registerJsonTool(
    server,
    'checkBig9',
    {
      title: 'Check FDA Big 9 allergens',
      description: 'Check a product against the US FDA "Big 9" major allergens (milk, eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat, soybeans, sesame).',
      inputSchema: z.object({ barcode: barcodeInput }),
      outputSchema: multiCheckOutput,
    },
    async ({ barcode }) => {
      const product = await productService.requireByBarcode(barcode);
      const result = allergenService.checkBig9(product);
      return {
        product: productRef(product),
        overallSafe: result.safe,
        allergensFound: result.results.filter((r) => !r.safe).map((r) => r.allergen),
        results: result.results,
        dataAvailable: hasAllergenData(product),
        disclaimer: DISCLAIMER,
      };
    },
  );

  registerJsonTool(
    server,
    'checkEU14',
    {
      title: 'Check EU 14 allergens',
      description: 'Check a product against the 14 major allergens of EU Regulation 1169/2011.',
      inputSchema: z.object({ barcode: barcodeInput }),
      outputSchema: multiCheckOutput,
    },
    async ({ barcode }) => {
      const product = await productService.requireByBarcode(barcode);
      const result = allergenService.checkEU14(product);
      return {
        product: productRef(product),
        overallSafe: result.safe,
        allergensFound: result.results.filter((r) => !r.safe).map((r) => r.allergen),
        results: result.results,
        dataAvailable: hasAllergenData(product),
        disclaimer: DISCLAIMER,
      };
    },
  );

  registerJsonTool(
    server,
    'getAllAllergens',
    {
      title: 'Get all allergens',
      description: 'List every allergen declared for a product: confirmed, "may contain" and traces.',
      inputSchema: z.object({ barcode: barcodeInput }),
      outputSchema: z.object({
        product: productRefOutput,
        confirmed: z.array(allergenOutput),
        mayContain: z.array(allergenOutput),
        traces: z.array(allergenOutput),
        totalCount: z.number(),
        dataAvailable: z.boolean(),
      }),
    },
    async ({ barcode }) => {
      const product = await productService.requireByBarcode(barcode);
      const allergens = allergenService.getAllAllergens(product);
      return {
        product: productRef(product),
        ...allergens,
        totalCount: allergens.confirmed.length + allergens.mayContain.length + allergens.traces.length,
        dataAvailable: hasAllergenData(product),
      };
    },
  );

  registerJsonTool(
    server,
    'getCrossContaminationRisk',
    {
      title: 'Get cross-contamination risk',
      description: 'Assess cross-contamination risk from trace declarations and "may contain" / shared-facility warnings on the label.',
      inputSchema: z.object({ barcode: barcodeInput }),
      outputSchema: z.object({
        product: productRefOutput,
        risk: z.enum(['low', 'medium', 'high', 'unknown']),
        factors: z.array(z.string()),
        disclaimer: z.string(),
      }),
    },
    async ({ barcode }) => {
      const product = await productService.requireByBarcode(barcode);
      return {
        product: productRef(product),
        ...allergenService.assessCrossContaminationRisk(product),
        disclaimer: DISCLAIMER,
      };
    },
  );

  registerJsonTool(
    server,
    'checkDietCompliance',
    {
      title: 'Check diet compliance',
      description:
        'Check whether a product fits a diet (vegan, vegetarian, pescatarian, keto, paleo, gluten_free, dairy_free, low_sodium, low_sugar, halal, kosher). Returns compliant / not_compliant / uncertain with the evidence used.',
      inputSchema: z.object({
        barcode: barcodeInput,
        diet: dietTypeInput.describe('Diet to check'),
      }),
      outputSchema: z.object({
        product: productRefOutput,
        diet: z.string(),
        compliant: z.boolean(),
        verdict: z.enum(['compliant', 'not_compliant', 'uncertain']),
        violations: z.array(z.string()),
        warnings: z.array(z.string()),
        basis: z.array(z.string()),
        message: z.string(),
      }),
    },
    async ({ barcode, diet }) => {
      const product = await productService.requireByBarcode(barcode);
      const result = allergenService.checkDietCompliance(product, diet);
      const message = result.verdict === 'compliant'
        ? `${product.name} appears compatible with a ${diet} diet`
        : result.verdict === 'not_compliant'
          ? `${product.name} is NOT compatible with a ${diet} diet`
          : `Not enough data to confirm ${product.name} fits a ${diet} diet`;
      return { product: productRef(product), ...result, message };
    },
  );

  registerJsonTool(
    server,
    'getAdditivesInfo',
    {
      title: 'Get additives info',
      description: 'Additives (E-numbers) in a product with names, functions (e.g. emulsifier, preservative) and EFSA over-exposure risk.',
      inputSchema: z.object({ barcode: barcodeInput }),
      outputSchema: z.object({
        product: productRefOutput,
        count: z.number(),
        additives: z.array(z.looseObject({
          code: z.string(),
          name: z.string(),
          riskLevel: z.enum(['low', 'moderate', 'high', 'unknown']),
          classes: z.array(z.string()),
        })),
        highRiskCount: z.number(),
        novaGroup: z.number().optional(),
      }),
    },
    async ({ barcode }) => {
      const product = await productService.requireByBarcode(barcode);
      const additives = await additiveService.describe(product.additives);
      return {
        product: productRef(product),
        count: additives.length,
        additives,
        highRiskCount: additives.filter((a) => a.riskLevel === 'high').length,
        novaGroup: product.novaGroup,
      };
    },
  );
}
