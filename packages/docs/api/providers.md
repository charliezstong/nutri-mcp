# Providers API

Nutri-MCP aggregates data from multiple nutrition data providers.

## Available Providers

| Provider | Products | API Key | Coverage |
|----------|----------|---------|----------|
| Open Food Facts | 3M+ | Not required | Global |
| USDA FoodData Central | 400K+ | Required | US-focused |
| Nutritionix | 900K+ | Required | US-focused |

## Open Food Facts

The primary data source. Provides global coverage with community-contributed data.

### Features

- No API key required
- Nutri-Score and Eco-Score
- NOVA classification
- Ingredient parsing
- Allergen detection
- Images and packaging

### Rate Limits

- 100 requests per minute
- No daily limit

### Example Product Data

```json
{
  "barcode": "3017620422003",
  "name": "Nutella",
  "brand": "Ferrero",
  "categories": ["Spreads", "Breakfast"],
  "nutriScore": { "grade": "E", "score": 26 },
  "novaGroup": { "group": 4 },
  "ecoScore": { "grade": "D" },
  "allergens": ["milk", "tree_nuts"],
  "source": "openfoodfacts"
}
```

## USDA FoodData Central

US Department of Agriculture nutrition database. Provides detailed micronutrient data.

### Features

- Comprehensive nutrient data (150+ nutrients)
- Branded products and generic foods
- Serving size information
- Food composition data

### API Key

Get a free API key at: https://fdc.nal.usda.gov/api-key-signup.html

### Configuration

```bash
# Environment variable
USDA_API_KEY=your-key-here

# Claude Code
claude mcp add nutri-mcp -e USDA_API_KEY=your-key -- npx nutri-mcp
```

### Rate Limits

- 1000 requests per hour
- 10,000 requests per day

### Data Types

| Type | Description |
|------|-------------|
| Branded | Commercial products with UPC |
| Foundation | Generic foods with detailed composition |
| SR Legacy | USDA Standard Reference |
| Survey (FNDDS) | Food survey data |

### Example Response

```json
{
  "fdcId": 454004,
  "description": "Chicken breast, boneless, skinless",
  "dataType": "Foundation",
  "nutrients": [
    { "name": "Protein", "amount": 31, "unit": "g" },
    { "name": "Total lipid (fat)", "amount": 3.6, "unit": "g" },
    { "name": "Carbohydrate", "amount": 0, "unit": "g" },
    { "name": "Energy", "amount": 165, "unit": "kcal" },
    { "name": "Iron", "amount": 0.7, "unit": "mg" },
    { "name": "Vitamin B-12", "amount": 0.3, "unit": "mcg" }
  ]
}
```

## Nutritionix

Commercial nutrition database with restaurant and branded food data.

### Features

- Restaurant menu items
- Branded products
- Natural language food parsing
- Exercise data

### API Keys

Sign up at: https://developer.nutritionix.com/

Requires both:
- `NUTRITIONIX_APP_ID`
- `NUTRITIONIX_APP_KEY`

### Configuration

```bash
# Environment variables
NUTRITIONIX_APP_ID=your-app-id
NUTRITIONIX_APP_KEY=your-app-key

# Claude Code
claude mcp add nutri-mcp \
  -e NUTRITIONIX_APP_ID=your-app-id \
  -e NUTRITIONIX_APP_KEY=your-app-key \
  -- npx nutri-mcp
```

### Rate Limits (Free Tier)

- 50 requests per day
- Higher limits available with paid plans

## Provider Interface

All providers implement the same interface:

```typescript
interface Provider {
  readonly source: DataSource;

  getProduct(barcode: string): Promise<Product | null>;
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
}

type DataSource = 'openfoodfacts' | 'usda' | 'nutritionix';

interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: {
    brand?: string;
    category?: string;
    nutriScoreMax?: string;
    novaGroupMax?: number;
  };
}
```

## Data Aggregation

When multiple providers return data for the same product:

1. **Primary data** from first provider that returns a match
2. **Nutrients merged** from all sources (higher detail preserved)
3. **Allergens combined** from all sources
4. **Scores** preferred from Open Food Facts (Nutri-Score, Eco-Score)
5. **Sources array** lists all contributing providers

```json
{
  "barcode": "123456789",
  "name": "Product Name",
  "nutrients": [
    { "id": "protein", "value": 10, "source": "usda" },
    { "id": "vitamin_b12", "value": 2.4, "source": "usda" },
    { "id": "fiber", "value": 3, "source": "openfoodfacts" }
  ],
  "sources": ["openfoodfacts", "usda"]
}
```

## Error Handling

Provider errors are handled gracefully:

- **Not found**: Returns null, other providers queried
- **Rate limited**: Request queued, retry with backoff
- **Server error**: Circuit breaker opens, fallback to other providers
- **Network error**: Retry with exponential backoff

```typescript
try {
  const product = await provider.getProduct(barcode);
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    // Automatic retry after delay
  } else if (error.code === 'CIRCUIT_OPEN') {
    // Provider temporarily unavailable
  }
}
```
