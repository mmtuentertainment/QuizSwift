/**
 * Simple in-memory rate limiter for API routes.
 * Uses sliding window algorithm with cleanup.
 *
 * Note: For production with multiple instances, use Redis-based rate limiting.
 * This in-memory version works well for single-instance deployments.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  /** Whether the request should be allowed */
  allowed: boolean;
  /** Number of requests remaining in current window */
  remaining: number;
  /** When the rate limit resets (Unix timestamp in seconds) */
  resetAt: number;
  /** Total limit for this window */
  limit: number;
}

/**
 * Check rate limit for a given identifier (usually userId or IP)
 *
 * @param identifier - Unique identifier for the rate limit (e.g., userId, IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 *
 * @example
 * const result = checkRateLimit(session.user.id, { limit: 10, windowSeconds: 60 });
 * if (!result.allowed) {
 *   return new Response('Too Many Requests', {
 *     status: 429,
 *     headers: {
 *       'X-RateLimit-Limit': result.limit.toString(),
 *       'X-RateLimit-Remaining': result.remaining.toString(),
 *       'X-RateLimit-Reset': result.resetAt.toString(),
 *     },
 *   });
 * }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = `${identifier}`;

  const entry = rateLimitStore.get(key);

  // If no entry or entry expired, create new window
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: Math.floor(resetAt / 1000),
      limit: config.limit,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.floor(entry.resetAt / 1000),
      limit: config.limit,
    };
  }

  // Increment counter
  entry.count++;
  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: Math.floor(entry.resetAt / 1000),
    limit: config.limit,
  };
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  };
}

// Pre-configured rate limits for common use cases
export const RATE_LIMITS = {
  /** Upload: 10 files per hour per user */
  upload: { limit: 10, windowSeconds: 3600 },
  /** API general: 100 requests per minute */
  apiGeneral: { limit: 100, windowSeconds: 60 },
  /** Auth attempts: 5 per 15 minutes */
  auth: { limit: 5, windowSeconds: 900 },
} as const;
