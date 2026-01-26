import { z } from 'zod';

/**
 * Environment variable validation schema
 *
 * Validates all required environment variables at startup to fail fast
 * with clear error messages instead of cryptic runtime failures.
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),

  // Auth.js
  AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required'),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // Cloudflare R2 Storage (FERPA-compliant private storage)
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),

  // AI Providers
  OLLAMA_HOST: z.string().default('http://localhost:11434'),
  OPENAI_API_KEY: z.string().optional(),

  // Inngest
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Validate environment variables
 * Call this at startup to catch missing/invalid env vars early
 */
export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `  ${field}: ${messages?.join(', ')}`)
      .join('\n');

    console.error('\n❌ Environment variable validation failed:\n');
    console.error(errorMessages);
    console.error('\nPlease check your .env file.\n');

    // In production, fail hard
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Environment variable validation failed');
    }
  }

  return result.success;
}

/**
 * Type-safe environment access
 * Use this instead of process.env for type safety
 */
export const env = envSchema.parse(process.env);

// Validate on module load in production
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}
