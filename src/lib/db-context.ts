import { Prisma } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/prisma';

export interface AuditContext {
  userId: string;
  userType: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Wraps database operations with audit context using a transaction.
 * Sets PostgreSQL session variables that the audit trigger reads.
 *
 * CRITICAL: Uses Prisma $transaction to ensure session variables and
 * operations execute on the SAME database connection. Without a transaction,
 * session variables would be lost between queries due to connection pooling.
 *
 * @example
 * const result = await withAuditContext(
 *   { userId: session.user.id, userType: "teacher" },
 *   async (tx) => {
 *     return tx.user.update({ where: { id }, data: { name } })
 *   }
 * )
 *
 * @example
 * // With full request context
 * const ctx = await getRequestContext()
 * await withAuditContext(
 *   { userId: session.user.id, userType: "teacher", ...ctx },
 *   async (tx) => {
 *     await tx.document.create({ data: { ... } })
 *     return tx.auditLog.create({ data: { ... } })
 *   }
 * )
 */
export async function withAuditContext<T>(
  context: AuditContext,
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    // Set session variables for PostgreSQL triggers
    // These are read by audit_trigger_func() via current_setting()
    // The 'true' parameter makes the setting transaction-local
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${context.userId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_user_type', ${context.userType}, true)`;

    if (context.ipAddress) {
      await tx.$executeRaw`SELECT set_config('app.current_ip', ${context.ipAddress}, true)`;
    }

    if (context.userAgent) {
      await tx.$executeRaw`SELECT set_config('app.current_user_agent', ${context.userAgent}, true)`;
    }

    // Execute operation within the same transaction (same connection)
    return operation(tx);
  });
}

/**
 * System-level operations (migrations, cron jobs) that don't have a user context.
 * Use this for automated processes that modify data but aren't initiated by a user.
 *
 * @example
 * // In a cron job that cleans up expired sessions
 * await withSystemContext(async (tx) =>
 *   tx.session.deleteMany({ where: { expires: { lt: new Date() } } })
 * )
 */
export async function withSystemContext<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', 'system', true)`;
    await tx.$executeRaw`SELECT set_config('app.current_user_type', 'system', true)`;

    return operation(tx);
  });
}

/**
 * Simplified audit wrapper for operations that don't need the transaction client.
 * Wraps a standard prisma operation with audit context.
 *
 * @example
 * await withAuditContextSimple(
 *   { userId: session.user.id, userType: "teacher" },
 *   () => prisma.user.update({ where: { id }, data: { name } })
 * )
 */
export async function withAuditContextSimple<T>(
  context: AuditContext,
  operation: () => Promise<T>
): Promise<T> {
  const prisma = getPrisma();

  // Note: This version doesn't guarantee same connection, but sets context best-effort.
  // Use withAuditContext with transaction client for guaranteed audit trails.
  await prisma.$executeRaw`SELECT set_config('app.current_user_id', ${context.userId}, true)`;
  await prisma.$executeRaw`SELECT set_config('app.current_user_type', ${context.userType}, true)`;

  if (context.ipAddress) {
    await prisma.$executeRaw`SELECT set_config('app.current_ip', ${context.ipAddress}, true)`;
  }

  if (context.userAgent) {
    await prisma.$executeRaw`SELECT set_config('app.current_user_agent', ${context.userAgent}, true)`;
  }

  return operation();
}
