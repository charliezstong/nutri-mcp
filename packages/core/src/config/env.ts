import { z } from 'zod';

/**
 * Optional string: treats empty strings (common in .env files and MCP client
 * configs) as "not set".
 */
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === '' ? undefined : v.trim()));

/**
 * Boolean env flag. Unlike `z.coerce.boolean()`, the string "false" is false.
 */
const flag = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v.trim() === '') return defaultValue;
      const normalized = v.trim().toLowerCase();
      if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
      if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
      ctx.addIssue({ code: 'custom', message: `Expected a boolean (true/false), got "${v}"` });
      return z.NEVER;
    });

/**
 * Environment variable schema with validation
 */
const envSchema = z.object({
  // Transport
  TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
  HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HTTP_HOST: z.string().default('127.0.0.1'),
  /** Comma-separated list of allowed browser origins for the HTTP transport. */
  ALLOWED_ORIGINS: optionalString,

  // API Keys (optional)
  USDA_API_KEY: optionalString,
  NUTRITIONIX_APP_ID: optionalString,
  NUTRITIONIX_APP_KEY: optionalString,

  // Open Food Facts
  /** Contact email sent in the User-Agent, as requested by Open Food Facts. */
  OFF_CONTACT_EMAIL: optionalString,
  /** Base URL of the Open Food Facts server (use https://world.openfoodfacts.net for staging). */
  OFF_BASE_URL: z.string().url().default('https://world.openfoodfacts.org'),

  // Cache
  CACHE_MAX_SIZE: z.coerce.number().int().min(100).max(100000).default(1000),

  // Logging (always to stderr; optionally mirrored to a file)
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FILE: optionalString,

  // Timeouts
  REQUEST_TIMEOUT: z.coerce.number().int().min(1000).max(60000).default(10000),

  // Feature flags
  ENABLE_USDA: flag(true),
  ENABLE_NUTRITIONIX: flag(true),
  ENABLE_CACHING: flag(true),
  ENABLE_RECALLS: flag(true),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const errors = result.error.issues
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
 * Reset the cached environment (tests only).
 */
export function resetEnvForTests(overrides?: Partial<Record<keyof Env, string>>): void {
  envInstance = overrides ? loadEnv({ ...process.env, ...overrides }) : null;
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
