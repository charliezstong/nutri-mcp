# Changelog

All notable changes to Nutri-MCP are documented here.

## [1.0.0] - 2024-01-15

Initial release.

### Features

#### Multi-Source Data Aggregation
- Open Food Facts integration (3M+ products)
- USDA FoodData Central integration (400K+ products)
- Nutritionix integration (900K+ products)
- Automatic data merging and deduplication

#### 35 MCP Tools

**Product Tools (2)**
- `getProduct` - Get product by barcode
- `searchProducts` - Search products

**Nutrition Tools (8)**
- `analyzeNutrition` - Complete nutritional analysis
- `getDailyValues` - Daily value percentages
- `getMacros` - Macronutrient breakdown
- `getNutriScore` - Nutri-Score grade and breakdown
- `getNovaGroup` - NOVA processing classification
- `getEcoScore` - Environmental impact score
- `getNutrientDensity` - Nutrient density calculation
- `calculateServingNutrition` - Per-serving nutrition

**Allergen Tools (8)**
- `checkAllergens` - Check for specific allergens
- `findAllergenFree` - Find allergen-free products
- `getAllergenInfo` - Allergen information
- `getDietCompatibility` - Diet restriction check
- `analyzeIngredients` - Ingredient parsing
- `getAllergenAlternatives` - Find safe alternatives
- `getCrossContamination` - Cross-contamination risks
- `validateAllergenClaim` - Validate "free-from" claims

**Comparison Tools (4)**
- `compareProducts` - Side-by-side comparison
- `findHealthierAlternative` - Healthier alternatives
- `compareNutrientDensity` - Density comparison
- `rankByNutrient` - Rank by nutrient

**Price Tools (6)**
- `getProductPrices` - Prices across retailers
- `findBestPrice` - Best price finder
- `getPriceHistory` - Historical prices
- `comparePrices` - Price comparison
- `getPricePerUnit` - Price per unit calculation
- `findDeals` - Current deals

**Recipe Tools (4)**
- `analyzeRecipe` - Recipe nutrition analysis
- `scaleRecipe` - Scale recipe servings
- `suggestSubstitutes` - Ingredient substitutions
- `getMealNutrition` - Meal analysis

**Insights Tools (3)**
- `getCategoryTrends` - Category trends
- `getNutritionInsights` - AI-powered insights
- `getBrandAnalysis` - Brand nutrition profile

#### Resilience Layer
- LRU cache with configurable TTL
- Circuit breaker pattern
- Rate limiting per provider
- Retry with exponential backoff

#### Transport Options
- stdio transport for Claude Code and Claude Desktop
- HTTP/SSE transport for web applications

#### Developer Experience
- Full TypeScript support
- Zod schema validation
- Comprehensive documentation
- Unit tests

### Technical Details

- Node.js 20+ required
- MCP SDK 1.0
- TypeScript 5.3
- Zod 3.22

### Known Limitations

- Price data availability varies by region
- Nutritionix free tier limited to 50 requests/day
- Some products may not have complete nutrient data

## Planned Features

### [1.1.0] - Upcoming

- Additional provider integrations
- Barcode scanning helpers
- Meal planning tools
- Export to CSV/JSON

### [1.2.0] - Future

- GraphQL API option
- Webhook notifications
- Custom scoring algorithms
- Multi-language support
