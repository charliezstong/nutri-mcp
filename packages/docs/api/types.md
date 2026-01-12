# Types Reference

TypeScript type definitions used throughout Nutri-MCP.

## Core Types

### Product

The main product type returned by getProduct and search tools.

```typescript
interface Product {
  barcode: string;
  name: string;
  brand?: string;
  categories: string[];
  quantity?: string;
  servingSize?: string;
  ingredients?: string;
  nutrients: Nutrient[];
  nutriScore?: NutriScore;
  novaGroup?: NovaGroup;
  ecoScore?: EcoScore;
  allergens: string[];
  traces: string[];
  labels: string[];
  packaging?: string;
  origins?: string;
  stores?: string[];
  countries?: string[];
  imageUrl?: string;
  sources: DataSource[];
}
```

### Nutrient

Individual nutrient information.

```typescript
interface Nutrient {
  id: NutrientId;
  name: string;
  value: number;
  unit: NutrientUnit;
  per100g: number;
  perServing?: number;
  dailyValuePercent?: number;
  source?: DataSource;
}

type NutrientUnit = 'g' | 'mg' | 'mcg' | 'kcal' | 'kJ' | 'IU' | '%';

type NutrientId =
  | 'energy'
  | 'fat'
  | 'saturated_fat'
  | 'trans_fat'
  | 'cholesterol'
  | 'carbs'
  | 'fiber'
  | 'sugar'
  | 'protein'
  | 'sodium'
  | 'calcium'
  | 'iron'
  | 'potassium'
  | 'vitamin_a'
  | 'vitamin_c'
  | 'vitamin_d'
  | 'vitamin_e'
  | 'vitamin_k'
  | 'vitamin_b1'
  | 'vitamin_b2'
  | 'vitamin_b3'
  | 'vitamin_b6'
  | 'vitamin_b12'
  | 'folate'
  | 'magnesium'
  | 'zinc'
  | 'phosphorus';
```

## Score Types

### NutriScore

Nutritional quality score (French system, adopted by EU).

```typescript
interface NutriScore {
  grade: NutriScoreGrade;
  score: number;
  negative?: {
    energy: number;
    sugars: number;
    saturatedFat: number;
    sodium: number;
  };
  positive?: {
    fiber: number;
    protein: number;
    fruitsVegetables: number;
  };
}

type NutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';
```

### NovaGroup

Food processing classification (Brazilian system).

```typescript
interface NovaGroup {
  group: NovaGroupNumber;
  name: string;
  description?: string;
  indicators?: string[];
}

type NovaGroupNumber = 1 | 2 | 3 | 4;
```

| Group | Name | Description |
|-------|------|-------------|
| 1 | Unprocessed | Fresh foods, minimally processed |
| 2 | Processed culinary | Oils, butter, sugar used in cooking |
| 3 | Processed | Canned, preserved, simple processing |
| 4 | Ultra-processed | Industrial formulations, 5+ ingredients |

### EcoScore

Environmental impact score.

```typescript
interface EcoScore {
  grade: EcoScoreGrade;
  score: number;
  impacts?: {
    carbonFootprint?: string;
    waterUsage?: string;
    packaging?: string;
    transportation?: string;
  };
}

type EcoScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';
```

## Search Types

### SearchResult

Paginated search results.

```typescript
interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}
```

### SearchOptions

Search filters and pagination.

```typescript
interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
}

interface SearchFilters {
  brand?: string;
  category?: string;
  country?: string;
  nutriScoreMax?: NutriScoreGrade;
  novaGroupMax?: NovaGroupNumber;
  allergenFree?: string[];
}
```

## Analysis Types

### NutritionAnalysis

Complete nutritional analysis result.

```typescript
interface NutritionAnalysis {
  calories: number;
  macros: MacroBreakdown;
  dailyValues: Record<string, number>;
  concerns: string[];
  benefits: string[];
}

interface MacroBreakdown {
  protein: MacroDetail;
  carbs: MacroDetail;
  fat: MacroDetail;
}

interface MacroDetail {
  grams: number;
  calories: number;
  percentOfCalories: number;
}
```

### AllergenCheck

Allergen check result.

```typescript
interface AllergenCheck {
  safe: boolean;
  contains: string[];
  mayContain: string[];
  warnings: string[];
}
```

### DietCompatibility

Diet compatibility result.

```typescript
interface DietCompatibility {
  compatible: string[];
  incompatible: DietIncompatibility[];
}

interface DietIncompatibility {
  diet: string;
  reason: string;
}
```

## Comparison Types

### ProductComparison

Side-by-side comparison result.

```typescript
interface ProductComparison {
  products: Product[];
  comparison: Record<string, Record<string, number>>;
  scores: {
    nutriScore: Record<string, NutriScoreGrade>;
    novaGroup: Record<string, NovaGroupNumber>;
  };
  winner?: {
    overall: string;
    reason: string;
  };
}
```

## Price Types

### PriceInfo

Product price information.

```typescript
interface PriceInfo {
  retailer: string;
  price: number;
  currency: string;
  inStock?: boolean;
  lastUpdated?: string;
  location?: string;
}

interface PriceComparison {
  barcode: string;
  name: string;
  prices: PriceInfo[];
  average: number;
  lowest: number;
  highest: number;
}
```

## Error Types

### NutriMCPError

Custom error class.

```typescript
class NutriMCPError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'NutriMCPError';
  }
}

enum ErrorCode {
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  INVALID_BARCODE = 'INVALID_BARCODE',
  INVALID_INPUT = 'INVALID_INPUT',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  NETWORK_ERROR = 'NETWORK_ERROR',
}
```

## Data Sources

```typescript
type DataSource = 'openfoodfacts' | 'usda' | 'nutritionix';
```
