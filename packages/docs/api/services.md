# Services API

Internal services that implement business logic.

## ProductService

Handles product retrieval and aggregation from multiple providers.

```typescript
class ProductService {
  constructor(providers: Provider[]);

  // Get product by barcode from all providers
  async get(barcode: string): Promise<Product | null>;

  // Get product from specific providers
  async getFromSources(
    barcode: string,
    sources: DataSource[]
  ): Promise<Product | null>;

  // Search across all providers
  async search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult>;
}
```

### Usage

```typescript
const productService = new ProductService(providers);

// Get product
const product = await productService.get('3017620422003');

// Search
const results = await productService.search('chocolate', {
  limit: 10,
  filters: { nutriScoreMax: 'C' }
});
```

## NutritionService

Calculates nutritional analysis, macros, and daily values.

```typescript
class NutritionService {
  // Complete nutritional analysis
  analyze(product: Product): NutritionAnalysis;

  // Get macronutrient breakdown
  getMacros(product: Product): MacroBreakdown;

  // Calculate daily value percentages
  getDailyValues(product: Product, servings?: number): DailyValueResult;

  // Calculate for specific serving size
  calculateForServing(product: Product, grams: number): Nutrient[];

  // Get nutrient density score
  getNutrientDensity(product: Product): NutrientDensityResult;
}
```

### Usage

```typescript
const nutritionService = new NutritionService();

const analysis = nutritionService.analyze(product);
// { calories: 539, macros: {...}, concerns: [...] }

const macros = nutritionService.getMacros(product);
// { protein: { grams: 6.3, calories: 25, percent: 5 }, ... }
```

## AllergenService

Handles allergen detection, dietary compatibility, and alternatives.

```typescript
class AllergenService {
  // Check for specific allergens
  check(product: Product, allergens: string[]): AllergenCheck;

  // Get all allergens in product
  getAllAllergens(product: Product): string[];

  // Check dietary compatibility
  checkDietCompatibility(
    product: Product,
    diets: string[]
  ): DietCompatibility;

  // Parse and analyze ingredients
  analyzeIngredients(product: Product): IngredientAnalysis;

  // Get cross-contamination info
  getCrossContamination(product: Product): CrossContaminationInfo;

  // Validate "free-from" claims
  validateClaim(product: Product, claim: string): ClaimValidation;
}
```

### Supported Allergens

```typescript
const ALLERGENS = [
  'gluten', 'wheat', 'milk', 'eggs', 'fish', 'shellfish',
  'peanuts', 'tree_nuts', 'soy', 'sesame', 'celery',
  'mustard', 'lupin', 'molluscs', 'sulfites'
];
```

### Supported Diets

```typescript
const DIETS = [
  'vegan', 'vegetarian', 'pescatarian',
  'gluten-free', 'dairy-free', 'nut-free',
  'keto', 'low-carb', 'low-sodium',
  'halal', 'kosher'
];
```

## ComparisonService

Compares products and finds alternatives.

```typescript
class ComparisonService {
  constructor(productService: ProductService);

  // Compare multiple products
  async compare(barcodes: string[]): Promise<ProductComparison>;

  // Find healthier alternatives
  async findHealthierAlternatives(
    barcode: string,
    options?: { category?: string; maxResults?: number }
  ): Promise<AlternativeResult>;

  // Compare nutrient density
  async compareNutrientDensity(
    barcodes: string[]
  ): Promise<NutrientDensityComparison>;

  // Rank by specific nutrient
  async rankByNutrient(
    barcodes: string[],
    nutrient: string,
    order?: 'asc' | 'desc'
  ): Promise<NutrientRanking>;
}
```

## PriceService

Handles price data and comparisons.

```typescript
class PriceService {
  // Get prices across retailers
  async getPrices(barcode: string): Promise<PriceComparison>;

  // Find best price
  async findBestPrice(
    barcode: string,
    location?: string
  ): Promise<BestPrice>;

  // Get price history
  async getPriceHistory(
    barcode: string,
    days?: number
  ): Promise<PriceHistory>;

  // Compare prices between products
  async comparePrices(barcodes: string[]): Promise<PriceComparison[]>;

  // Calculate price per unit
  async getPricePerUnit(barcode: string): Promise<PricePerUnit>;

  // Find deals
  async findDeals(filters?: DealFilters): Promise<Deal[]>;
}
```

## RecipeService

Analyzes recipes and meals.

```typescript
class RecipeService {
  constructor(productService: ProductService);

  // Analyze recipe nutrition
  async analyzeRecipe(
    ingredients: RecipeIngredient[],
    servings?: number
  ): Promise<RecipeAnalysis>;

  // Scale recipe
  scaleRecipe(
    ingredients: RecipeIngredient[],
    originalServings: number,
    targetServings: number
  ): ScaledRecipe;

  // Suggest substitutes
  async suggestSubstitutes(
    ingredient: string,
    reason?: SubstitutionReason
  ): Promise<Substitute[]>;

  // Analyze complete meal
  async analyzeMeal(items: MealItem[]): Promise<MealAnalysis>;
}

interface RecipeIngredient {
  barcode?: string;
  name?: string;
  grams: number;
}

type SubstitutionReason = 'vegan' | 'healthier' | 'allergy' | 'unavailable';
```

## InsightsService

Generates nutrition insights and trends.

```typescript
class InsightsService {
  // Get category trends
  async getCategoryTrends(
    category: string,
    metric: string
  ): Promise<CategoryTrends>;

  // Get product insights
  async getProductInsights(barcode: string): Promise<ProductInsights>;

  // Analyze brand
  async analyzeBrand(brand: string): Promise<BrandAnalysis>;
}
```

## Service Initialization

Services are initialized with providers and dependencies:

```typescript
// Create providers
const providers = [
  new OpenFoodFactsProvider(),
  new USDAProvider(),
  new NutritionixProvider(),
];

// Create services
const productService = new ProductService(providers);
const nutritionService = new NutritionService();
const allergenService = new AllergenService();
const comparisonService = new ComparisonService(productService);
const priceService = new PriceService(productService);
const recipeService = new RecipeService(productService);
const insightsService = new InsightsService(productService);
```
