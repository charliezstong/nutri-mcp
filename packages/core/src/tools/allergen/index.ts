import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getProductService } from '../../services/product.service.js';
import { getAllergenService } from '../../services/allergen.service.js';
import { getLogger } from '../../transport/logger.js';
import { formatErrorForMcp, ProductNotFoundError } from '../../errors/index.js';
import type { AllergenId, DietType } from '../../types/common.types.js';
import {
  checkAllergenSchema,
  checkMultipleAllergensSchema,
  checkBig9Schema,
  checkEU14Schema,
  getAllAllergensSchema,
  crossContaminationSchema,
  checkDietComplianceSchema,
  getAdditivesInfoSchema,
} from './schemas.js';

const logger = getLogger().child('allergen-tools');

export function registerAllergenTools(server: McpServer): void {
  const productService = getProductService();
  const allergenService = getAllergenService();

  // checkAllergen
  server.tool(
    'checkAllergen',
    'Check if a product contains a specific allergen',
    checkAllergenSchema.shape,
    async ({ barcode, allergen }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const result = allergenService.checkAllergen(product, allergen as AllergenId);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              ...result,
              message: result.safe
                ? `${product.name} appears to be free of ${allergen}`
                : `WARNING: ${product.name} contains ${allergen}`,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // checkMultipleAllergens
  server.tool(
    'checkMultipleAllergens',
    'Check if a product contains any of the specified allergens',
    checkMultipleAllergensSchema.shape,
    async ({ barcode, allergens }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const result = allergenService.checkMultipleAllergens(product, allergens as AllergenId[]);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              overallSafe: result.safe,
              results: result.results,
              message: result.safe
                ? `${product.name} appears safe for your allergen requirements`
                : `WARNING: ${product.name} contains one or more specified allergens`,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // checkBig9
  server.tool(
    'checkBig9',
    'Check product against FDA Big 9 allergens (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soy, sesame)',
    checkBig9Schema.shape,
    async ({ barcode }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const result = allergenService.checkBig9(product);
        const unsafe = result.results.filter((r) => !r.safe);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              overallSafe: result.safe,
              allergensFound: unsafe.map((r) => r.allergen),
              fullResults: result.results,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // checkEU14
  server.tool(
    'checkEU14',
    'Check product against EU 14 major allergens',
    checkEU14Schema.shape,
    async ({ barcode }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const result = allergenService.checkEU14(product);
        const unsafe = result.results.filter((r) => !r.safe);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              overallSafe: result.safe,
              allergensFound: unsafe.map((r) => r.allergen),
              fullResults: result.results,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // getAllAllergens
  server.tool(
    'getAllAllergens',
    'Get all allergens present in a product (confirmed, may contain, traces)',
    getAllAllergensSchema.shape,
    async ({ barcode }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const allergens = allergenService.getAllAllergens(product);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              ...allergens,
              totalCount: allergens.confirmed.length + allergens.mayContain.length + allergens.traces.length,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // getCrossContaminationRisk
  server.tool(
    'getCrossContaminationRisk',
    'Assess cross-contamination risk for a product',
    crossContaminationSchema.shape,
    async ({ barcode }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const risk = allergenService.assessCrossContaminationRisk(product);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              ...risk,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // checkDietCompliance
  server.tool(
    'checkDietCompliance',
    'Check if a product complies with a specific diet (vegan, keto, gluten-free, etc.)',
    checkDietComplianceSchema.shape,
    async ({ barcode, diet }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const result = allergenService.checkDietCompliance(product, diet as DietType);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              ...result,
              message: result.compliant
                ? `${product.name} is compliant with ${diet} diet`
                : `${product.name} is NOT compliant with ${diet} diet`,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // getAdditivesInfo
  server.tool(
    'getAdditivesInfo',
    'Get information about additives (E-numbers) in a product',
    getAdditivesInfoSchema.shape,
    async ({ barcode }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              additives: product.additives,
              count: product.additives.length,
              novaGroup: product.novaGroup,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  logger.info('Allergen tools registered: checkAllergen, checkMultipleAllergens, checkBig9, checkEU14, getAllAllergens, getCrossContaminationRisk, checkDietCompliance, getAdditivesInfo');
}
