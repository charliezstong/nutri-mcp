# Recipe Tools

Tools for analyzing recipes and meal nutrition.

## analyzeRecipe

Analyze the nutritional content of a recipe.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ingredients` | array | Yes | List of ingredients |
| `servings` | number | No | Number of servings (default: 1) |

### Ingredient Format

Ingredients can be specified by barcode or name:

```json
// By barcode (preferred - more accurate)
{ "barcode": "3017620422003", "grams": 100 }

// By name (uses search)
{ "name": "eggs", "grams": 50 }
{ "name": "chicken breast", "grams": 200 }
```

### Example

```json
{
  "ingredients": [
    { "barcode": "3017620422003", "grams": 30 },
    { "name": "whole wheat bread", "grams": 60 },
    { "name": "banana", "grams": 120 }
  ],
  "servings": 1
}
```

### Response

```json
{
  "success": true,
  "data": {
    "servings": 1,
    "totalNutrition": {
      "calories": 412,
      "protein": 8.2,
      "carbs": 68.4,
      "fat": 12.3,
      "fiber": 5.1,
      "sugar": 31.2
    },
    "perServing": {
      "calories": 412,
      "protein": 8.2,
      "carbs": 68.4,
      "fat": 12.3
    },
    "dailyValues": {
      "calories": 21,
      "protein": 16,
      "fiber": 18
    },
    "ingredientBreakdown": [
      {
        "name": "Nutella",
        "grams": 30,
        "calories": 162,
        "percentOfTotal": 39
      },
      {
        "name": "Whole wheat bread",
        "grams": 60,
        "calories": 138,
        "percentOfTotal": 34
      },
      {
        "name": "Banana",
        "grams": 120,
        "calories": 107,
        "percentOfTotal": 26
      }
    ]
  }
}
```

---

## scaleRecipe

Scale a recipe to different serving sizes.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ingredients` | array | Yes | Original ingredients |
| `originalServings` | number | Yes | Original serving count |
| `targetServings` | number | Yes | Target serving count |

### Example

```json
{
  "ingredients": [
    { "name": "flour", "grams": 500 },
    { "name": "sugar", "grams": 200 },
    { "name": "butter", "grams": 250 },
    { "name": "eggs", "quantity": 4 }
  ],
  "originalServings": 12,
  "targetServings": 6
}
```

### Response

```json
{
  "success": true,
  "data": {
    "scaleFactor": 0.5,
    "originalServings": 12,
    "targetServings": 6,
    "scaledIngredients": [
      { "name": "flour", "originalGrams": 500, "scaledGrams": 250 },
      { "name": "sugar", "originalGrams": 200, "scaledGrams": 100 },
      { "name": "butter", "originalGrams": 250, "scaledGrams": 125 },
      { "name": "eggs", "originalQuantity": 4, "scaledQuantity": 2 }
    ],
    "nutrition": {
      "perServing": {
        "calories": 380,
        "protein": 5.2,
        "carbs": 45.3,
        "fat": 19.8
      }
    }
  }
}
```

---

## suggestSubstitutes

Suggest ingredient substitutions.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ingredient` | string | Yes | Ingredient to replace |
| `reason` | string | No | Reason for substitution |

### Reasons

- `vegan` - Replace animal products
- `healthier` - Lower calories/fat/sugar
- `allergy` - Allergen-free alternative
- `unavailable` - Common substitute

### Example

```json
{
  "ingredient": "butter",
  "reason": "vegan"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "original": {
      "name": "Butter",
      "calories": 717,
      "fat": 81
    },
    "substitutes": [
      {
        "name": "Coconut oil",
        "ratio": "1:1",
        "calories": 862,
        "fat": 100,
        "notes": "Solid at room temperature, works well in baking"
      },
      {
        "name": "Vegan butter",
        "ratio": "1:1",
        "calories": 500,
        "fat": 56,
        "notes": "Direct replacement, similar flavor"
      },
      {
        "name": "Applesauce",
        "ratio": "1:0.5",
        "calories": 52,
        "fat": 0,
        "notes": "Use half the amount, adds moisture and sweetness"
      }
    ]
  }
}
```

---

## getMealNutrition

Analyze the nutrition of a complete meal.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `items` | array | Yes | Meal items |

### Item Format

```json
{
  "barcode": "1234567890123",  // or "name": "grilled chicken"
  "grams": 150,
  "meal": "lunch"  // optional: breakfast, lunch, dinner, snack
}
```

### Example

```json
{
  "items": [
    { "name": "grilled chicken breast", "grams": 150 },
    { "name": "brown rice", "grams": 200 },
    { "name": "steamed broccoli", "grams": 100 },
    { "barcode": "123456789", "grams": 30 }
  ]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "totalNutrition": {
      "calories": 542,
      "protein": 48.3,
      "carbs": 58.2,
      "fat": 8.7,
      "fiber": 6.8,
      "sodium": 312
    },
    "macroSplit": {
      "protein": 36,
      "carbs": 43,
      "fat": 14
    },
    "dailyValuesCovered": {
      "calories": 27,
      "protein": 97,
      "fiber": 24,
      "vitaminC": 135
    },
    "assessment": {
      "rating": "excellent",
      "positives": [
        "High protein content",
        "Good fiber content",
        "Low fat"
      ],
      "suggestions": [
        "Consider adding healthy fats"
      ]
    },
    "itemBreakdown": [
      {
        "name": "Grilled chicken breast",
        "grams": 150,
        "calories": 248,
        "percentOfMeal": 46
      },
      {
        "name": "Brown rice",
        "grams": 200,
        "calories": 222,
        "percentOfMeal": 41
      },
      {
        "name": "Steamed broccoli",
        "grams": 100,
        "calories": 34,
        "percentOfMeal": 6
      }
    ]
  }
}
```
