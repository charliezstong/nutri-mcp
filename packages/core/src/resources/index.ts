import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DAILY_VALUES, BIG_9_ALLERGENS, EU_14_ALLERGENS } from '../config/constants.js';
import { getLogger } from '../transport/logger.js';

const logger = getLogger().child('resources');

const NUTRISCORE_GUIDE = `# Nutri-Score Guide

Nutri-Score is a nutrition label that rates food products from A (healthiest) to E (least healthy).

## Grades

- **A (Dark Green)**: Best nutritional quality
- **B (Light Green)**: Good nutritional quality
- **C (Yellow)**: Average nutritional quality
- **D (Orange)**: Poor nutritional quality
- **E (Red)**: Worst nutritional quality

## How It's Calculated

### Negative Points (0-40)
- Energy (kJ)
- Sugars (g)
- Saturated fatty acids (g)
- Sodium (mg)

### Positive Points (0-15)
- Fruits, vegetables, legumes, nuts (%)
- Fiber (g)
- Protein (g)

Final Score = Negative Points - Positive Points
Lower score = Better grade

## Score Ranges
- A: -15 to -1
- B: 0 to 2
- C: 3 to 10
- D: 11 to 18
- E: 19 to 40
`;

const ECOSCORE_GUIDE = `# Eco-Score Guide

Eco-Score measures the environmental impact of food products from A (lowest impact) to E (highest impact).

## Grades

- **A (Dark Green)**: Very low environmental impact
- **B (Light Green)**: Low environmental impact
- **C (Yellow)**: Moderate environmental impact
- **D (Orange)**: High environmental impact
- **E (Red)**: Very high environmental impact

## Factors Considered

1. **Life Cycle Assessment (LCA)**
   - Carbon footprint
   - Water consumption
   - Land use
   - Eutrophication
   - Biodiversity impact

2. **Bonuses**
   - Organic certification
   - Fair trade labels
   - Recyclable packaging

3. **Penalties**
   - Non-recyclable packaging
   - Endangered species ingredients
   - Long transportation distances
`;

const NOVA_GUIDE = `# NOVA Food Classification

NOVA classifies foods by their degree of processing.

## Groups

### NOVA 1 - Unprocessed or minimally processed foods
- Fresh fruits and vegetables
- Meat, fish, eggs
- Milk
- Grains, legumes, nuts
- Plain yogurt
- Fresh juices

### NOVA 2 - Processed culinary ingredients
- Oils
- Butter
- Sugar
- Salt
- Flour
- Vinegar

### NOVA 3 - Processed foods
- Canned vegetables
- Cheeses
- Freshly made bread
- Cured meats
- Canned fish

### NOVA 4 - Ultra-processed foods
- Soft drinks
- Sweet/savory packaged snacks
- Industrial bread
- Reconstituted meat products
- Pre-prepared frozen dishes
- Instant noodles

## Health Implications

Research suggests limiting NOVA 4 foods may reduce risks of:
- Obesity
- Heart disease
- Type 2 diabetes
- Some cancers
`;

const ALLERGEN_GUIDE = `# Allergen Information Guide

## FDA Big 9 Allergens (USA)
${BIG_9_ALLERGENS.map((a) => `- ${a.replace(/_/g, ' ').charAt(0).toUpperCase() + a.replace(/_/g, ' ').slice(1)}`).join('\n')}

## EU 14 Major Allergens
${EU_14_ALLERGENS.map((a) => `- ${a.replace(/_/g, ' ').charAt(0).toUpperCase() + a.replace(/_/g, ' ').slice(1)}`).join('\n')}

## Label Reading Tips

1. **Contains**: Definitely present
2. **May contain**: Cross-contamination risk
3. **Traces**: Possible trace amounts
4. **Made in a facility that processes**: Shared equipment

## Hidden Allergen Names

### Milk
- Casein, caseinate
- Whey
- Lactalbumin, lactoglobulin
- Ghee

### Eggs
- Albumin
- Lysozyme
- Mayonnaise
- Meringue

### Wheat/Gluten
- Seitan
- Couscous
- Bulgur
- Semolina

### Soy
- Edamame
- Miso
- Tempeh
- Tofu
`;

export function registerResources(server: McpServer): void {
  // Nutri-Score Guide
  server.resource(
    'nutriscore-guide',
    'nutri://guides/nutriscore',
    async () => ({
      contents: [{
        uri: 'nutri://guides/nutriscore',
        mimeType: 'text/markdown',
        text: NUTRISCORE_GUIDE,
      }],
    }),
  );

  // Eco-Score Guide
  server.resource(
    'ecoscore-guide',
    'nutri://guides/ecoscore',
    async () => ({
      contents: [{
        uri: 'nutri://guides/ecoscore',
        mimeType: 'text/markdown',
        text: ECOSCORE_GUIDE,
      }],
    }),
  );

  // NOVA Guide
  server.resource(
    'nova-guide',
    'nutri://guides/nova',
    async () => ({
      contents: [{
        uri: 'nutri://guides/nova',
        mimeType: 'text/markdown',
        text: NOVA_GUIDE,
      }],
    }),
  );

  // Allergen Guide
  server.resource(
    'allergen-guide',
    'nutri://guides/allergens',
    async () => ({
      contents: [{
        uri: 'nutri://guides/allergens',
        mimeType: 'text/markdown',
        text: ALLERGEN_GUIDE,
      }],
    }),
  );

  // Daily Values Reference
  server.resource(
    'daily-values',
    'nutri://reference/daily-values',
    async () => ({
      contents: [{
        uri: 'nutri://reference/daily-values',
        mimeType: 'application/json',
        text: JSON.stringify(DAILY_VALUES, null, 2),
      }],
    }),
  );

  logger.info('Resources registered: nutriscore-guide, ecoscore-guide, nova-guide, allergen-guide, daily-values');
}
