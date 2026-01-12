# Tools Reference

Complete reference for all 35 MCP tools organized by category.

## Table of Contents

- [Product Tools (2)](#product-tools)
- [Nutrition Tools (8)](#nutrition-tools)
- [Allergen Tools (8)](#allergen-tools)
- [Comparison Tools (4)](#comparison-tools)
- [Price Tools (6)](#price-tools)
- [Recipe Tools (4)](#recipe-tools)
- [Insights Tools (3)](#insights-tools)

---

## Product Tools

### getProduct

Get detailed product information by barcode.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode (EAN-13, UPC-A, EAN-8) |
| sources | string[] | No | Data sources to query |

**Example:**
```json
{
  "barcode": "3017620422003",
  "sources": ["openfoodfacts", "usda"]
}
```

**Returns:** Complete product object with nutrients, scores, allergens.

---

### searchProducts

Search products by name, brand, or category.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| query | string | Yes | Search term |
| filters.brand | string | No | Filter by brand |
| filters.category | string | No | Filter by category |
| filters.nutriScoreMax | string | No | Maximum Nutri-Score (A-E) |
| filters.novaGroupMax | number | No | Maximum NOVA group (1-4) |
| limit | number | No | Results per page (default: 20) |
| offset | number | No | Pagination offset |

**Example:**
```json
{
  "query": "organic chocolate",
  "filters": {
    "nutriScoreMax": "C"
  },
  "limit": 10
}
```

---

## Nutrition Tools

### analyzeNutrition

Complete nutritional analysis of a product.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |

**Returns:**
- Calorie count
- Macro breakdown (protein, carbs, fat)
- Daily value summary
- Nutritional concerns
- Health benefits

---

### getDailyValues

Calculate daily value percentages.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |
| servings | number | No | Number of servings (default: 1) |

**Returns:** All nutrients with their daily value percentages.

---

### getMacros

Get macronutrient breakdown.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |

**Returns:**
- Protein (grams, calories, percent)
- Carbohydrates (grams, calories, percent)
- Fat (grams, calories, percent)

---

### getNutriScore

Get Nutri-Score grade and breakdown.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |

**Returns:**
- Grade (A-E)
- Numeric score
- Positive points (fiber, protein, fruits/vegetables)
- Negative points (energy, sugars, saturated fat, sodium)

---

### getNovaGroup

Get NOVA food processing classification.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |

**Returns:**
- Group (1-4)
- Group name
- Description
- Processing indicators

---

### getEcoScore

Get environmental impact score.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |

**Returns:**
- Grade (A-E)
- Numeric score
- Environmental impacts

---

### getNutrientDensity

Calculate nutrient density score.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |

**Returns:**
- Density score
- Interpretation (low/medium/high)
- Positive nutrients found

---

### calculateServingNutrition

Calculate nutrition for specific serving size.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |
| servingGrams | number | Yes | Serving size in grams |

**Returns:** All nutrients scaled to serving size.

---

## Allergen Tools

### checkAllergens

Check product for specific allergens.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |
| allergens | string[] | Yes | Allergens to check for |

**Supported Allergens:**
- gluten, wheat, milk, eggs, fish, shellfish
- peanuts, tree_nuts, soy, sesame, celery
- mustard, lupin, molluscs, sulfites

**Returns:**
- safe: boolean
- contains: allergens found
- mayContain: trace warnings
- warnings: human-readable messages

---

### findAllergenFree

Find products without specific allergens.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| query | string | Yes | Search term |
| excludeAllergens | string[] | Yes | Allergens to exclude |
| limit | number | No | Max results |

---

### getAllergenInfo

Get detailed allergen information.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| allergen | string | Yes | Allergen name |

**Returns:**
- Description
- Common sources
- Alternative names
- Cross-reactivity

---

### getDietCompatibility

Check diet restriction compatibility.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |
| diets | string[] | Yes | Diets to check |

**Supported Diets:**
- vegan, vegetarian, pescatarian
- gluten-free, dairy-free, nut-free
- keto, low-carb, low-sodium
- halal, kosher

---

### analyzeIngredients

Parse and analyze ingredient list.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |

**Returns:**
- Parsed ingredients with percentages
- Additives with E-codes
- Concerns and warnings

---

### getAllergenAlternatives

Find allergen-free alternatives.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |
| avoidAllergens | string[] | Yes | Allergens to avoid |

---

### getCrossContamination

Check cross-contamination risks.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |

**Returns:**
- Traces
- Shared facility warnings
- Risk level

---

### validateAllergenClaim

Validate "free-from" claims.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |
| claim | string | Yes | Claim to validate |

---

## Comparison Tools

### compareProducts

Compare multiple products side-by-side.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcodes | string[] | Yes | 2+ product barcodes |

**Returns:**
- Full product data
- Nutrient-by-nutrient comparison
- Score comparison
- Overall winner

---

### findHealthierAlternative

Find healthier alternatives.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Original product |
| category | string | No | Category to search |
| maxResults | number | No | Max alternatives |

**Returns:**
- Original product summary
- Alternatives with improvement reasons

---

### compareNutrientDensity

Compare nutrient density across products.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcodes | string[] | Yes | Products to compare |

---

### rankByNutrient

Rank products by specific nutrient.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcodes | string[] | Yes | Products to rank |
| nutrient | string | Yes | Nutrient ID |
| order | string | No | "ascending" or "descending" |

---

## Price Tools

### getProductPrices

Get prices across retailers.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |

**Returns:**
- Prices by retailer
- Average price
- Lowest price

---

### findBestPrice

Find the best price.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |
| location | string | No | Location filter |

---

### getPriceHistory

Get historical prices.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |
| days | number | No | Days of history |

---

### comparePrices

Compare prices between products.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcodes | string[] | Yes | Products to compare |

---

### getPricePerUnit

Calculate price per unit.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |

---

### findDeals

Find current deals.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| category | string | No | Category filter |
| maxPrice | number | No | Maximum price |

---

## Recipe Tools

### analyzeRecipe

Analyze recipe nutrition.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| ingredients | array | Yes | Ingredient list |
| servings | number | No | Number of servings |

**Ingredient format:**
```json
{ "barcode": "123", "grams": 100 }
// or
{ "name": "eggs", "grams": 50 }
```

---

### scaleRecipe

Scale recipe servings.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| ingredients | array | Yes | Original ingredients |
| originalServings | number | Yes | Original serving count |
| targetServings | number | Yes | Target serving count |

---

### suggestSubstitutes

Suggest ingredient substitutions.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| ingredient | string | Yes | Ingredient to replace |
| reason | string | No | Reason for substitution |

**Reasons:** vegan, healthier, allergy, unavailable

---

### getMealNutrition

Analyze complete meal.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| items | array | Yes | Meal items |

---

## Insights Tools

### getCategoryTrends

Get category nutrition trends.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| category | string | Yes | Food category |
| metric | string | Yes | Nutrient to analyze |

---

### getNutritionInsights

Get AI-powered insights.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| barcode | string | Yes | Product barcode |

---

### getBrandAnalysis

Analyze brand nutrition profile.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| brand | string | Yes | Brand name |
