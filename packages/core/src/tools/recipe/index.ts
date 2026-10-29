import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getProductService } from '../../services/product.service.js';
import { getNutritionService } from '../../services/nutrition.service.js';
import { getPriceService, median, quantityInGramsOrMl } from '../../services/price.service.js';
import { getAllergenService } from '../../services/allergen.service.js';
import { round } from '../../utils/text.js';
import {
  READ_ONLY_LOCAL,
  barcodeInput,
  barcodeListInput,
  currencyInput,
  dietTypeInput,
  productRef,
  productRefOutput,
  registerJsonTool,
} from '../shared.js';

interface Substitute {
  substitute: string;
  ratio: string;
  notes: string;
  suitableFor: ('vegan' | 'dairy_free' | 'egg_free' | 'gluten_free' | 'lower_calorie' | 'lower_sugar')[];
}

// Common ingredient substitutes
const INGREDIENT_SUBSTITUTES: Record<string, Substitute[]> = {
  butter: [
    { substitute: 'coconut oil', ratio: '1:1', notes: 'Good for baking, adds slight coconut flavor', suitableFor: ['vegan', 'dairy_free'] },
    { substitute: 'olive oil', ratio: '3/4 cup per 1 cup butter', notes: 'Better for savory dishes', suitableFor: ['vegan', 'dairy_free'] },
    { substitute: 'unsweetened applesauce', ratio: '1:1 (or half the butter)', notes: 'For baking, reduces fat content', suitableFor: ['vegan', 'dairy_free', 'lower_calorie'] },
  ],
  egg: [
    { substitute: 'flax egg (1 tbsp ground flax + 3 tbsp water)', ratio: '1 per egg', notes: 'Good for binding', suitableFor: ['vegan', 'egg_free'] },
    { substitute: 'chia egg (1 tbsp chia + 3 tbsp water)', ratio: '1 per egg', notes: 'Good for binding', suitableFor: ['vegan', 'egg_free'] },
    { substitute: 'aquafaba (chickpea water)', ratio: '3 tbsp per egg', notes: 'Whips like egg whites', suitableFor: ['vegan', 'egg_free'] },
    { substitute: 'mashed banana', ratio: '1/4 cup per egg', notes: 'Adds sweetness, good for baking', suitableFor: ['vegan', 'egg_free'] },
  ],
  milk: [
    { substitute: 'oat milk', ratio: '1:1', notes: 'Creamy, neutral flavor (check gluten-free label)', suitableFor: ['vegan', 'dairy_free'] },
    { substitute: 'soy milk', ratio: '1:1', notes: 'Closest protein content to cow milk', suitableFor: ['vegan', 'dairy_free', 'gluten_free'] },
    { substitute: 'almond milk', ratio: '1:1', notes: 'Lighter, slightly nutty; contains tree nuts', suitableFor: ['vegan', 'dairy_free', 'gluten_free', 'lower_calorie'] },
  ],
  cream: [
    { substitute: 'coconut cream', ratio: '1:1', notes: 'Rich; adds coconut flavor', suitableFor: ['vegan', 'dairy_free', 'gluten_free'] },
    { substitute: 'blended silken tofu', ratio: '1:1', notes: 'Neutral, lower fat', suitableFor: ['vegan', 'dairy_free', 'gluten_free', 'lower_calorie'] },
    { substitute: 'greek yogurt', ratio: '1:1', notes: 'Tangy, higher protein, lower fat', suitableFor: ['gluten_free', 'lower_calorie'] },
  ],
  cheese: [
    { substitute: 'nutritional yeast', ratio: '2-3 tbsp per 1/4 cup grated cheese', notes: 'Savory, cheesy flavor', suitableFor: ['vegan', 'dairy_free', 'gluten_free'] },
    { substitute: 'cashew cheese', ratio: '1:1', notes: 'Creamy spread; contains tree nuts', suitableFor: ['vegan', 'dairy_free', 'gluten_free'] },
  ],
  flour: [
    { substitute: 'gluten-free flour blend', ratio: '1:1', notes: 'Add xanthan gum if the blend lacks it', suitableFor: ['gluten_free'] },
    { substitute: 'almond flour', ratio: '1:1 (denser)', notes: 'Adds moisture; contains tree nuts', suitableFor: ['gluten_free'] },
    { substitute: 'oat flour', ratio: '1:1', notes: 'Use certified gluten-free oats if needed', suitableFor: ['gluten_free'] },
    { substitute: 'coconut flour', ratio: '1/4 cup per 1 cup flour', notes: 'Very absorbent, needs more liquid', suitableFor: ['gluten_free'] },
  ],
  sugar: [
    { substitute: 'maple syrup', ratio: '3/4 cup per 1 cup sugar', notes: 'Reduce liquid by 3 tbsp', suitableFor: ['vegan'] },
    { substitute: 'honey', ratio: '3/4 cup per 1 cup sugar', notes: 'Reduce liquid by 1/4 cup; not vegan', suitableFor: [] },
    { substitute: 'stevia', ratio: '1 tsp per 1 cup sugar', notes: 'Zero calories, very concentrated', suitableFor: ['vegan', 'lower_calorie', 'lower_sugar'] },
    { substitute: 'erythritol', ratio: '1 1/3 cup per 1 cup sugar', notes: 'Near-zero calories, cooling aftertaste', suitableFor: ['vegan', 'lower_calorie', 'lower_sugar'] },
  ],
  honey: [
    { substitute: 'maple syrup', ratio: '1:1', notes: 'Thinner, distinct flavor', suitableFor: ['vegan'] },
    { substitute: 'agave syrup', ratio: '1:1', notes: 'Sweeter, neutral flavor', suitableFor: ['vegan'] },
  ],
  gelatin: [
    { substitute: 'agar-agar', ratio: '1 tsp powder per 1 tbsp gelatin', notes: 'Sets firmer, must be boiled', suitableFor: ['vegan'] },
  ],
  'soy sauce': [
    { substitute: 'tamari', ratio: '1:1', notes: 'Usually wheat-free (check label)', suitableFor: ['vegan', 'gluten_free'] },
    { substitute: 'coconut aminos', ratio: '1:1', notes: 'Soy-free, sweeter, less salt', suitableFor: ['vegan', 'gluten_free'] },
  ],
  breadcrumbs: [
    { substitute: 'crushed gluten-free crackers', ratio: '1:1', notes: 'Check the label', suitableFor: ['gluten_free'] },
    { substitute: 'rolled oats', ratio: '1:1', notes: 'Use certified gluten-free oats if needed', suitableFor: ['vegan', 'gluten_free'] },
  ],
};

const SUBSTITUTE_ALIASES: Record<string, string> = {
  eggs: 'egg', huevo: 'egg', huevos: 'egg', leche: 'milk', mantequilla: 'butter', azúcar: 'sugar', azucar: 'sugar',
  harina: 'flour', queso: 'cheese', nata: 'cream', crema: 'cream', miel: 'honey', gelatina: 'gelatin',
  'heavy cream': 'cream', 'wheat flour': 'flour', 'all-purpose flour': 'flour', 'bread crumbs': 'breadcrumbs',
};

const RECIPE_IDEAS: { match: RegExp; ideas: string[] }[] = [
  { match: /pasta|noodle|spaghetti/, ideas: ['Pasta aglio e olio', 'Pasta primavera with seasonal vegetables', 'Baked pasta with tomato and lentils'] },
  { match: /rice/, ideas: ['Vegetable fried rice', 'Rice pilaf', 'Stuffed peppers'] },
  { match: /bread|toast/, ideas: ['Bruschetta', 'French toast', 'Panzanella salad'] },
  { match: /cereal|oat|muesli|granola/, ideas: ['Overnight oats', 'Yogurt parfait', 'Homemade granola bars'] },
  { match: /yogurt|yoghurt/, ideas: ['Tzatziki', 'Smoothie bowl', 'Marinade for grilled chicken or tofu'] },
  { match: /cheese/, ideas: ['Vegetable frittata', 'Stuffed mushrooms', 'Whole-grain quesadillas'] },
  { match: /chicken|poultry/, ideas: ['Chicken stir-fry with vegetables', 'Herb-roasted chicken', 'Chicken and bean soup'] },
  { match: /meat|beef|pork/, ideas: ['Slow-cooker stew', 'Chili with beans', 'Stir-fry with vegetables'] },
  { match: /fish|tuna|salmon|seafood/, ideas: ['Niçoise salad', 'Baked fish with lemon and herbs', 'Fish tacos'] },
  { match: /legume|bean|lentil|chickpea/, ideas: ['Hummus', 'Lentil curry', 'Bean and vegetable soup'] },
  { match: /vegetable|salad|tomato/, ideas: ['Roasted vegetable tray bake', 'Minestrone', 'Ratatouille'] },
  { match: /fruit|berr|apple|banana/, ideas: ['Fruit salad', 'Smoothie', 'Baked fruit crumble with oats'] },
  { match: /chocolate|cocoa|spread|biscuit|cookie/, ideas: ['Banana and chocolate oat pancakes (small portion)', 'Chocolate-dipped fruit', 'Energy balls with oats and nuts'] },
  { match: /milk|dairy/, ideas: ['Porridge', 'Rice pudding', 'Smoothie'] },
];

export function registerRecipeTools(server: McpServer): void {
  const productService = getProductService();
  const nutritionService = getNutritionService();
  const priceService = getPriceService();
  const allergenService = getAllergenService();

  registerJsonTool(
    server,
    'suggestRecipes',
    {
      title: 'Suggest recipe ideas',
      description:
        'Recipe ideas that use a product, based on its categories, plus whether the product itself fits the requested diets. Ideas are starting points for the assistant to develop.',
      inputSchema: z.object({
        barcode: barcodeInput.describe('Product to cook with'),
        diets: z.array(dietTypeInput).max(5).optional().describe('Diets the recipe must respect'),
      }),
      outputSchema: z.object({
        product: productRefOutput,
        categories: z.array(z.string()),
        ideas: z.array(z.string()),
        dietCheck: z.array(z.object({ diet: z.string(), verdict: z.string(), violations: z.array(z.string()) })),
        tip: z.string(),
      }),
    },
    async ({ barcode, diets }) => {
      const product = await productService.requireByBarcode(barcode);
      const haystack = [...product.categories, product.name, product.genericName ?? ''].join(' ').toLowerCase();
      const ideas = [...new Set(RECIPE_IDEAS.filter((r) => r.match.test(haystack)).flatMap((r) => r.ideas))].slice(0, 6);

      return {
        product: productRef(product),
        categories: product.categories.slice(0, 5),
        ideas: ideas.length > 0 ? ideas : ['Add to a mixed salad', 'Use in a grain bowl', 'Blend into a smoothie or sauce'],
        dietCheck: (diets ?? []).map((diet) => {
          const r = allergenService.checkDietCompliance(product, diet);
          return { diet, verdict: r.verdict, violations: r.violations };
        }),
        tip: 'Ask for a full recipe for any idea; use substituteIngredient for diet-friendly swaps.',
      };
    },
  );

  registerJsonTool(
    server,
    'substituteIngredient',
    {
      title: 'Substitute ingredient',
      description: 'Common substitutes for an ingredient (butter, egg, milk, cream, cheese, flour, sugar, honey, gelatin, soy sauce, breadcrumbs), filterable by need.',
      inputSchema: z.object({
        ingredient: z.string().trim().min(2).max(50).describe('Ingredient to replace (English or Spanish)'),
        need: z.enum(['vegan', 'dairy_free', 'egg_free', 'gluten_free', 'lower_calorie', 'lower_sugar']).optional()
          .describe('Only return substitutes suitable for this need'),
      }),
      outputSchema: z.object({
        ingredient: z.string(),
        found: z.boolean(),
        substitutes: z.array(z.object({
          substitute: z.string(),
          ratio: z.string(),
          notes: z.string(),
          suitableFor: z.array(z.string()),
        })),
        knownIngredients: z.array(z.string()).optional(),
      }),
      annotations: READ_ONLY_LOCAL,
    },
    async ({ ingredient, need }) => {
      const key = ingredient.toLowerCase();
      const normalized = SUBSTITUTE_ALIASES[key] ?? (INGREDIENT_SUBSTITUTES[key] ? key : key.replace(/s$/, ''));
      const substitutes = INGREDIENT_SUBSTITUTES[normalized];

      if (!substitutes) {
        return { ingredient, found: false, substitutes: [], knownIngredients: Object.keys(INGREDIENT_SUBSTITUTES) };
      }
      return {
        ingredient,
        found: true,
        substitutes: need ? substitutes.filter((s) => s.suitableFor.includes(need)) : substitutes,
      };
    },
  );

  registerJsonTool(
    server,
    'analyzeMealPlan',
    {
      title: 'Analyze meal plan',
      description: 'Calories and macros per meal and for the whole day. Portions in grams per barcode (default 100 g).',
      inputSchema: z.object({
        meals: z.array(z.object({
          name: z.string().trim().min(1).max(50),
          barcodes: barcodeListInput(1, 15),
          grams: z.array(z.number().positive().max(5000)).max(15).optional(),
        })).min(1).max(8).describe('Meals with their product barcodes'),
        targetCalories: z.number().int().min(800).max(6000).default(2000),
      }),
      outputSchema: z.object({
        meals: z.array(z.object({
          name: z.string(),
          products: z.array(z.object({ barcode: z.string(), name: z.string(), grams: z.number(), calories: z.number() })),
          totalCalories: z.number(),
          protein: z.number(),
          carbs: z.number(),
          fat: z.number(),
        })),
        missing: z.array(z.string()),
        totalDailyCalories: z.number(),
        targetCalories: z.number(),
        macroSplit: z.object({ proteinPercent: z.number(), carbsPercent: z.number(), fatPercent: z.number() }),
        recommendation: z.string(),
      }),
    },
    async ({ meals, targetCalories }) => {
      const missing = new Set<string>();
      const analysis = await Promise.all(meals.map(async (meal) => {
        const products = await Promise.all(meal.barcodes.map((b) => productService.getByBarcode(b)));
        const rows: { barcode: string; name: string; grams: number; calories: number }[] = [];
        let protein = 0;
        let carbs = 0;
        let fat = 0;

        products.forEach((p, i) => {
          if (!p) {
            missing.add(meal.barcodes[i]!);
            return;
          }
          const grams = meal.grams?.[i] ?? 100;
          const factor = grams / 100;
          rows.push({ barcode: p.barcode, name: p.name, grams, calories: Math.round(nutritionService.getCalories(p.nutrients) * factor) });
          protein += nutritionService.getNutrientValue(p.nutrients, 'protein') * factor;
          carbs += nutritionService.getNutrientValue(p.nutrients, 'carbohydrates') * factor;
          fat += nutritionService.getNutrientValue(p.nutrients, 'fat') * factor;
        });

        return {
          name: meal.name,
          products: rows,
          totalCalories: rows.reduce((s, r) => s + r.calories, 0),
          protein: round(protein, 1),
          carbs: round(carbs, 1),
          fat: round(fat, 1),
        };
      }));

      const total = analysis.reduce((s, m) => s + m.totalCalories, 0);
      const pK = analysis.reduce((s, m) => s + m.protein * 4, 0);
      const cK = analysis.reduce((s, m) => s + m.carbs * 4, 0);
      const fK = analysis.reduce((s, m) => s + m.fat * 9, 0);
      const macroTotal = pK + cK + fK || 1;
      const ratio = total / targetCalories;

      return {
        meals: analysis,
        missing: [...missing],
        totalDailyCalories: total,
        targetCalories,
        macroSplit: {
          proteinPercent: Math.round((pK / macroTotal) * 100),
          carbsPercent: Math.round((cK / macroTotal) * 100),
          fatPercent: Math.round((fK / macroTotal) * 100),
        },
        recommendation: ratio < 0.85
          ? `About ${Math.round(targetCalories - total)} kcal below the ${targetCalories} kcal target`
          : ratio > 1.15
            ? `About ${Math.round(total - targetCalories)} kcal above the ${targetCalories} kcal target`
            : `Within 15% of the ${targetCalories} kcal target`,
      };
    },
  );

  registerJsonTool(
    server,
    'calculateMealCost',
    {
      title: 'Calculate meal cost',
      description:
        'Estimated cost of a meal from crowdsourced median prices in one currency. With portions in grams, the cost is prorated by package size.',
      inputSchema: z.object({
        barcodes: barcodeListInput(1, 20).describe('Product barcodes in the meal'),
        grams: z.array(z.number().positive().max(10000)).max(20).optional().describe('Portion in grams for each barcode (omit to cost whole packages)'),
        currency: currencyInput.optional(),
      }),
      outputSchema: z.object({
        currency: z.string().nullable(),
        items: z.array(z.object({
          barcode: z.string(),
          name: z.string(),
          packagePrice: z.number().nullable(),
          portionCost: z.number().nullable(),
          priceCount: z.number(),
        })),
        estimatedTotalCost: z.number(),
        itemsWithoutPrices: z.array(z.string()),
        missing: z.array(z.string()),
        note: z.string(),
      }),
    },
    async ({ barcodes, grams, currency }) => {
      const products = await Promise.all(barcodes.map((b) => productService.getByBarcode(b)));
      const missing = barcodes.filter((_, i) => !products[i]);
      const present = products
        .map((p, i) => (p ? { product: p, grams: grams?.[i] } : null))
        .filter((x): x is NonNullable<typeof x> => x !== null);
      const prices = await Promise.all(present.map(({ product }) => priceService.getProductPrices(product.barcode, { currency })));

      // Use the currency with the most observations across the meal
      const counts = new Map<string, number>();
      prices.flat().forEach((p) => counts.set(p.currency, (counts.get(p.currency) ?? 0) + 1));
      const chosen = currency ?? [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      const items = present.map(({ product, grams: portion }, i) => {
        const values = prices[i]!.filter((p) => p.currency === chosen).map((p) => p.price);
        const packagePrice = values.length > 0 ? round(median(values), 2) : null;
        const packageGrams = quantityInGramsOrMl(product.quantity);
        const portionCost = packagePrice === null
          ? null
          : portion && packageGrams
            ? round((packagePrice * portion) / packageGrams, 2)
            : packagePrice;
        return { barcode: product.barcode, name: product.name, packagePrice, portionCost, priceCount: values.length };
      });

      return {
        currency: chosen,
        items,
        estimatedTotalCost: round(items.reduce((s, i) => s + (i.portionCost ?? 0), 0), 2),
        itemsWithoutPrices: items.filter((i) => i.portionCost === null).map((i) => i.barcode),
        missing,
        note: 'Median of crowdsourced prices (Open Prices); prices in other currencies are ignored.',
      };
    },
  );
}
