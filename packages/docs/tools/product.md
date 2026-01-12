# Product Tools

Tools for looking up and searching food products.

## getProduct

Get detailed product information by barcode.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode (EAN-13, UPC-A, EAN-8) |
| `sources` | string[] | No | Data sources to query |

### Example

```json
{
  "barcode": "3017620422003",
  "sources": ["openfoodfacts", "usda"]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "barcode": "3017620422003",
    "name": "Nutella",
    "brand": "Ferrero",
    "categories": ["Spreads", "Breakfast", "Chocolate spreads"],
    "nutrients": [
      {
        "id": "energy",
        "name": "Energy",
        "value": 539,
        "unit": "kcal",
        "per100g": 539,
        "dailyValuePercent": 27
      },
      {
        "id": "fat",
        "name": "Fat",
        "value": 30.9,
        "unit": "g",
        "per100g": 30.9,
        "dailyValuePercent": 48
      }
    ],
    "nutriScore": {
      "grade": "E",
      "score": 26
    },
    "novaGroup": {
      "group": 4,
      "name": "Ultra-processed"
    },
    "allergens": ["milk", "tree_nuts"],
    "ingredients": "Sugar, palm oil, hazelnuts 13%, skimmed milk powder...",
    "servingSize": "15g",
    "sources": ["openfoodfacts", "usda"]
  }
}
```

---

## searchProducts

Search products by name, brand, or category.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search term |
| `filters.brand` | string | No | Filter by brand |
| `filters.category` | string | No | Filter by category |
| `filters.nutriScoreMax` | string | No | Maximum Nutri-Score (A-E) |
| `filters.novaGroupMax` | number | No | Maximum NOVA group (1-4) |
| `limit` | number | No | Results per page (default: 20) |
| `offset` | number | No | Pagination offset |

### Example

```json
{
  "query": "organic chocolate",
  "filters": {
    "nutriScoreMax": "C",
    "brand": "Lindt"
  },
  "limit": 10
}
```

### Response

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "barcode": "3046920028363",
        "name": "Excellence 70% Cocoa",
        "brand": "Lindt",
        "nutriScore": { "grade": "C" },
        "novaGroup": { "group": 4 }
      }
    ],
    "total": 45,
    "page": 1,
    "pageSize": 10
  }
}
```

### Filter Options

#### Nutri-Score Filter

| Value | Description |
|-------|-------------|
| A | Best nutritional quality |
| B | Good nutritional quality |
| C | Average nutritional quality |
| D | Poor nutritional quality |
| E | Worst nutritional quality |

#### NOVA Group Filter

| Value | Description |
|-------|-------------|
| 1 | Unprocessed or minimally processed |
| 2 | Processed culinary ingredients |
| 3 | Processed foods |
| 4 | Ultra-processed foods |
