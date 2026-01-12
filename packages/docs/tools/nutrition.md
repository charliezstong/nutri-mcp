# Nutrition Tools

Tools for analyzing nutritional content of products.

## analyzeNutrition

Complete nutritional analysis of a product.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |

### Response

```json
{
  "success": true,
  "data": {
    "calories": 539,
    "macros": {
      "protein": { "grams": 6.3, "calories": 25, "percent": 5 },
      "carbs": { "grams": 57.5, "calories": 230, "percent": 43 },
      "fat": { "grams": 30.9, "calories": 278, "percent": 52 }
    },
    "dailyValues": {
      "fiber": 15,
      "sodium": 4,
      "sugar": 127
    },
    "concerns": ["High in sugar", "High in saturated fat"],
    "benefits": ["Good source of iron"]
  }
}
```

---

## getDailyValues

Calculate daily value percentages for all nutrients.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |
| `servings` | number | No | Number of servings (default: 1) |

### Response

```json
{
  "success": true,
  "data": {
    "servings": 2,
    "nutrients": [
      { "id": "energy", "name": "Energy", "value": 1078, "unit": "kcal", "dailyValuePercent": 54 },
      { "id": "fat", "name": "Fat", "value": 61.8, "unit": "g", "dailyValuePercent": 95 },
      { "id": "fiber", "name": "Fiber", "value": 3, "unit": "g", "dailyValuePercent": 11 }
    ]
  }
}
```

---

## getMacros

Get macronutrient breakdown.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |

### Response

```json
{
  "success": true,
  "data": {
    "protein": {
      "grams": 6.3,
      "calories": 25,
      "percentOfCalories": 5
    },
    "carbohydrates": {
      "grams": 57.5,
      "calories": 230,
      "percentOfCalories": 43,
      "fiber": 1.5,
      "sugar": 56.3
    },
    "fat": {
      "grams": 30.9,
      "calories": 278,
      "percentOfCalories": 52,
      "saturated": 10.6,
      "unsaturated": 20.3
    }
  }
}
```

---

## getNutriScore

Get Nutri-Score grade and breakdown.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |

### Response

```json
{
  "success": true,
  "data": {
    "grade": "E",
    "score": 26,
    "negative": {
      "energy": 6,
      "sugars": 10,
      "saturatedFat": 10,
      "sodium": 0
    },
    "positive": {
      "fiber": 0,
      "protein": 0,
      "fruitsVegetables": 0
    }
  }
}
```

---

## getNovaGroup

Get NOVA food processing classification.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |

### Response

```json
{
  "success": true,
  "data": {
    "group": 4,
    "name": "Ultra-processed food and drink products",
    "description": "Industrial formulations with 5+ ingredients including substances not commonly used in cooking",
    "indicators": [
      "Contains additives",
      "Multiple processing steps",
      "Industrial ingredients"
    ]
  }
}
```

### NOVA Groups

| Group | Name | Description |
|-------|------|-------------|
| 1 | Unprocessed | Fresh fruits, vegetables, eggs, meat |
| 2 | Processed culinary | Oils, butter, sugar, salt |
| 3 | Processed | Canned vegetables, cheese, bread |
| 4 | Ultra-processed | Soft drinks, packaged snacks, instant noodles |

---

## getEcoScore

Get environmental impact score.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |

### Response

```json
{
  "success": true,
  "data": {
    "grade": "D",
    "score": 35,
    "impacts": {
      "carbonFootprint": "High",
      "waterUsage": "Medium",
      "packaging": "Non-recyclable"
    }
  }
}
```

---

## getNutrientDensity

Calculate nutrient density score.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |

### Response

```json
{
  "success": true,
  "data": {
    "score": 2.4,
    "interpretation": "Low",
    "positiveNutrients": ["iron", "calcium"],
    "caloriesPerNutrient": 225
  }
}
```

---

## calculateServingNutrition

Calculate nutrition for a specific serving size.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |
| `servingGrams` | number | Yes | Serving size in grams |

### Response

```json
{
  "success": true,
  "data": {
    "servingGrams": 30,
    "nutrients": [
      { "id": "energy", "name": "Energy", "value": 162, "unit": "kcal" },
      { "id": "fat", "name": "Fat", "value": 9.3, "unit": "g" },
      { "id": "carbs", "name": "Carbohydrates", "value": 17.3, "unit": "g" },
      { "id": "protein", "name": "Protein", "value": 1.9, "unit": "g" }
    ]
  }
}
```
