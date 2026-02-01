/**
 * Shared Prisma error handling utilities
 *
 * Provides consistent error handling across all server actions
 * that interact with Prisma.
 *
 * Note: ActionResult type is re-exported from action-utils.ts for convenience.
 * The canonical definition is in action-utils.ts.
 */

import { Prisma } from '@/generated/prisma/client';
import type { ActionResult } from './action-utils';

// Re-export ActionResult for backward compatibility
export type { ActionResult } from './action-utils';

/**
 * Handle Prisma errors and return user-friendly messages.
 * Logs the full error for debugging while returning safe messages to users.
 */
export function handlePrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('[Prisma Error]:', error);
    if (error.code === 'P2002') return 'A record with this information already exists.';
    if (error.code === 'P2003') return 'Cannot complete operation due to related records.';
    if (error.code === 'P2025') return 'Record not found.';
  } else {
    console.error('[Prisma Error]:', error);
  }
  return 'Database operation failed. Please try again.';
}

/**
 * Create a success result
 */
export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function err(error: string): ActionResult<never> {
  return { success: false, error };
}
