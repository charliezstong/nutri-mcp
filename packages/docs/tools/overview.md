# Tools Overview

Nutri-MCP provides 35 MCP tools organized into 7 categories.

## Categories

| Category | Tools | Description |
|----------|-------|-------------|
| [Product](/tools/product) | 2 | Product lookup and search |
| [Nutrition](/tools/nutrition) | 8 | Nutritional analysis and scoring |
| [Allergen](/tools/allergen) | 8 | Allergen detection and alternatives |
| [Comparison](/tools/comparison) | 4 | Product comparison and ranking |
| [Price](/tools/price) | 6 | Pricing and deals |
| [Recipe](/tools/recipe) | 4 | Recipe and meal analysis |
| [Insights](/tools/insights) | 3 | Trends and brand analysis |

## Tool List

### Product Tools

| Tool | Description |
|------|-------------|
| `getProduct` | Get product information by barcode |
| `searchProducts` | Search products by name, brand, or category |

### Nutrition Tools

| Tool | Description |
|------|-------------|
| `analyzeNutrition` | Complete nutritional analysis |
| `getDailyValues` | Calculate daily value percentages |
| `getMacros` | Get macronutrient breakdown |
| `getNutriScore` | Get Nutri-Score grade and breakdown |
| `getNovaGroup` | Get NOVA food processing classification |
| `getEcoScore` | Get environmental impact score |
| `getNutrientDensity` | Calculate nutrient density score |
| `calculateServingNutrition` | Calculate nutrition for serving size |

### Allergen Tools

| Tool | Description |
|------|-------------|
| `checkAllergens` | Check product for specific allergens |
| `findAllergenFree` | Find products without specific allergens |
| `getAllergenInfo` | Get detailed allergen information |
| `getDietCompatibility` | Check diet restriction compatibility |
| `analyzeIngredients` | Parse and analyze ingredient list |
| `getAllergenAlternatives` | Find allergen-free alternatives |
| `getCrossContamination` | Check cross-contamination risks |
| `validateAllergenClaim` | Validate "free-from" claims |

### Comparison Tools

| Tool | Description |
|------|-------------|
| `compareProducts` | Compare multiple products side-by-side |
| `findHealthierAlternative` | Find healthier alternatives |
| `compareNutrientDensity` | Compare nutrient density across products |
| `rankByNutrient` | Rank products by specific nutrient |

### Price Tools

| Tool | Description |
|------|-------------|
| `getProductPrices` | Get prices across retailers |
| `findBestPrice` | Find the best price |
| `getPriceHistory` | Get historical prices |
| `comparePrices` | Compare prices between products |
| `getPricePerUnit` | Calculate price per unit |
| `findDeals` | Find current deals |

### Recipe Tools

| Tool | Description |
|------|-------------|
| `analyzeRecipe` | Analyze recipe nutrition |
| `scaleRecipe` | Scale recipe servings |
| `suggestSubstitutes` | Suggest ingredient substitutions |
| `getMealNutrition` | Analyze complete meal |

### Insights Tools

| Tool | Description |
|------|-------------|
| `getCategoryTrends` | Get category nutrition trends |
| `getNutritionInsights` | Get AI-powered insights |
| `getBrandAnalysis` | Analyze brand nutrition profile |

## Common Parameters

### Barcode Format

All barcode parameters accept:
- EAN-13: 13-digit European Article Number
- UPC-A: 12-digit Universal Product Code
- EAN-8: 8-digit compact barcode
- UPC-E: 6-8 digit compressed UPC

### Sources Parameter

Some tools accept a `sources` parameter to specify which providers to query:

```json
{
  "sources": ["openfoodfacts", "usda", "nutritionix"]
}
```

If omitted, all configured providers are queried.

### Pagination

Search tools support pagination:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Results per page |
| `offset` | number | 0 | Skip N results |

## Response Format

All tools return structured JSON:

```json
{
  "success": true,
  "data": { ... },
  "sources": ["openfoodfacts", "usda"]
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product with barcode 1234567890123 not found"
  }
}
```
