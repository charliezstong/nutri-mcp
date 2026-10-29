import { ResourceTemplate, type McpServer } from '@modelcontextprotocol/server';
import { DAILY_VALUES, BIG_9_ALLERGENS, EU_14_ALLERGENS, TRAFFIC_LIGHTS } from '../config/constants.js';
import { getProductService } from '../services/product.service.js';
import { toJson } from '../tools/shared.js';

const NUTRISCORE_GUIDE = `# Nutri-Score Guide

Nutri-Score rates the nutritional quality of food from **A** (best) to **E** (worst).
Since 2024 Open Food Facts computes the **2023 algorithm** (\`nutriScore.version = "2023"\`).

## How it is calculated (per 100 g / 100 ml)

**Negative points**: energy, sugars, saturated fat, salt
(in the 2023 version, sweeteners also count for beverages).

**Positive points**: fiber, protein, fruits/vegetables/legumes.
Protein only counts when negative points are below a threshold (with exceptions for cheese,
and red meat products have capped protein points).

Final score = negative points − positive points. **Lower is better.**

## Grade thresholds (2023, general foods)

| Grade | Score |
|-------|-------|
| A | ≤ 0 |
| B | 1 – 2 |
| C | 3 – 10 |
| D | 11 – 18 |
| E | ≥ 19 |

Beverages, fats/oils/nuts/seeds, cheese and red meat have their own scales.
Only water can be graded A among beverages.

\`getNutriScore\` returns each component with its points (\`negative\`/\`positive\`).
`;

const GREENSCORE_GUIDE = `# Green-Score Guide (formerly Eco-Score)

The Green-Score estimates the environmental impact of a food product. It was called
Eco-Score until 2025 (renamed for legal reasons); Open Food Facts API v3.1+ exposes it as
\`environmental_score_*\`.

## Grades

**A+** (lowest impact) · A · B · C · D · E · **F** (highest impact)

## How it is computed

1. **Life Cycle Assessment** of the product category (Agribalyse database): climate change,
   water use, land use, biodiversity, eutrophication and other indicators combined into one score.
2. **Bonuses and maluses**:
   - production system (e.g. organic, other labels)
   - origin of ingredients (transport)
   - packaging (materials and recyclability)
   - threatened species (e.g. non-sustainable palm oil, overfished species)

The score is out of 100 before maluses, so it can be negative for very high-impact products.
`;

const NOVA_GUIDE = `# NOVA Food Classification

NOVA classifies foods by their degree of processing.

| Group | Meaning | Examples |
|-------|---------|----------|
| 1 | Unprocessed or minimally processed foods | Fresh fruit and vegetables, eggs, milk, plain yogurt, grains, legumes |
| 2 | Processed culinary ingredients | Oils, butter, sugar, salt, flour, vinegar |
| 3 | Processed foods | Canned vegetables, cheeses, freshly made bread, cured meats |
| 4 | Ultra-processed foods | Soft drinks, packaged snacks, industrial bread, reconstituted meat, instant noodles |

Open Food Facts infers the group from ingredients and additives ("markers" of ultra-processing
such as emulsifiers, flavourings or modified starches).

High consumption of ultra-processed foods (NOVA 4) is associated in observational studies with
higher risks of obesity, cardiovascular disease and type 2 diabetes.
`;

const formatAllergen = (a: string): string => {
  const label = a.replace(/_/g, ' ');
  return `- ${label.charAt(0).toUpperCase()}${label.slice(1)}`;
};

const ALLERGEN_GUIDE = `# Allergen Information Guide

## FDA Big 9 Allergens (USA)
${BIG_9_ALLERGENS.map(formatAllergen).join('\n')}

## EU 14 Major Allergens (Regulation 1169/2011)
${EU_14_ALLERGENS.map(formatAllergen).join('\n')}

Allergen ids used by the tools: gluten, wheat, dairy, eggs, fish, shellfish (crustaceans),
mollusks, tree_nuts, peanuts, soy, celery, mustard, sesame, sulfites, lupin.

Open Food Facts tags wheat-containing products with **gluten**; the tools therefore treat a gluten
declaration as a possible wheat source.

## Label wording

1. **Contains** – present as an ingredient
2. **May contain / traces** – possible cross-contamination
3. **Made in a facility that also processes** – shared equipment

## Hidden allergen names

- **Milk**: casein, caseinate, whey, lactalbumin, lactoglobulin, ghee
- **Eggs**: albumin, lysozyme, mayonnaise, meringue
- **Wheat/Gluten**: seitan, couscous, bulgur, semolina, spelt
- **Soy**: edamame, miso, tempeh, tofu, soy lecithin (E322 may be soy-derived)

Label data can be incomplete; people with severe allergies should always check the package.
`;

const TRAFFIC_LIGHTS_GUIDE = {
  description: 'UK FSA front-of-pack traffic light thresholds for foods, g per 100 g (low <= low; high > high)',
  thresholds: TRAFFIC_LIGHTS,
};

export function registerResources(server: McpServer): void {
  const productService = getProductService();

  const markdown = (name: string, uri: string, title: string, text: string): void => {
    server.registerResource(name, uri, { title, mimeType: 'text/markdown' }, async () => ({
      contents: [{ uri, mimeType: 'text/markdown', text }],
    }));
  };

  markdown('nutriscore-guide', 'nutri://guides/nutriscore', 'Nutri-Score guide', NUTRISCORE_GUIDE);
  markdown('greenscore-guide', 'nutri://guides/greenscore', 'Green-Score guide', GREENSCORE_GUIDE);
  markdown('nova-guide', 'nutri://guides/nova', 'NOVA classification guide', NOVA_GUIDE);
  markdown('allergen-guide', 'nutri://guides/allergens', 'Allergen guide', ALLERGEN_GUIDE);

  server.registerResource(
    'daily-values',
    'nutri://reference/daily-values',
    { title: 'FDA Daily Values', description: 'Daily Values used for %DV (FDA, 2,000 kcal diet)', mimeType: 'application/json' },
    async () => ({
      contents: [{
        uri: 'nutri://reference/daily-values',
        mimeType: 'application/json',
        text: JSON.stringify(DAILY_VALUES, null, 2),
      }],
    }),
  );

  server.registerResource(
    'traffic-lights',
    'nutri://reference/traffic-lights',
    { title: 'Traffic light thresholds', mimeType: 'application/json' },
    async () => ({
      contents: [{
        uri: 'nutri://reference/traffic-lights',
        mimeType: 'application/json',
        text: JSON.stringify(TRAFFIC_LIGHTS_GUIDE, null, 2),
      }],
    }),
  );

  // Normalized product record by barcode (target of the resource links tools return)
  server.registerResource(
    'product',
    new ResourceTemplate('nutri://product/{barcode}', { list: undefined }),
    {
      title: 'Product by barcode',
      description: 'Normalized product record (Open Food Facts + USDA/Nutritionix when configured)',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const raw = variables['barcode'];
      const barcode = String(Array.isArray(raw) ? raw[0] : raw ?? '');
      const product = await productService.requireByBarcode(barcode);
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(toJson(product), null, 2),
        }],
      };
    },
  );
}
