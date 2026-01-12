# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha] - 2026-01-12

### Added

#### Core Features
- Multi-source data aggregation from Open Food Facts, USDA FoodData Central, and Nutritionix
- 35 MCP tools across 7 categories (product, nutrition, allergen, comparison, price, recipe, insights)
- Dual transport support: stdio (Claude Code) and HTTP/SSE (web apps)
- Type-safe implementation with TypeScript and Zod validation

#### Product Tools (2)
- `getProduct` - Get detailed product information by barcode
- `searchProducts` - Search products by name, brand, or category

#### Nutrition Tools (8)
- `analyzeNutrition` - Complete nutritional analysis
- `getDailyValues` - Daily value percentage calculations
- `getMacros` - Macronutrient breakdown
- `getNutriScore` - Nutri-Score grade and details
- `getNovaGroup` - NOVA food processing classification
- `getEcoScore` - Environmental impact score
- `getNutrientDensity` - Nutrient density calculation
- `calculateServingNutrition` - Per-serving nutrition

#### Allergen Tools (8)
- `checkAllergens` - Check for specific allergens
- `findAllergenFree` - Find allergen-free products
- `getAllergenInfo` - Detailed allergen information
- `getDietCompatibility` - Diet restriction compatibility
- `analyzeIngredients` - Ingredient analysis
- `getAllergenAlternatives` - Allergen-free alternatives
- `getCrossContamination` - Cross-contamination risks
- `validateAllergenClaim` - Validate "free-from" claims

#### Comparison Tools (4)
- `compareProducts` - Side-by-side product comparison
- `findHealthierAlternative` - Find healthier alternatives
- `compareNutrientDensity` - Nutrient density comparison
- `rankByNutrient` - Rank products by nutrient

#### Price Tools (6)
- `getProductPrices` - Get prices across retailers
- `findBestPrice` - Find the best price
- `getPriceHistory` - Historical price data
- `comparePrices` - Price comparison
- `getPricePerUnit` - Price per unit/weight
- `findDeals` - Current deals and discounts

#### Recipe Tools (4)
- `analyzeRecipe` - Recipe nutrition analysis
- `scaleRecipe` - Scale recipe servings
- `suggestSubstitutes` - Ingredient substitutions
- `getMealNutrition` - Meal nutrition analysis

#### Insights Tools (3)
- `getCategoryTrends` - Category nutrition trends
- `getNutritionInsights` - AI-powered insights
- `getBrandAnalysis` - Brand nutritional profile

#### Resources
- Nutri-Score guide
- NOVA classification guide
- Eco-Score guide
- Allergens guide
- Daily values reference

#### Prompts
- `analyze-product` - Complete product analysis
- `compare-products` - Side-by-side comparison
- `find-alternatives` - Healthier alternatives
- `check-diet` - Diet compatibility
- `meal-planning` - Meal nutrition planning
- `allergen-check` - Allergen safety check

#### Resilience
- LRU cache with configurable TTL
- Circuit breaker pattern
- Rate limiting per provider
- Retry with exponential backoff

#### Developer Experience
- 49 unit tests
- TypeScript strict mode
- Comprehensive documentation
- Zod input validation

### Technical Details
- Node.js 20+ required
- MCP SDK 1.25.1
- TypeScript 5.7
- Vitest for testing
