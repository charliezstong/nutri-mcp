# Architecture

## Overview

Nutri-MCP is a multi-source nutrition data server implementing the Model Context Protocol (MCP). It aggregates data from multiple providers and exposes it through a unified tool interface.

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Assistant                             │
│                    (Claude Code / Desktop)                       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ MCP Protocol
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Nutri-MCP Server                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Tools     │  │  Resources  │  │   Prompts   │              │
│  │  (35 total) │  │  (5 guides) │  │ (6 prompts) │              │
│  └──────┬──────┘  └─────────────┘  └─────────────┘              │
│         │                                                        │
│  ┌──────▼──────────────────────────────────────────────────┐    │
│  │                    Services Layer                        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │    │
│  │  │ Product  │ │Nutrition │ │ Allergen │ │   Price  │    │    │
│  │  │ Service  │ │ Service  │ │ Service  │ │  Service │    │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │    │
│  │                    ┌──────────┐                          │    │
│  │                    │Comparison│                          │    │
│  │                    │ Service  │                          │    │
│  │                    └──────────┘                          │    │
│  └──────────────────────────┬───────────────────────────────┘    │
│                             │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐    │
│  │                   Providers Layer                         │    │
│  │  ┌────────────────┐ ┌────────────┐ ┌────────────────┐    │    │
│  │  │ Open Food Facts│ │    USDA    │ │  Nutritionix   │    │    │
│  │  │    Provider    │ │  Provider  │ │   Provider     │    │    │
│  │  └────────────────┘ └────────────┘ └────────────────┘    │    │
│  └──────────────────────────┬───────────────────────────────┘    │
│                             │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐    │
│  │                  Resilience Layer                         │    │
│  │  ┌────────┐ ┌─────────────┐ ┌────────────┐ ┌─────────┐   │    │
│  │  │ Cache  │ │Circuit Break│ │Rate Limiter│ │  Retry  │   │    │
│  │  │ (LRU)  │ │     er      │ │            │ │         │   │    │
│  │  └────────┘ └─────────────┘ └────────────┘ └─────────┘   │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
          ┌─────────────────┐         ┌─────────────────┐
          │  Open Food Facts│         │      USDA       │
          │       API       │         │  FoodData API   │
          └─────────────────┘         └─────────────────┘
                                              │
                                      ┌───────┴───────┐
                                      ▼               ▼
                            ┌─────────────┐   ┌─────────────┐
                            │ Nutritionix │   │   Future    │
                            │     API     │   │  Providers  │
                            └─────────────┘   └─────────────┘
```

## Directory Structure

```
nutri-mcp/
├── src/
│   ├── config/                 # Configuration
│   │   ├── env.ts              # Environment variables (Zod validated)
│   │   ├── constants.ts        # API URLs, daily values, limits
│   │   └── index.ts
│   │
│   ├── types/                  # TypeScript type definitions
│   │   ├── common.types.ts     # Shared types (grades, scores)
│   │   ├── product.types.ts    # Product and comparison types
│   │   ├── nutrition.types.ts  # Nutrient and analysis types
│   │   ├── price.types.ts      # Price and deal types
│   │   └── index.ts
│   │
│   ├── providers/              # Data source adapters
│   │   ├── base.provider.ts    # Abstract base class
│   │   ├── openfoodfacts/
│   │   │   ├── client.ts       # HTTP client
│   │   │   ├── mapper.ts       # Response -> Product mapping
│   │   │   └── index.ts
│   │   ├── usda/
│   │   │   ├── types.ts        # USDA-specific types
│   │   │   ├── client.ts
│   │   │   ├── mapper.ts
│   │   │   └── index.ts
│   │   ├── nutritionix/
│   │   │   ├── types.ts
│   │   │   ├── client.ts
│   │   │   ├── mapper.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── services/               # Business logic
│   │   ├── product.service.ts  # Product retrieval & aggregation
│   │   ├── nutrition.service.ts# Nutrition analysis
│   │   ├── allergen.service.ts # Allergen detection
│   │   ├── comparison.service.ts# Product comparison
│   │   ├── price.service.ts    # Price operations
│   │   └── index.ts
│   │
│   ├── tools/                  # MCP tool handlers
│   │   ├── product/
│   │   │   ├── schemas.ts      # Zod input schemas
│   │   │   └── index.ts        # Tool registration
│   │   ├── nutrition/
│   │   ├── allergen/
│   │   ├── comparison/
│   │   ├── price/
│   │   ├── recipe/
│   │   ├── insights/
│   │   └── index.ts            # All tool registration
│   │
│   ├── resources/              # MCP resources
│   │   └── index.ts            # Guide resources
│   │
│   ├── prompts/                # MCP prompts
│   │   └── index.ts            # Pre-built prompts
│   │
│   ├── resilience/             # Fault tolerance
│   │   ├── cache.ts            # LRU cache with TTL
│   │   ├── circuit-breaker.ts  # Circuit breaker pattern
│   │   ├── rate-limiter.ts     # Per-provider rate limiting
│   │   ├── retry.ts            # Exponential backoff
│   │   └── index.ts
│   │
│   ├── transport/              # Communication
│   │   ├── logger.ts           # Stderr logging (safe for stdio)
│   │   ├── http.ts             # HTTP/SSE transport
│   │   └── index.ts
│   │
│   ├── utils/                  # Utilities
│   │   ├── barcode.ts          # Barcode validation
│   │   ├── sanitize.ts         # Input sanitization
│   │   └── index.ts
│   │
│   ├── errors/                 # Error types
│   │   └── index.ts
│   │
│   ├── server.ts               # MCP server setup
│   └── index.ts                # Entry point
│
├── tests/
│   └── unit/                   # Unit tests
│       ├── barcode.test.ts
│       ├── cache.test.ts
│       ├── circuit-breaker.test.ts
│       └── sanitize.test.ts
│
├── docs/                       # Documentation
├── dist/                       # Compiled output
└── package.json
```

## Data Flow

### 1. Tool Request Flow

```
1. AI Assistant calls tool (e.g., getProduct)
       │
       ▼
2. MCP Server receives JSON-RPC request
       │
       ▼
3. Tool handler validates input with Zod
       │
       ▼
4. Service layer orchestrates business logic
       │
       ▼
5. Provider layer fetches from external APIs
       │
       ├── Check cache first
       ├── Check circuit breaker
       ├── Apply rate limiting
       └── Retry on failure
       │
       ▼
6. Mapper transforms API response to internal type
       │
       ▼
7. Service processes and enriches data
       │
       ▼
8. Tool handler returns formatted response
       │
       ▼
9. MCP Server sends JSON-RPC response
```

### 2. Multi-Source Aggregation

When fetching a product, the system queries multiple sources:

```
getProduct("3017620422003")
       │
       ▼
┌──────────────────────────────────────┐
│         ProductService.get()          │
└──────────────────────────────────────┘
       │
       ├────────────┬────────────┬────────────┐
       ▼            ▼            ▼            │
   ┌───────┐   ┌───────┐   ┌───────┐         │
   │  OFF  │   │ USDA  │   │Nutrix │         │
   └───┬───┘   └───┬───┘   └───┬───┘         │
       │           │           │              │
       ▼           ▼           ▼              │
   Product?    Product?    Product?          │
       │           │           │              │
       └───────────┴───────────┘              │
                   │                          │
                   ▼                          │
           ┌──────────────┐                   │
           │   Merge &    │◀──────────────────┘
           │  Deduplicate │
           └──────────────┘
                   │
                   ▼
           Aggregated Product
```

## Component Details

### Providers

Each provider implements:

```typescript
interface Provider {
  // Get product by barcode
  getProduct(barcode: string): Promise<Product | null>;
  
  // Search products
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  
  // Provider identifier
  readonly source: DataSource;
}
```

### Services

Services encapsulate business logic:

- **ProductService**: Aggregates data from providers
- **NutritionService**: Calculates macros, daily values, concerns
- **AllergenService**: Detects allergens, validates claims
- **ComparisonService**: Compares products, finds alternatives
- **PriceService**: Handles price data and calculations

### Resilience

#### Cache

```typescript
const cache = new LRUCache(1000); // Max 1000 entries

// Auto-evicts least recently used when full
cache.set('product:123', product, 'product');

// Returns null if expired or missing
const cached = cache.get<Product>('product:123');
```

#### Circuit Breaker

```typescript
const breaker = new CircuitBreaker('openfoodfacts');

// States: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
await breaker.execute(async () => {
  return await fetchProduct(barcode);
});

// After 5 failures: opens circuit
// After 30s: allows one test request
// On success: closes circuit
```

#### Rate Limiter

```typescript
const limiter = new RateLimiter({
  'openfoodfacts': { requests: 100, window: 60000 },
  'usda': { requests: 1000, window: 3600000 },
});

// Automatically queues if at limit
await limiter.acquire('openfoodfacts');
```

## Transport Layer

### stdio Transport

Used by Claude Code and Claude Desktop:

```
┌─────────────┐         ┌─────────────┐
│   Claude    │  stdin  │  Nutri-MCP  │
│    Code     │────────▶│   Server    │
│             │◀────────│             │
└─────────────┘  stdout └─────────────┘
```

**Important**: All logging goes to stderr to avoid corrupting stdout JSON-RPC messages.

### HTTP/SSE Transport

For web applications:

```
┌─────────────┐         ┌─────────────┐
│     Web     │   HTTP  │  Nutri-MCP  │
│    Client   │────────▶│   Server    │
│             │◀────────│             │
└─────────────┘   SSE   └─────────────┘

Endpoints:
- GET  /           → Server info
- GET  /health     → Health check
- GET  /sse        → SSE connection
- POST /mcp        → JSON-RPC requests
```

## Type System

### Core Types

```typescript
// Product from any source
interface Product {
  barcode: string;
  name: string;
  brand?: string;
  categories: string[];
  nutrients: Nutrient[];
  nutriScore?: NutriScore;
  novaGroup?: NovaGroup;
  ecoScore?: EcoScore;
  allergens: string[];
  sources: DataSource[];
}

// Normalized nutrient
interface Nutrient {
  id: NutrientId;
  name: string;
  value: number;
  unit: 'g' | 'mg' | 'mcg' | 'kcal' | 'kJ' | 'IU';
  per100g: number;
  dailyValuePercent?: number;
  source?: DataSource;
}

// Data sources
type DataSource = 'openfoodfacts' | 'usda' | 'nutritionix';
```

## Error Handling

```typescript
// Custom errors
class NutriMCPError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: unknown
  ) {
    super(message);
  }
}

// Error codes
enum ErrorCode {
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  INVALID_BARCODE = 'INVALID_BARCODE',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
}
```
