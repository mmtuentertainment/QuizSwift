/**
 * Shared utilities for server actions
 *
 * Provides common functionality like:
 * - CUID validation for ID parameters
 * - ActionResult type for consistent success/error handling
 *
 * Note: For result pattern helpers (ok, err),
 * import directly from './prisma-errors' to avoid circular dependencies.
 */

import { z } from 'zod';

// =============================================================================
// Action Result Types
// =============================================================================

/**
 * Discriminated union for server action results.
 * Use for consistent success/error handling across all server actions.
 *
 * @example
 * ```typescript
 * async function myAction(): Promise<ActionResult<{ id: string }>> {
 *   try {
 *     const result = await doSomething();
 *     return { success: true, data: result };
 *   } catch (error) {
 *     return { success: false, error: 'Operation failed' };
 *   }
 * }
 * ```
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Convenience type for actions that return no data on success.
 * Simpler than ActionResult<void> which requires data: undefined.
 *
 * @example
 * ```typescript
 * async function deleteItem(id: string): Promise<ActionResultVoid> {
 *   try {
 *     await db.item.delete({ where: { id } });
 *     return { success: true };
 *   } catch (error) {
 *     return { success: false, error: 'Failed to delete' };
 *   }
 * }
 * ```
 */
export type ActionResultVoid =
  | { success: true }
  | { success: false; error: string };

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
