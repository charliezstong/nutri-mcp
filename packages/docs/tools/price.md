# Price Tools

Tools for price comparison and finding deals.

## getProductPrices

Get prices for a product across retailers.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |

### Response

```json
{
  "success": true,
  "data": {
    "barcode": "3017620422003",
    "name": "Nutella 400g",
    "prices": [
      {
        "retailer": "Walmart",
        "price": 4.98,
        "currency": "USD",
        "inStock": true,
        "lastUpdated": "2024-01-15"
      },
      {
        "retailer": "Target",
        "price": 5.29,
        "currency": "USD",
        "inStock": true,
        "lastUpdated": "2024-01-15"
      }
    ],
    "average": 5.14,
    "lowest": 4.98,
    "highest": 5.29
  }
}
```

---

## findBestPrice

Find the best price for a product.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |
| `location` | string | No | Location filter (city or zip) |

### Response

```json
{
  "success": true,
  "data": {
    "barcode": "3017620422003",
    "name": "Nutella 400g",
    "bestPrice": {
      "retailer": "Walmart",
      "price": 4.98,
      "currency": "USD",
      "location": "Store #1234",
      "savings": 0.31,
      "savingsPercent": 6
    }
  }
}
```

---

## getPriceHistory

Get historical prices for a product.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |
| `days` | number | No | Days of history (default: 30) |

### Response

```json
{
  "success": true,
  "data": {
    "barcode": "3017620422003",
    "name": "Nutella 400g",
    "history": [
      { "date": "2024-01-01", "price": 5.49 },
      { "date": "2024-01-08", "price": 4.98 },
      { "date": "2024-01-15", "price": 4.98 }
    ],
    "trend": "decreasing",
    "averagePrice": 5.15,
    "lowestPrice": 4.98,
    "highestPrice": 5.49
  }
}
```

---

## comparePrices

Compare prices between multiple products.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcodes` | string[] | Yes | Products to compare |

### Response

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "barcode": "3017620422003",
        "name": "Nutella 400g",
        "lowestPrice": 4.98,
        "pricePerUnit": 12.45
      },
      {
        "barcode": "80135463",
        "name": "Skippy Peanut Butter 462g",
        "lowestPrice": 3.98,
        "pricePerUnit": 8.61
      }
    ],
    "bestValue": {
      "barcode": "80135463",
      "reason": "Lowest price per 100g"
    }
  }
}
```

---

## getPricePerUnit

Calculate price per unit for comparison.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `barcode` | string | Yes | Product barcode |

### Response

```json
{
  "success": true,
  "data": {
    "barcode": "3017620422003",
    "name": "Nutella 400g",
    "price": 4.98,
    "quantity": 400,
    "unit": "g",
    "pricePerUnit": {
      "per100g": 1.25,
      "perKg": 12.45,
      "perOz": 0.35
    }
  }
}
```

---

## findDeals

Find current deals and discounts.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `category` | string | No | Category filter |
| `maxPrice` | number | No | Maximum price filter |

### Response

```json
{
  "success": true,
  "data": {
    "deals": [
      {
        "barcode": "3017620422003",
        "name": "Nutella 750g",
        "brand": "Ferrero",
        "regularPrice": 8.99,
        "salePrice": 5.99,
        "discount": 33,
        "retailer": "Kroger",
        "validUntil": "2024-01-21"
      },
      {
        "barcode": "80135463",
        "name": "Skippy Peanut Butter",
        "brand": "Skippy",
        "regularPrice": 4.99,
        "salePrice": 2.99,
        "discount": 40,
        "retailer": "Target",
        "validUntil": "2024-01-18"
      }
    ],
    "total": 24
  }
}
```

## Data Availability

Price data availability varies by region and retailer. The following sources are used:

- Open Food Facts price contributions
- Retailer APIs (where available)
- Crowdsourced pricing data

Some products may not have price data available.
