# Insights Tools

Tools for analyzing trends and generating nutrition insights.

## getCategoryTrends

Get nutrition trends for a food category.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `category` | string | Yes | Food category |
| `metric` | string | Yes | Nutrient to analyze |

### Categories

- `beverages`, `snacks`, `cereals`, `dairy`
- `bread`, `frozen`, `canned`, `condiments`
- `chocolate`, `cookies`, `chips`, `yogurt`

### Metrics

- `sugar`, `sodium`, `fat`, `saturated_fat`
- `fiber`, `protein`, `calories`

### Example

```json
{
  "category": "cereals",
  "metric": "sugar"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "category": "cereals",
    "metric": {
      "id": "sugar",
      "name": "Sugar",
      "unit": "g"
    },
    "statistics": {
      "average": 24.3,
      "median": 22.0,
      "min": 0.5,
      "max": 47.0,
      "standardDeviation": 12.1
    },
    "distribution": [
      { "range": "0-10g", "count": 45, "percent": 15 },
      { "range": "10-20g", "count": 89, "percent": 30 },
      { "range": "20-30g", "count": 112, "percent": 37 },
      { "range": "30-40g", "count": 42, "percent": 14 },
      { "range": "40g+", "count": 12, "percent": 4 }
    ],
    "topProducts": [
      { "name": "Frosted Flakes", "value": 37 },
      { "name": "Fruit Loops", "value": 33 },
      { "name": "Lucky Charms", "value": 31 }
    ],
    "bottomProducts": [
      { "name": "Shredded Wheat", "value": 0.5 },
      { "name": "Cheerios Original", "value": 1.3 },
      { "name": "Grape Nuts", "value": 5.0 }
    ]
  }
}
```

---

## getNutritionInsights

Get AI-powered nutrition insights for a product.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |

### Response

```json
{
  "success": true,
  "data": {
    "product": {
      "barcode": "3017620422003",
      "name": "Nutella",
      "brand": "Ferrero"
    },
    "insights": [
      {
        "type": "concern",
        "title": "High Sugar Content",
        "description": "Contains 56.3g of sugar per 100g, which is 113% of daily recommended intake",
        "recommendation": "Limit serving size to 15g (1 tablespoon)"
      },
      {
        "type": "concern",
        "title": "Ultra-Processed",
        "description": "NOVA Group 4 indicates this is an ultra-processed product",
        "recommendation": "Consider whole food alternatives like natural nut butters"
      },
      {
        "type": "neutral",
        "title": "Contains Hazelnuts",
        "description": "Provides 13% hazelnuts which offer some healthy fats",
        "recommendation": null
      },
      {
        "type": "comparison",
        "title": "Category Comparison",
        "description": "Has 30% more sugar than average chocolate spreads",
        "recommendation": "Consider Nocciolata as a lower-sugar alternative"
      }
    ],
    "summary": "Treat as occasional indulgence. High in sugar and classified as ultra-processed. Limit portions to 1 tablespoon.",
    "scoreCard": {
      "nutrition": 2,
      "processing": 1,
      "environmental": 2
    }
  }
}
```

---

## getBrandAnalysis

Analyze a brand's overall nutrition profile.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `brand` | string | Yes | Brand name |

### Example

```json
{
  "brand": "Kellogg's"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "brand": "Kellogg's",
    "productCount": 156,
    "categories": ["Cereals", "Snacks", "Frozen"],
    "nutritionProfile": {
      "averageNutriScore": "C",
      "nutriScoreDistribution": {
        "A": 12,
        "B": 28,
        "C": 45,
        "D": 52,
        "E": 19
      },
      "averageNovaGroup": 3.4,
      "averageSugar": 18.7,
      "averageSodium": 412,
      "averageFiber": 4.2
    },
    "bestProducts": [
      {
        "name": "All-Bran Original",
        "nutriScore": "A",
        "highlights": ["High fiber", "Low sugar"]
      },
      {
        "name": "Special K Protein",
        "nutriScore": "B",
        "highlights": ["High protein", "Moderate sugar"]
      }
    ],
    "worstProducts": [
      {
        "name": "Froot Loops",
        "nutriScore": "D",
        "concerns": ["High sugar", "Ultra-processed"]
      },
      {
        "name": "Frosted Flakes",
        "nutriScore": "D",
        "concerns": ["High sugar", "Low fiber"]
      }
    ],
    "trends": {
      "sugarReduction": "Some products reformulated with less sugar since 2020",
      "fiberIncrease": "New fiber-fortified variants launched"
    },
    "comparison": {
      "vsCategory": "Average sugar 15% higher than category",
      "vsCompetitors": "Similar profile to General Mills, better than Post"
    }
  }
}
```

## Usage Notes

### Data Sources

Insights are generated from:
- Open Food Facts product database
- USDA FoodData Central nutritional data
- Aggregated category statistics
- Scientific nutrition guidelines

### Limitations

- Insights are informational, not medical advice
- Brand analysis depends on product data availability
- Trends require sufficient historical data
- Category comparisons use available products in database
