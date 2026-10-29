import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

const barcode = z.string().describe('Product barcode');
const barcodeList = z.string().describe('Comma-separated product barcodes');

function userPrompt(text: string) {
  return {
    messages: [{
      role: 'user' as const,
      content: { type: 'text' as const, text },
    }],
  };
}

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'analyze-product',
    {
      title: 'Analyze a product',
      description: 'Comprehensive nutritional analysis of a food product',
      argsSchema: z.object({ barcode }),
    },
    ({ barcode }) => userPrompt(`Please provide a comprehensive nutritional analysis for the product with barcode ${barcode}.

Include:
1. Basic product information (name, brand, categories)
2. Nutri-Score and what drives it
3. Macronutrient breakdown (protein, carbs, fat)
4. Key micronutrients and their % Daily Value
5. Allergens
6. NOVA processing level and notable additives
7. Health concerns (high fat, saturated fat, sugars or salt)
8. Health benefits (good sources of nutrients)
9. Overall recommendation

Use the getProductByBarcode, analyzeNutrition, getNutriScore, getAllAllergens, getNovaGroup and getAdditivesInfo tools.`),
  );

  server.registerPrompt(
    'compare-products',
    {
      title: 'Compare products',
      description: 'Compare nutritional profiles and prices of several products',
      argsSchema: z.object({ barcodes: barcodeList }),
    },
    ({ barcodes }) => userPrompt(`Compare the following products nutritionally: ${barcodes}

Please provide:
1. Side-by-side comparison of key nutrients
2. Nutri-Score, Green-Score and NOVA comparison
3. Allergen differences
4. Price comparison and price per kg/L (if available)
5. A clear recommendation with reasoning
6. Situations where each product might be preferred

Use the compareProducts, compareNutrientDensity, checkMultipleAllergens and comparePrices tools.`),
  );

  server.registerPrompt(
    'find-alternatives',
    {
      title: 'Find healthier alternatives',
      description: 'Find healthier alternatives to a product',
      argsSchema: z.object({
        barcode: barcode.describe('Barcode of the product to replace'),
        category: z.string().optional().describe('Category to search in'),
      }),
    },
    ({ barcode, category }) => userPrompt(`Help me find healthier alternatives to the product with barcode ${barcode}.
${category ? `\nFocus on products in the "${category}" category.\n` : ''}
Please:
1. Analyze the original product (analyzeNutrition)
2. Find better options with findHealthierAlternative${category ? ` or searchProducts with category "${category}" and nutriScoreMax` : ''}
3. Compare the best candidates (compareProducts)
4. Recommend the best alternative and explain the improvements
5. Note trade-offs (taste, price, availability)`),
  );

  server.registerPrompt(
    'check-allergens',
    {
      title: 'Allergen safety check',
      description: 'Comprehensive allergen safety check for a product',
      argsSchema: z.object({
        barcode,
        allergens: z.string().describe('Comma-separated allergen ids (e.g. "peanuts,tree_nuts,dairy")'),
      }),
    },
    ({ barcode, allergens }) => userPrompt(`Perform a comprehensive allergen safety check for product ${barcode}.

Allergens to check: ${allergens}

Please provide:
1. Product identification
2. Direct allergen presence check (checkMultipleAllergens)
3. Cross-contamination risk (getCrossContaminationRisk)
4. "May contain" and trace warnings (getAllAllergens)
5. Any recalls related to undeclared allergens (checkRecalls)
6. A clear SAFE / UNSAFE / UNCERTAIN verdict
7. Advice for people with severe allergies (always check the physical label)`),
  );

  server.registerPrompt(
    'plan-meal',
    {
      title: 'Plan a meal',
      description: 'Analyze and plan a nutritionally balanced meal',
      argsSchema: z.object({ barcodes: barcodeList.describe('Comma-separated barcodes of products in the meal') }),
    },
    ({ barcodes }) => userPrompt(`Analyze this meal made with the products: ${barcodes}

Please provide:
1. Total calories (ask me for portion sizes if needed)
2. Macronutrient distribution (protein/carbs/fat)
3. Micronutrient coverage and what is missing
4. Suggestions to complete the meal
5. Estimated cost (if price data is available)
6. Overall meal quality

Use the analyzeMeal, calculateMealCost and analyzeNutrition tools.`),
  );

  server.registerPrompt(
    'check-diet',
    {
      title: 'Check diet compliance',
      description: 'Check whether products fit a specific diet',
      argsSchema: z.object({
        barcodes: barcodeList,
        diet: z.string().describe('vegan, vegetarian, pescatarian, keto, paleo, gluten_free, dairy_free, low_sodium, low_sugar, halal or kosher'),
      }),
    },
    ({ barcodes, diet }) => userPrompt(`Check whether these products fit a ${diet} diet: ${barcodes}

For each product:
1. Identify the product
2. Check diet compliance (checkDietCompliance) and explain the evidence
3. List violations or uncertainties
4. Suggest compliant alternatives (findHealthierAlternative or searchProducts)
5. Give an overall shopping-list verdict`),
  );
}
