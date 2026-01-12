import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getProductService } from '../../services/product.service.js';
import { getNutritionService } from '../../services/nutrition.service.js';
import { getPriceService } from '../../services/price.service.js';
import { getLogger } from '../../transport/logger.js';
import { formatErrorForMcp, ProductNotFoundError } from '../../errors/index.js';
import {
  suggestRecipesSchema,
  substituteIngredientSchema,
  analyzeMealPlanSchema,
  calculateMealCostSchema,
} from './schemas.js';

const logger = getLogger().child('recipe-tools');

// Common ingredient substitutes
const INGREDIENT_SUBSTITUTES: Record<string, { substitute: string; ratio: string; notes: string }[]> = {
  butter: [
    { substitute: 'coconut oil', ratio: '1:1', notes: 'Good for baking, adds slight coconut flavor' },
    { substitute: 'olive oil', ratio: '3/4 cup per 1 cup butter', notes: 'Better for savory dishes' },
    { substitute: 'applesauce', ratio: '1:1', notes: 'For baking, reduces fat content' },
  ],
  egg: [
    { substitute: 'flax egg (1 tbsp flax + 3 tbsp water)', ratio: '1:1', notes: 'Vegan, good for binding' },
    { substitute: 'chia egg (1 tbsp chia + 3 tbsp water)', ratio: '1:1', notes: 'Vegan, good for binding' },
    { substitute: 'mashed banana', ratio: '1/4 cup per egg', notes: 'Adds sweetness, good for baking' },
  ],
  milk: [
    { substitute: 'oat milk', ratio: '1:1', notes: 'Creamy, neutral flavor' },
    { substitute: 'almond milk', ratio: '1:1', notes: 'Lighter, slightly nutty' },
    { substitute: 'coconut milk', ratio: '1:1', notes: 'Rich, adds coconut flavor' },
  ],
  flour: [
    { substitute: 'almond flour', ratio: '1:1', notes: 'Gluten-free, adds moisture' },
    { substitute: 'oat flour', ratio: '1:1', notes: 'Gluten-free (if certified), denser result' },
    { substitute: 'coconut flour', ratio: '1/4 cup per 1 cup flour', notes: 'Very absorbent, needs more liquid' },
  ],
  sugar: [
    { substitute: 'honey', ratio: '3/4 cup per 1 cup sugar', notes: 'Reduce liquid in recipe by 1/4 cup' },
    { substitute: 'maple syrup', ratio: '3/4 cup per 1 cup sugar', notes: 'Reduce liquid, adds distinct flavor' },
    { substitute: 'stevia', ratio: '1 tsp per 1 cup sugar', notes: 'Zero calories, very concentrated' },
  ],
};

export function registerRecipeTools(server: McpServer): void {
  const productService = getProductService();
  const nutritionService = getNutritionService();
  const priceService = getPriceService();

  // suggestRecipes
  server.tool(
    'suggestRecipes',
    'Get recipe suggestions based on a product',
    suggestRecipesSchema.shape,
    async ({ barcode, dietaryRestrictions }) => {
      try {
        const product = await productService.getByBarcode(barcode);
        if (!product) throw new ProductNotFoundError(barcode);

        // Generate recipe suggestions based on product type
        const categories = product.categories.map((c) => c.toLowerCase());
        const suggestions: string[] = [];

        if (categories.some((c) => c.includes('pasta') || c.includes('noodle'))) {
          suggestions.push(
            'Classic Pasta Aglio e Olio',
            'Creamy Pasta Primavera',
            'Baked Pasta Casserole',
          );
        } else if (categories.some((c) => c.includes('rice'))) {
          suggestions.push(
            'Vegetable Fried Rice',
            'Rice Pilaf',
            'Rice Pudding',
          );
        } else if (categories.some((c) => c.includes('bread'))) {
          suggestions.push(
            'French Toast',
            'Bread Pudding',
            'Bruschetta',
          );
        } else if (categories.some((c) => c.includes('chicken') || c.includes('meat'))) {
          suggestions.push(
            'Stir-fry with vegetables',
            'Grilled with herbs',
            'Slow-cooker stew',
          );
        } else {
          suggestions.push(
            'Add to salad',
            'Use as snack',
            'Incorporate into smoothie',
          );
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              product: product.name,
              categories: product.categories,
              dietaryRestrictions,
              suggestions,
              tip: 'For detailed recipes, ask me to elaborate on any suggestion',
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // substituteIngredient
  server.tool(
    'substituteIngredient',
    'Find substitutes for an ingredient',
    substituteIngredientSchema.shape,
    async ({ ingredient, reason }) => {
      try {
        const normalizedIngredient = ingredient.toLowerCase().trim();
        const substitutes = INGREDIENT_SUBSTITUTES[normalizedIngredient];

        if (!substitutes) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                ingredient,
                message: 'No common substitutes found. Try searching for a more general ingredient term.',
                suggestions: Object.keys(INGREDIENT_SUBSTITUTES),
              }, null, 2),
            }],
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              ingredient,
              reason,
              substitutes,
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // analyzeMealPlan
  server.tool(
    'analyzeMealPlan',
    'Analyze nutrition of a meal plan',
    analyzeMealPlanSchema.shape,
    async ({ meals }) => {
      try {
        const mealAnalysis = await Promise.all(
          meals.map(async (meal) => {
            const products = await Promise.all(
              meal.barcodes.map((b) => productService.getByBarcode(b)),
            );

            const validProducts = products.filter((p) => p !== null);
            const totalCalories = validProducts.reduce((sum, p) => {
              return sum + nutritionService.getCalories(p.nutrients);
            }, 0);

            return {
              name: meal.name,
              products: validProducts.map((p) => p.name),
              totalCalories,
            };
          }),
        );

        const totalDailyCalories = mealAnalysis.reduce((sum, m) => sum + m.totalCalories, 0);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              meals: mealAnalysis,
              totalDailyCalories,
              recommendation: totalDailyCalories < 1500
                ? 'Consider adding more calories for a balanced diet'
                : totalDailyCalories > 2500
                  ? 'Calorie intake is high, consider reducing portions'
                  : 'Calorie intake is within normal range',
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  // calculateMealCost
  server.tool(
    'calculateMealCost',
    'Calculate estimated cost of a meal based on product prices',
    calculateMealCostSchema.shape,
    async ({ barcodes }) => {
      try {
        const products = await Promise.all(
          barcodes.map((b) => productService.getByBarcode(b)),
        );

        const validProducts = products.filter((p) => p !== null);

        const priceInfo = await Promise.all(
          validProducts.map(async (p) => {
            const bestPrice = await priceService.findBestPrice(p.barcode);
            return {
              name: p.name,
              barcode: p.barcode,
              price: bestPrice?.price ?? null,
              currency: bestPrice?.currency ?? null,
            };
          }),
        );

        const withPrices = priceInfo.filter((p) => p.price !== null);
        const totalCost = withPrices.reduce((sum, p) => sum + (p.price ?? 0), 0);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              items: priceInfo,
              itemsWithPrices: withPrices.length,
              itemsWithoutPrices: priceInfo.length - withPrices.length,
              estimatedTotalCost: totalCost,
              currency: withPrices[0]?.currency ?? 'Unknown',
              note: 'Prices are crowdsourced and may vary by location',
            }, null, 2),
          }],
        };
      } catch (error) {
        return formatErrorForMcp(error);
      }
    },
  );

  logger.info('Recipe tools registered: suggestRecipes, substituteIngredient, analyzeMealPlan, calculateMealCost');
}
