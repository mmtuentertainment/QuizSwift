import { S3Client } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 client configuration
 *
 * Uses lazy initialization to avoid breaking builds when env vars aren't set.
 * The client and bucket are created on first use.
 */

let _r2Client: S3Client | null = null;
let _r2Bucket: string | null = null;

function validateEnvVars(): void {
  const requiredEnvVars = ['CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required R2 environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get the R2 S3Client instance (lazy initialization)
 */
export function getR2Client(): S3Client {
  if (!_r2Client) {
    validateEnvVars();
    _r2Client = new S3Client({
      region: 'auto', // R2 only supports 'auto'
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _r2Client;
}

/**
 * Get the R2 bucket name (lazy initialization)
 */
export function getR2Bucket(): string {
  if (!_r2Bucket) {
    validateEnvVars();
    _r2Bucket = process.env.R2_BUCKET_NAME!;
  }
  return _r2Bucket;
}

// Re-export as getters for backward compatibility with direct imports
export const r2Client = { get current() { return getR2Client(); } };
export const R2_BUCKET = { get current() { return getR2Bucket(); } };
