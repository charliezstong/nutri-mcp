# Comparison Tools

Tools for comparing products and finding healthier alternatives.

## compareProducts

Compare multiple products side-by-side.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcodes` | string[] | Yes | 2+ product barcodes to compare |

### Example

```json
{
  "barcodes": ["3017620422003", "80135463"]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "barcode": "3017620422003",
        "name": "Nutella",
        "brand": "Ferrero"
      },
      {
        "barcode": "80135463",
        "name": "Peanut Butter",
        "brand": "Skippy"
      }
    ],
    "comparison": {
      "calories": { "3017620422003": 539, "80135463": 588 },
      "protein": { "3017620422003": 6.3, "80135463": 25 },
      "sugar": { "3017620422003": 56.3, "80135463": 9 },
      "fat": { "3017620422003": 30.9, "80135463": 50 }
    },
    "scores": {
      "nutriScore": { "3017620422003": "E", "80135463": "C" },
      "novaGroup": { "3017620422003": 4, "80135463": 3 }
    },
    "winner": {
      "overall": "80135463",
      "reason": "Better Nutri-Score, lower sugar, higher protein"
    }
  }
}
```

---

## findHealthierAlternative

Find healthier alternatives to a product.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Original product barcode |
| `category` | string | No | Category to search within |
| `maxResults` | number | No | Maximum alternatives (default: 5) |

### Example

```json
{
  "barcode": "3017620422003",
  "maxResults": 3
}
```

### Response

```json
{
  "success": true,
  "data": {
    "original": {
      "barcode": "3017620422003",
      "name": "Nutella",
      "nutriScore": "E",
      "calories": 539,
      "sugar": 56.3
    },
    "alternatives": [
      {
        "barcode": "3760020506841",
        "name": "Nocciolata Organic",
        "brand": "Rigoni di Asiago",
        "nutriScore": "D",
        "improvements": [
          "Better Nutri-Score (D vs E)",
          "Lower sugar (47g vs 56g)",
          "Organic ingredients"
        ],
        "tradeoffs": [
          "Similar calorie content"
        ]
      },
      {
        "barcode": "80135463",
        "name": "Natural Peanut Butter",
        "brand": "Skippy",
        "nutriScore": "C",
        "improvements": [
          "Better Nutri-Score (C vs E)",
          "Much lower sugar (9g vs 56g)",
          "Higher protein (25g vs 6g)"
        ],
        "tradeoffs": [
          "Higher fat content",
          "Different flavor profile"
        ]
      }
    ]
  }
}
```

---

## compareNutrientDensity

Compare nutrient density across products.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcodes` | string[] | Yes | Products to compare |

### Example

```json
{
  "barcodes": ["123456789", "987654321", "456789123"]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "rankings": [
      {
        "barcode": "456789123",
        "name": "Greek Yogurt",
        "densityScore": 8.2,
        "caloriesPerNutrient": 12
      },
      {
        "barcode": "987654321",
        "name": "Whole Milk",
        "densityScore": 5.1,
        "caloriesPerNutrient": 25
      },
      {
        "barcode": "123456789",
        "name": "Chocolate Milk",
        "densityScore": 3.4,
        "caloriesPerNutrient": 48
      }
    ],
    "winner": "456789123",
    "explanation": "Greek Yogurt provides the most nutrients per calorie"
  }
}
```

---

## rankByNutrient

Rank products by a specific nutrient.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcodes` | string[] | Yes | Products to rank |
| `nutrient` | string | Yes | Nutrient ID to rank by |
| `order` | string | No | "ascending" or "descending" (default) |

### Nutrient IDs

- `energy`, `protein`, `fat`, `carbs`
- `fiber`, `sugar`, `sodium`, `saturated_fat`
- `calcium`, `iron`, `vitamin_c`, `vitamin_d`

### Example

```json
{
  "barcodes": ["123456789", "987654321", "456789123"],
  "nutrient": "protein",
  "order": "descending"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "nutrient": {
      "id": "protein",
      "name": "Protein",
      "unit": "g"
    },
    "rankings": [
      {
        "rank": 1,
        "barcode": "456789123",
        "name": "Greek Yogurt",
        "value": 10.3
      },
      {
        "rank": 2,
        "barcode": "987654321",
        "name": "Whole Milk",
        "value": 3.4
      },
      {
        "rank": 3,
        "barcode": "123456789",
        "name": "Almond Milk",
        "value": 0.5
      }
    ]
  }
}
```
