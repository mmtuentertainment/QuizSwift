import prisma from "@/lib/prisma"

interface AuditContext {
  userId: string
  userType: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Wraps a database operation with audit context.
 * Sets PostgreSQL session variables that the audit trigger reads.
 *
 * IMPORTANT: The session variables are transaction-local (true = local to transaction).
 * Each request should call this to set the actor context for audit logging.
 *
 * @example
 * const users = await withAuditContext(
 *   { userId: session.user.id, userType: "teacher" },
 *   () => prisma.user.findMany()
 * )
 *
 * @example
 * // With full request context
 * const ctx = await getRequestContext()
 * await withAuditContext(
 *   { userId: session.user.id, userType: "teacher", ...ctx },
 *   () => prisma.user.update({ where: { id }, data: { name } })
 * )
 */
export async function withAuditContext<T>(
  context: AuditContext,
  operation: () => Promise<T>
): Promise<T> {
  // Set session variables for PostgreSQL triggers
  // These are read by audit_trigger_func() via current_setting()
  // The 'true' parameter makes the setting transaction-local
  await prisma.$executeRaw`SELECT set_config('app.current_user_id', ${context.userId}, true)`
  await prisma.$executeRaw`SELECT set_config('app.current_user_type', ${context.userType}, true)`

  if (context.ipAddress) {
    await prisma.$executeRaw`SELECT set_config('app.current_ip', ${context.ipAddress}, true)`
  }

  if (context.userAgent) {
    await prisma.$executeRaw`SELECT set_config('app.current_user_agent', ${context.userAgent}, true)`
  }

  return operation()
}

/**
 * System-level operations (migrations, cron jobs) that don't have a user context.
 * Use this for automated processes that modify data but aren't initiated by a user.
 *
 * @example
 * // In a cron job that cleans up expired sessions
 * await withSystemContext(() =>
 *   prisma.session.deleteMany({ where: { expires: { lt: new Date() } } })
 * )
 */
export async function withSystemContext<T>(
  operation: () => Promise<T>
): Promise<T> {
  await prisma.$executeRaw`SELECT set_config('app.current_user_id', 'system', true)`
  await prisma.$executeRaw`SELECT set_config('app.current_user_type', 'system', true)`

  return operation()
}
