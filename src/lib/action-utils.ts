/**
 * Shared utilities for server actions
 *
 * Provides common functionality like:
 * - CUID validation for ID parameters
 *
 * Note: For result pattern helpers (ok, err, ActionResult),
 * import directly from './prisma-errors' to avoid circular dependencies.
 */

import { z } from 'zod';

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
