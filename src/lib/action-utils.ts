/**
 * Shared utilities for server actions
 *
 * Provides common functionality like:
 * - CUID validation for ID parameters
 * - Re-exports of result pattern helpers
 */

import { z } from 'zod';

// Re-export result helpers from prisma-errors
export { type ActionResult, ok, err } from './prisma-errors';

/**
 * CUID validation schema.
 * Use for validating database ID parameters in server actions.
 */
export const cuidSchema = z.string().cuid();

/**
 * Validate a CUID string and return typed result.
 *
 * @example
 * ```typescript
 * const check = validateCuid(quizId, 'Quiz ID');
 * if (!check.valid) return { error: check.error };
 * ```
 */
export function validateCuid(
  id: string,
  label = 'ID'
): { valid: true } | { valid: false; error: string } {
  const result = cuidSchema.safeParse(id);
  if (!result.success) {
    return { valid: false, error: `Invalid ${label} format` };
  }
  return { valid: true };
}
