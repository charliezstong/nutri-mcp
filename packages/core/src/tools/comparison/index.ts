import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getProductService } from '../../services/product.service.js';
import { getComparisonService } from '../../services/comparison.service.js';
import { getLogger } from '../../transport/logger.js';
import { formatErrorForMcp, ProductNotFoundError } from '../../errors/index.js';
import {
  compareProductsSchema,
  findHealthierAlternativeSchema,
  compareNutrientDensitySchema,
  rankByNutrientSchema,
} from './schemas.js';

const logger = getLogger().child('comparison-tools');

export function registerComparisonTools(server: McpServer): void {
  const productService = getProductService();
  const comparisonService = getComparisonService();

  // compareProducts
  server.tool(
    'compareProducts',
    'Compare nutritional profiles of 2-5 products and determine the healthier option',
    compareProductsSchema.shape,
    async ({ barcodes }) => {
      try {
        const products = await Promise.all(
          barcodes.map((b) => productService.getByBarcode(b)),
        );

        const found = products.filter((p) => p !== null);
        if (found.length < 2) {
          return {
            content: [{ type: 'text', text: 'Need at least 2 valid products to compare' }],
            isError: true,
          };
        }

        const comparison = comparisonService.compare(found);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              products: comparison.products.map((p) => ({
                barcode: p.barcode,
                name: p.name,
                nutriScore: p.nutriScore?.grade,
                novaGroup: p.novaGroup,
              })),
              winner: comparison.comparison.winner,
              summary: comparison.comparison.summary,
              scoreComparison: comparison.comparison.scoreComparison,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // findHealthierAlternative
  server.tool(
    'findHealthierAlternative',
    'Find a healthier alternative among provided options',
    findHealthierAlternativeSchema.shape,
    async ({ barcode, alternativeBarcodes }) => {
      try {
        const original = await productService.getByBarcode(barcode);
        if (!original) throw new ProductNotFoundError(barcode);

        const alternatives = await Promise.all(
          alternativeBarcodes.map((b) => productService.getByBarcode(b)),
        );

        const validAlternatives = alternatives.filter((p) => p !== null);
        if (validAlternatives.length === 0) {
          return {
            content: [{ type: 'text', text: 'No valid alternative products found' }],
            isError: true,
          };
        }

        const result = comparisonService.findHealthierAlternative(original, validAlternatives);

        if (!result) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                original: original.name,
                message: 'No healthier alternative found among the provided options',
              }, null, 2),
            }],
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              original: { name: original.name, nutriScore: original.nutriScore?.grade },
              alternative: { name: result.alternative.name, nutriScore: result.alternative.nutriScore?.grade },
              improvements: result.improvements,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // compareNutrientDensity
  server.tool(
    'compareNutrientDensity',
    'Compare nutrient density (nutrients per calorie) between products',
    compareNutrientDensitySchema.shape,
    async ({ barcodes }) => {
      try {
        const products = await Promise.all(
          barcodes.map((b) => productService.getByBarcode(b)),
        );

        const found = products.filter((p) => p !== null);
        if (found.length < 2) {
          return {
            content: [{ type: 'text', text: 'Need at least 2 valid products to compare' }],
            isError: true,
          };
        }

        const result = comparisonService.compareNutrientDensity(found);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              ranking: result.ranking,
              mostNutrientDense: result.best,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // rankByNutrient
  server.tool(
    'rankByNutrient',
    'Rank products by a specific nutrient (e.g., highest protein, lowest sodium)',
    rankByNutrientSchema.shape,
    async ({ barcodes, nutrient, ascending }) => {
      try {
        const products = await Promise.all(
          barcodes.map((b) => productService.getByBarcode(b)),
        );

        const found = products.filter((p) => p !== null);
        if (found.length < 2) {
          return {
            content: [{ type: 'text', text: 'Need at least 2 valid products to rank' }],
            isError: true,
          };
        }

        const ranking = comparisonService.rankByNutrient(found, nutrient, ascending);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              nutrient,
              sortOrder: ascending ? 'lowest first' : 'highest first',
              ranking,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  logger.info('Comparison tools registered: compareProducts, findHealthierAlternative, compareNutrientDensity, rankByNutrient');
}
