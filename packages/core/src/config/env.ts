import { z } from 'zod';

/**
 * Environment variable schema with validation
 */
const envSchema = z.object({
  // Transport
  TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
  HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // API Keys (optional)
  USDA_API_KEY: z.string().optional(),
  NUTRITIONIX_APP_ID: z.string().optional(),
  NUTRITIONIX_APP_KEY: z.string().optional(),

  // Cache
  CACHE_MAX_SIZE: z.coerce.number().int().min(100).max(10000).default(1000),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FILE: z.string().default('./nutri-mcp.log'),

  // Timeouts
  REQUEST_TIMEOUT: z.coerce.number().int().min(1000).max(60000).default(10000),
  CIRCUIT_BREAKER_TIMEOUT: z.coerce.number().int().min(5000).max(120000).default(30000),

  // Feature flags
  ENABLE_USDA: z.coerce.boolean().default(true),
  ENABLE_NUTRITIONIX: z.coerce.boolean().default(false),
  ENABLE_CACHING: z.coerce.boolean().default(true),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 */
export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${errors}`);
  }

  return result.data;
}

/**
 * Singleton environment instance
 */
let envInstance: Env | null = null;

export function getEnv(): Env {
  if (!envInstance) {
    envInstance = loadEnv();
  }
  return envInstance;
}

/**
 * Check if a provider is enabled and configured
 */
export function isProviderEnabled(provider: 'usda' | 'nutritionix'): boolean {
  const env = getEnv();

  switch (provider) {
    case 'usda':
      return env.ENABLE_USDA && !!env.USDA_API_KEY;
    case 'nutritionix':
      return (
        env.ENABLE_NUTRITIONIX &&
        !!env.NUTRITIONIX_APP_ID &&
        !!env.NUTRITIONIX_APP_KEY
      );
    default:
      return false;
  }
}
