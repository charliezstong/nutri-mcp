import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getLogger } from '../transport/logger.js';

const logger = getLogger().child('prompts');

export function registerPrompts(server: McpServer): void {
  // Analyze Product Prompt
  server.prompt(
    'analyze-product',
    'Comprehensive nutritional analysis of a food product',
    {
      barcode: z.string().describe('Product barcode to analyze'),
    },
    async ({ barcode }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Please provide a comprehensive nutritional analysis for the product with barcode ${barcode}.

Include:
1. Basic product information (name, brand, categories)
2. Nutri-Score and what it means
3. Macronutrient breakdown (protein, carbs, fat)
4. Key micronutrients and their daily value percentages
5. Allergen information
6. NOVA processing level
7. Health concerns (if any high nutrients like sodium or sugar)
8. Health benefits (if any good sources of nutrients)
9. Overall recommendation

Use the getProductByBarcode, analyzeNutrition, getNutriScore, checkBig9, and getNovaGroup tools to gather this information.`,
        },
      }],
    }),
  );

  // Compare Products Prompt
  server.prompt(
    'compare-products',
    'Compare nutritional profiles of multiple products',
    {
      barcodes: z.string().describe('Comma-separated list of product barcodes'),
    },
    async ({ barcodes }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Compare the following products nutritionally: ${barcodes}

Please provide:
1. Side-by-side comparison of key nutrients
2. Nutri-Score comparison
3. NOVA group comparison
4. Allergen comparison
5. Price comparison (if available)
6. Clear winner recommendation with reasoning
7. Specific scenarios where each product might be preferred

Use the compareProducts, compareNutrientDensity, and comparePrices tools.`,
        },
      }],
    }),
  );

  // Find Healthy Alternatives Prompt
  server.prompt(
    'find-alternatives',
    'Find healthier alternatives to a product',
    {
      barcode: z.string().describe('Barcode of product to find alternatives for'),
      category: z.string().optional().describe('Category to search in'),
    },
    async ({ barcode, category }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Help me find healthier alternatives to the product with barcode ${barcode}.

${category ? `Focus on products in the ${category} category.` : ''}

Please:
1. First analyze the original product
2. Search for similar products with better Nutri-Score
3. Compare the top alternatives
4. Recommend the best alternative with specific improvements
5. Note any trade-offs (taste, price, availability)

Use searchProducts, analyzeNutrition, and findHealthierAlternative tools.`,
        },
      }],
    }),
  );

  // Allergen Check Prompt
  server.prompt(
    'check-allergens',
    'Comprehensive allergen safety check',
    {
      barcode: z.string().describe('Product barcode'),
      allergens: z.string().describe('Comma-separated list of allergens to check'),
    },
    async ({ barcode, allergens }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Perform a comprehensive allergen safety check for product ${barcode}.

Allergens to check: ${allergens}

Please provide:
1. Product identification
2. Direct allergen presence check
3. Cross-contamination risk assessment
4. "May contain" and trace warnings
5. Ingredient analysis for hidden allergens
6. Clear SAFE or UNSAFE verdict
7. Recommendations for those with severe allergies

Use checkMultipleAllergens, getCrossContaminationRisk, and getAllAllergens tools.`,
        },
      }],
    }),
  );

  // Meal Planning Prompt
  server.prompt(
    'plan-meal',
    'Analyze and plan a nutritionally balanced meal',
    {
      barcodes: z.string().describe('Comma-separated list of product barcodes in the meal'),
    },
    async ({ barcodes }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze this meal plan with products: ${barcodes}

Please provide:
1. Total calorie count
2. Macronutrient distribution (protein/carbs/fat ratio)
3. Micronutrient coverage
4. Missing nutrients
5. Suggestions for completing the meal
6. Estimated cost (if price data available)
7. Overall meal quality score

Use analyzeMeal, calculateMealCost, and analyzeNutrition tools.`,
        },
      }],
    }),
  );

  // Diet Compliance Prompt
  server.prompt(
    'check-diet',
    'Check if products comply with a specific diet',
    {
      barcodes: z.string().describe('Comma-separated list of product barcodes'),
      diet: z.string().describe('Diet type: vegan, vegetarian, keto, gluten_free, dairy_free, low_sodium, low_sugar'),
    },
    async ({ barcodes, diet }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Check if these products are compliant with a ${diet} diet: ${barcodes}

For each product:
1. Identify the product
2. Check diet compliance
3. List any violations
4. Provide alternatives for non-compliant products
5. Give an overall shopping list verdict

Use checkDietCompliance and searchProducts tools.`,
        },
      }],
    }),
  );

  logger.info('Prompts registered: analyze-product, compare-products, find-alternatives, check-allergens, plan-meal, check-diet');
}
