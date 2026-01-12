# Data Providers

Detailed information about each data provider integrated into Nutri-MCP.

## Overview

| Provider | Coverage | API Key | Rate Limit | Best For |
|----------|----------|---------|------------|----------|
| Open Food Facts | Global | Not required | 100/min | International products |
| USDA FoodData Central | USA | Free | 1000/hour | US products, detailed nutrients |
| Nutritionix | USA | Free tier | 50/day | Restaurant foods, branded items |

---

## Open Food Facts

### About

Open Food Facts is a collaborative, free and open database of food products from around the world. With over 3 million products, it's the primary data source for Nutri-MCP.

### Coverage

- **Products:** 3+ million
- **Countries:** 200+
- **Languages:** 40+
- **Data:** Nutrition, ingredients, allergens, Nutri-Score, NOVA, Eco-Score

### API Details

| Endpoint | URL |
|----------|-----|
| Base URL | `https://world.openfoodfacts.org` |
| Product | `/api/v2/product/{barcode}.json` |
| Search | `/cgi/search.pl` |

### Rate Limits

- 100 requests per minute
- No API key required
- Be respectful of the free service

### Data Quality

Open Food Facts is crowdsourced, so data quality varies:

- **Completeness:** Variable (some products have minimal data)
- **Accuracy:** Generally good, but can contain errors
- **Updates:** Community-driven, can be outdated

### Example Response

```json
{
  "code": "3017620422003",
  "product": {
    "product_name": "Nutella",
    "brands": "Ferrero",
    "nutriments": {
      "energy-kcal_100g": 539,
      "fat_100g": 30.9,
      "sugars_100g": 56.3,
      "proteins_100g": 6.3
    },
    "nutriscore_grade": "e",
    "nova_group": 4,
    "allergens_tags": ["en:milk", "en:nuts"]
  }
}
```

---

## USDA FoodData Central

### About

FoodData Central is the U.S. Department of Agriculture's food and nutrient database. It provides the most detailed nutrient information available.

### Coverage

- **Products:** 400,000+
- **Countries:** USA focus
- **Data Types:**
  - Foundation Foods (raw ingredients)
  - SR Legacy (historical reference)
  - FNDDS (survey data)
  - Branded Foods (commercial products)

### API Details

| Endpoint | URL |
|----------|-----|
| Base URL | `https://api.nal.usda.gov/fdc/v1` |
| Food Details | `/food/{fdcId}` |
| Search | `/foods/search` |

### API Key

**Required:** Yes (free)

Get your key at: [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup.html)

### Rate Limits

| Tier | Limit |
|------|-------|
| Free | 1,000 requests/hour |

### Data Quality

USDA data is highly reliable:

- **Completeness:** Comprehensive nutrient data
- **Accuracy:** Laboratory-verified values
- **Updates:** Regular government updates

### Nutrient Coverage

USDA provides 150+ nutrients including:

- Macronutrients (protein, fat, carbs)
- Vitamins (A, B1-B12, C, D, E, K)
- Minerals (calcium, iron, magnesium, zinc, etc.)
- Amino acids
- Fatty acids
- Sugars breakdown

### Example Response

```json
{
  "fdcId": 534358,
  "description": "NUTELLA HAZELNUT SPREAD",
  "brandOwner": "Ferrero U.S.A., Inc.",
  "foodNutrients": [
    {
      "nutrientId": 1008,
      "nutrientName": "Energy",
      "value": 539,
      "unitName": "KCAL"
    },
    {
      "nutrientId": 1003,
      "nutrientName": "Protein",
      "value": 6.25,
      "unitName": "G"
    }
  ]
}
```

---

## Nutritionix

### About

Nutritionix is a commercial nutrition database with strong coverage of US restaurant foods and branded items.

### Coverage

- **Products:** 900,000+
- **Countries:** USA focus
- **Specialty:** Restaurant menu items, fast food

### API Details

| Endpoint | URL |
|----------|-----|
| Base URL | `https://trackapi.nutritionix.com/v2` |
| Natural Language | `/natural/nutrients` |
| Search | `/search/instant` |
| Item | `/search/item` |

### API Key

**Required:** Yes

Get your keys at: [developer.nutritionix.com](https://developer.nutritionix.com/)

You need both:
- App ID
- App Key

### Rate Limits

| Tier | Limit | Price |
|------|-------|-------|
| Free | 50 requests/day | Free |
| Basic | 500 requests/day | $9/month |
| Pro | 10,000 requests/day | $99/month |

### Data Quality

- **Completeness:** Good for branded items
- **Accuracy:** Verified by nutrition professionals
- **Updates:** Regular commercial updates

### Special Features

- Natural language parsing ("2 eggs and toast")
- Exercise calorie estimation
- Restaurant menu coverage (McDonald's, Starbucks, etc.)

### Example Response

```json
{
  "foods": [
    {
      "food_name": "nutella",
      "brand_name": "Ferrero",
      "serving_qty": 2,
      "serving_unit": "tbsp",
      "nf_calories": 200,
      "nf_total_fat": 12,
      "nf_sugars": 21,
      "nf_protein": 2
    }
  ]
}
```

---

## Provider Selection Strategy

### How Nutri-MCP Chooses Providers

1. **Primary:** Open Food Facts (always queried first)
2. **Fallback:** USDA (if barcode not found)
3. **Supplement:** Nutritionix (for additional data)

### Aggregation Logic

```
Query: getProduct("3017620422003")

1. Check cache
   └─ Hit? Return cached data

2. Query Open Food Facts
   └─ Found? Use as base product

3. Query USDA (if API key configured)
   └─ Found? Merge nutrient data

4. Query Nutritionix (if API keys configured)
   └─ Found? Supplement missing data

5. Aggregate and deduplicate
   └─ Prefer more complete nutrient data
   └─ Combine allergen lists
   └─ Keep best quality scores

6. Cache result

7. Return merged product
```

### Data Priority

When the same data exists in multiple sources:

| Data Type | Priority |
|-----------|----------|
| Nutrients | USDA > Nutritionix > OFF |
| Allergens | Combine all sources |
| Nutri-Score | OFF only |
| NOVA Group | OFF only |
| Eco-Score | OFF only |
| Prices | OFF only |

---

## Adding a New Provider

### Step 1: Create Provider Directory

```
src/providers/your-provider/
├── types.ts      # Provider-specific types
├── client.ts     # HTTP client
├── mapper.ts     # Response mapping
└── index.ts      # Exports
```

### Step 2: Implement Types

```typescript
// types.ts
export interface YourProviderResponse {
  // API response structure
}

export interface YourProviderConfig {
  apiKey: string;
  baseUrl: string;
}
```

### Step 3: Implement Client

```typescript
// client.ts
export class YourProviderClient {
  constructor(private config: YourProviderConfig) {}

  async getProduct(barcode: string): Promise<YourProviderResponse | null> {
    // Fetch from API
  }

  async search(query: string): Promise<YourProviderResponse[]> {
    // Search API
  }
}
```

### Step 4: Implement Mapper

```typescript
// mapper.ts
export function mapToProduct(response: YourProviderResponse): Product {
  return {
    barcode: response.id,
    name: response.title,
    nutrients: mapNutrients(response.nutrition),
    sources: ['your-provider'],
    // ... map other fields
  };
}
```

### Step 5: Register Provider

```typescript
// src/providers/index.ts
export * from './your-provider/index.js';

// src/services/product.service.ts
// Add to aggregation logic
```
