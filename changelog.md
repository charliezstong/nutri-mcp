# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-10-29

### Breaking
- Requires `@modelcontextprotocol/server` v2 / zod 4 internally; tool results now carry `structuredContent` with an `outputSchema`, and the text block is compact JSON.
- `getEcoScore` was renamed `getGreenScore`; the product field `ecoScore` is now `greenScore` (grades `A+`..`F`), following Open Food Facts' Eco-Score → Green-Score rename.
- Several outputs changed shape (e.g. `getPriceStats.byCurrency`, `findBestPrice.bestPrices`, `checkDietCompliance.verdict`, `compareProducts.keyNutrients`). See [docs/tools.md](docs/tools.md).
- The HTTP transport is now real Streamable HTTP on `/mcp`; the `/sse` endpoint was removed. HTTP binds to `127.0.0.1` by default.
- Logs go to stderr (and optionally `LOG_FILE`) instead of `./nutri-mcp.log`.

### Added
- Support for both 2025-era clients and the 2026-07-28 stateless protocol (`serveStdio`, `createMcpHandler`).
- Tool annotations (`readOnlyHint`, `openWorldHint`, `idempotentHint`, titles), server icon and instructions.
- MCP Apps view `ui://nutri-mcp/product-view.html` (product card and comparison table) for `getProductByBarcode` and `compareProducts`.
- Resource template `nutri://product/{barcode}`, resource links in product results, Green-Score guide and traffic-light thresholds resources.
- New tools: `checkRecalls` (openFDA food enforcement), `getPriceHistory`, `findDeals`, `estimateNutritionFromText` (when Nutritionix is configured).
- `searchProducts` filters `nutriScoreMax` and `novaMax`; `findHealthierAlternative` can search the product's own category.
- Nutri-Score 2023 points breakdown; additive names, functions and EFSA risk from the OFF taxonomy; UK FSA traffic lights; meal portions in grams; price per kg/L.
- New env vars: `HTTP_HOST`, `ALLOWED_ORIGINS`, `OFF_CONTACT_EMAIL`, `OFF_BASE_URL`, `ENABLE_RECALLS`.
- Packaging: MCP Registry `server.json` (`io.github.charliezstong/nutri-mcp`), `.mcpb` bundle for Claude Desktop, release workflow.
- 200+ fixture-based tests (integration over HTTP in both protocol eras), live API smoke tests, ESLint 9 config, CI with Inspector CLI and MCP conformance scenarios, generated tool reference.

### Fixed
- Sodium, cholesterol, minerals and vitamins from Open Food Facts were 1000× (or 10⁶×) too small because grams were labelled as mg/mcg; %DV, concerns and `low_sodium` checks were wrong as a result.
- The HTTP transport did not execute any MCP request.
- `searchProducts` failed with HTTP 503 on the legacy search endpoint; it now uses search-a-licious with a fallback.
- Multi-source merging was never used; USDA details returned no nutrients (wrong response shape) and barcode matching failed on leading zeros; USDA "µg" values were treated as grams.
- Unknown barcodes and upstream failures were indistinguishable ("Product not found" when the API was down; empty prices on errors).
- "Most recent" prices were the oldest ones, and statistics mixed currencies.
- `getAIQuestions` for a barcode returned questions about other products.
- Wheat was never detected; vegan/vegetarian checks matched "eggplant", "coconut milk" or "peanut butter" and only understood English.
- Comparisons treated more fat as better, let products with missing data win, and gave a Nutri-Score bonus when only one product had a grade.
- `ENABLE_*=false` enabled the feature; Nutri-Score/Eco-Score `unknown` was returned as grade `UNKNOWN`.
- Prompts and documentation referenced tools that did not exist; `pnpm lint` failed (no ESLint 9 config).
- Requests now send the User-Agent Open Food Facts requires and respect its rate limits (15 product reads, 10 searches per minute).

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
