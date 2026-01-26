import { headers } from 'next/headers';

/**
 * Extracts audit-relevant information from the current request.
 * Use in API routes and server actions to capture request metadata.
 *
 * @example
 * // In a server action
 * const ctx = await getRequestContext()
 * await withAuditContext(
 *   { userId: session.user.id, userType: "teacher", ...ctx },
 *   () => prisma.user.update({ ... })
 * )
 *
 * @returns Object containing ipAddress and userAgent from request headers
 */
export async function getRequestContext() {
  const headersList = await headers();

  return {
    ipAddress: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown',
    userAgent: headersList.get('user-agent') || 'unknown',
  };
}
