import type { McpServer, ToolAnnotations, ContentBlock } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { formatErrorForMcp } from '../errors/index.js';
import { getLogger } from '../transport/logger.js';
import type { Product } from '../types/product.types.js';

const logger = getLogger().child('tools');

/* ------------------------------------------------------------------------ */
/* Annotations                                                              */
/* ------------------------------------------------------------------------ */

/** Read-only tool that calls external data sources. */
export const READ_ONLY_REMOTE: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

/** Read-only tool computed locally (no network). */
export const READ_ONLY_LOCAL: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

/* ------------------------------------------------------------------------ */
/* Input schemas                                                            */
/* ------------------------------------------------------------------------ */

export const barcodeInput = z
  .string()
  .trim()
  .regex(/^\d{6,14}$/, 'Barcode must be 6-14 digits (EAN-8, EAN-13, UPC-A, GTIN-14)')
  .describe('Product barcode (EAN-8, EAN-13, UPC-A or GTIN-14), e.g. "3017620422003"');

export const barcodeListInput = (min: number, max: number) =>
  z.array(barcodeInput).min(min).max(max);

export const allergenIdInput = z.enum([
  'gluten', 'wheat', 'dairy', 'eggs', 'fish', 'shellfish', 'mollusks', 'tree_nuts',
  'peanuts', 'soy', 'celery', 'mustard', 'sesame', 'sulfites', 'lupin',
]);

export const dietTypeInput = z.enum([
  'vegan', 'vegetarian', 'pescatarian', 'keto', 'paleo',
  'gluten_free', 'dairy_free', 'low_sodium', 'low_sugar',
  'halal', 'kosher',
]);

export const currencyInput = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, 'ISO 4217 currency code, e.g. EUR')
  .transform((c) => c.toUpperCase())
  .describe('ISO 4217 currency code (e.g. EUR, USD, MXN)');

export const countryInput = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, 'ISO 3166-1 alpha-2 country code, e.g. FR')
  .transform((c) => c.toUpperCase())
  .describe('ISO 3166-1 alpha-2 country code of the store (e.g. FR, ES, US)');

/* ------------------------------------------------------------------------ */
/* Output schemas                                                           */
/* ------------------------------------------------------------------------ */

const gradeAE = z.enum(['A', 'B', 'C', 'D', 'E']);

export const nutrientOutput = z.looseObject({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  per100g: z.number().optional(),
  perServing: z.number().optional(),
  dailyValuePercent: z.number().optional(),
  source: z.string(),
});

export const allergenOutput = z.object({
  id: z.string(),
  name: z.string(),
  certainty: z.enum(['confirmed', 'may_contain', 'traces']),
});

export const nutriScoreOutput = z.looseObject({
  grade: gradeAE,
  score: z.number().optional(),
  version: z.enum(['2021', '2023']).optional(),
  positive: z.array(z.looseObject({ id: z.string(), points: z.number() })),
  negative: z.array(z.looseObject({ id: z.string(), points: z.number() })),
});

export const greenScoreOutput = z.object({
  grade: z.enum(['A+', 'A', 'B', 'C', 'D', 'E', 'F']),
  score: z.number().optional(),
});

export const productRefOutput = z.object({
  barcode: z.string(),
  name: z.string(),
});

export const productOutput = z.looseObject({
  barcode: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  categories: z.array(z.string()),
  labels: z.array(z.string()),
  quantity: z.string().optional(),
  nutrients: z.array(nutrientOutput),
  nutriScore: nutriScoreOutput.optional(),
  greenScore: greenScoreOutput.optional(),
  novaGroup: z.number().int().min(1).max(4).optional(),
  ingredientsText: z.string().optional(),
  ingredientsAnalysis: z.looseObject({}).optional(),
  allergens: z.array(allergenOutput),
  traces: z.array(allergenOutput),
  additives: z.array(z.looseObject({ code: z.string(), name: z.string() })),
  countries: z.array(z.string()),
  images: z.looseObject({}).optional(),
  url: z.string().optional(),
  sources: z.array(z.string()),
  lastUpdated: z.string().optional(),
  dataQuality: z.looseObject({ score: z.number(), completeness: z.number() }),
});

export const productSummaryOutput = z.looseObject({
  barcode: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  categories: z.array(z.string()),
  nutriScoreGrade: gradeAE.optional(),
  novaGroup: z.number().optional(),
  quantity: z.string().optional(),
  thumbnail: z.string().optional(),
  sources: z.array(z.string()),
});

export const paginationOutput = z.object({
  page: z.number(),
  pageSize: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const priceOutput = z.looseObject({
  id: z.string(),
  productBarcode: z.string(),
  productName: z.string().optional(),
  price: z.number(),
  currency: z.string(),
  isDiscounted: z.boolean(),
  store: z.looseObject({ name: z.string() }).optional(),
  location: z.looseObject({}).optional(),
  date: z.string(),
  source: z.string(),
});

export const allergenCheckOutput = z.looseObject({
  safe: z.boolean(),
  allergen: z.string(),
  found: allergenOutput.nullable(),
  inTraces: z.boolean(),
  note: z.string().optional(),
});

/* ------------------------------------------------------------------------ */
/* Registration helper                                                      */
/* ------------------------------------------------------------------------ */

export interface JsonToolConfig<I extends z.ZodObject, O extends z.ZodType> {
  title: string;
  description: string;
  inputSchema: I;
  outputSchema: O;
  annotations?: ToolAnnotations;
  _meta?: Record<string, unknown>;
  /** Extra content blocks (e.g. resource links) derived from the result. */
  links?: (output: z.infer<O>) => ContentBlock[];
}

/**
 * Convert a value to plain JSON (Dates to ISO strings, undefined dropped),
 * which is what structuredContent must contain.
 */
export function toJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Register a tool whose handler returns a JSON object. The result is sent
 * both as `structuredContent` (validated against `outputSchema`) and as a
 * JSON text block for clients that do not read structured output.
 * Errors become `isError` results with a readable message.
 */
export function registerJsonTool<I extends z.ZodObject, O extends z.ZodType>(
  server: McpServer,
  name: string,
  config: JsonToolConfig<I, O>,
  // Typed as `object`: domain interfaces lack the index signatures that
  // z.looseObject() infers. The SDK validates the result against outputSchema.
  handler: (args: z.infer<I>) => Promise<object>,
): void {
  const { links, ...toolConfig } = config;

  server.registerTool(
    name,
    {
      ...toolConfig,
      annotations: { title: config.title, ...(config.annotations ?? READ_ONLY_REMOTE) },
    },
    (async (args: z.infer<I>) => {
      try {
        const output = toJson(await handler(args)) as z.infer<O>;
        const content: ContentBlock[] = [{ type: 'text', text: JSON.stringify(output) }];
        if (links) content.push(...links(output));
        return { content, structuredContent: output as Record<string, unknown> };
      } catch (error) {
        logger.warn(`${name} failed`, error);
        return formatErrorForMcp(error);
      }
    }) as never,
  );
}

/**
 * Short product reference used in tool outputs.
 */
export function productRef(product: Product): { barcode: string; name: string } {
  return { barcode: product.barcode, name: product.name };
}

/**
 * resource_link content block pointing at the product resource.
 */
export function productLink(barcode: string, name?: string): ContentBlock {
  return {
    type: 'resource_link',
    uri: `nutri://product/${barcode}`,
    name: name ? `${name} (${barcode})` : `Product ${barcode}`,
    mimeType: 'application/json',
    description: 'Full normalized product record',
  };
}
