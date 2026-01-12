# Architecture

Nutri-MCP is a multi-source nutrition data server implementing the Model Context Protocol (MCP). It aggregates data from multiple providers and exposes it through a unified tool interface.

## System Overview

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
```

## Directory Structure

```
nutri-mcp/
├── packages/
│   ├── core/                    # Main MCP server
│   │   ├── src/
│   │   │   ├── config/          # Configuration (Zod validated)
│   │   │   ├── types/           # TypeScript type definitions
│   │   │   ├── providers/       # Data source adapters
│   │   │   ├── services/        # Business logic
│   │   │   ├── tools/           # MCP tool handlers
│   │   │   ├── resources/       # MCP resources
│   │   │   ├── prompts/         # MCP prompts
│   │   │   ├── resilience/      # Fault tolerance
│   │   │   ├── transport/       # stdio and HTTP
│   │   │   ├── utils/           # Utilities
│   │   │   └── errors/          # Error types
│   │   └── tests/               # Unit tests
│   │
│   └── docs/                    # VitePress documentation
│
├── pnpm-workspace.yaml
└── package.json
```

## Data Flow

### Tool Request Flow

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

### Multi-Source Aggregation

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
  getProduct(barcode: string): Promise<Product | null>;
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
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

### Transport Layer

#### stdio Transport

Used by Claude Code and Claude Desktop:

```
┌─────────────┐         ┌─────────────┐
│   Claude    │  stdin  │  Nutri-MCP  │
│    Code     │────────▶│   Server    │
│             │◀────────│             │
└─────────────┘  stdout └─────────────┘
```

All logging goes to stderr to avoid corrupting stdout JSON-RPC messages.

#### HTTP/SSE Transport

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

interface Nutrient {
  id: NutrientId;
  name: string;
  value: number;
  unit: 'g' | 'mg' | 'mcg' | 'kcal' | 'kJ' | 'IU';
  per100g: number;
  dailyValuePercent?: number;
  source?: DataSource;
}

type DataSource = 'openfoodfacts' | 'usda' | 'nutritionix';
```

## Error Handling

```typescript
class NutriMCPError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: unknown
  ) {
    super(message);
  }
}

enum ErrorCode {
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  INVALID_BARCODE = 'INVALID_BARCODE',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
}
```
