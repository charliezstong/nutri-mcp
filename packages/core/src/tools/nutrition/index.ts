import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getProductService } from '../../services/product.service.js';
import { getNutritionService } from '../../services/nutrition.service.js';
import { getLogger } from '../../transport/logger.js';
import { formatErrorForMcp, ProductNotFoundError } from '../../errors/index.js';
import {
  analyzeNutritionSchema,
  getNutriScoreSchema,
  getEcoScoreSchema,
  calculateDailyIntakeSchema,
  getMacroBreakdownSchema,
  getNutrientDensitySchema,
  analyzeMealSchema,
} from './schemas.js';

const logger = getLogger().child('nutrition-tools');

export function registerNutritionTools(server: McpServer): void {
  const productService = getProductService();
  const nutritionService = getNutritionService();

  // analyzeNutrition
  server.tool(
    'analyzeNutrition',
    'Get complete nutritional analysis of a product including macros, daily values, concerns and benefits',
    analyzeNutritionSchema.shape,
    async ({ barcode }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const analysis = nutritionService.analyzeProduct(product);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ product: product.name, ...analysis }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // getNutriScore
  server.tool(
    'getNutriScore',
    'Get Nutri-Score grade (A-E) for a product',
    getNutriScoreSchema.shape,
    async ({ barcode }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        if (!product.nutriScore) {
          return {
            content: [{ type: 'text', text: `Nutri-Score not available for ${product.name}` }],
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              nutriScore: product.nutriScore,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // getEcoScore
  server.tool(
    'getEcoScore',
    'Get Eco-Score environmental grade (A-E) for a product',
    getEcoScoreSchema.shape,
    async ({ barcode }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        if (!product.ecoScore) {
          return {
            content: [{ type: 'text', text: `Eco-Score not available for ${product.name}` }],
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              ecoScore: product.ecoScore,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // calculateDailyIntake
  server.tool(
    'calculateDailyIntake',
    'Calculate percentage of daily values for a product based on serving size',
    calculateDailyIntakeSchema.shape,
    async ({ barcode, servings }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const dailyValues = nutritionService.calculateDailyValues(product.nutrients);
        const adjustedNutrients = product.nutrients.map((n) => ({
          ...n,
          adjustedValue: n.value * servings,
          adjustedDV: n.dailyValuePercent ? n.dailyValuePercent * servings : undefined,
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              servings,
              dailyValueSummary: dailyValues,
              nutrients: adjustedNutrients,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // getMacroBreakdown
  server.tool(
    'getMacroBreakdown',
    'Get macronutrient breakdown (protein, carbs, fat) with calories and percentages',
    getMacroBreakdownSchema.shape,
    async ({ barcode }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const macros = nutritionService.calculateMacros(product.nutrients);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              macros,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // getNutrientDensity
  server.tool(
    'getNutrientDensity',
    'Calculate nutrient density score (nutrients per calorie)',
    getNutrientDensitySchema.shape,
    async ({ barcode }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const density = nutritionService.calculateNutrientDensity(product);
        const calories = nutritionService.getCalories(product.nutrients);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              calories,
              nutrientDensityScore: density,
              interpretation: density > 50 ? 'High nutrient density' :
                density > 25 ? 'Moderate nutrient density' : 'Low nutrient density',
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // analyzeMeal
  server.tool(
    'analyzeMeal',
    'Analyze combined nutrition of multiple products in a meal',
    analyzeMealSchema.shape,
    async ({ barcodes }) => {
      try {
        const products = await Promise.all(
          barcodes.map((b) => productService.getByBarcode(b)),
        );

        const foundProducts = products.filter((p) => p !== null);
        if (foundProducts.length === 0) {
          return {
            content: [{ type: 'text', text: 'No products found for the given barcodes' }],
            isError: true,
          };
        }

        // Aggregate nutrients
        const aggregatedNutrients = new Map<string, number>();
        for (const product of foundProducts) {
          for (const n of product.nutrients) {
            const current = aggregatedNutrients.get(n.id) || 0;
            aggregatedNutrients.set(n.id, current + n.value);
          }
        }

        const totalCalories = aggregatedNutrients.get('energy_kcal') || 0;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              products: foundProducts.map((p) => p.name),
              totalCalories,
              aggregatedNutrients: Object.fromEntries(aggregatedNutrients),
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // getNovaGroup
  server.tool(
    'getNovaGroup',
    'Get NOVA food processing classification (1-4) for a product',
    getNutriScoreSchema.shape,
    async ({ barcode }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        const novaDescriptions: Record<number, string> = {
          1: 'Unprocessed or minimally processed foods',
          2: 'Processed culinary ingredients',
          3: 'Processed foods',
          4: 'Ultra-processed food and drink products',
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              novaGroup: product.novaGroup,
              description: product.novaGroup ? novaDescriptions[product.novaGroup] : 'Not available',
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  logger.info('Nutrition tools registered: analyzeNutrition, getNutriScore, getEcoScore, calculateDailyIntake, getMacroBreakdown, getNutrientDensity, analyzeMeal, getNovaGroup');
}
