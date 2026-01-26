import { withAuditContext } from '@/lib/db-context';

interface DeletionResult {
  success: boolean;
  userId: string;
  anonymizedAt: Date;
  accountsDeleted: number;
  sessionsDeleted: number;
}

/**
 * Deletes user data in a COPPA/GDPR compliant manner.
 * Uses anonymization (soft delete) instead of hard delete to preserve referential integrity.
 *
 * What happens:
 * 1. User email replaced with anonymized placeholder
 * 2. User name set to "Deleted User"
 * 3. Profile image removed
 * 4. deletedAt timestamp set
 * 5. OAuth accounts deleted (no longer needed)
 * 6. Sessions deleted (logout user everywhere)
 * 7. Audit log entry created for compliance tracking
 *
 * Referential integrity is preserved - user record remains for foreign key references
 * in quiz results, audit logs, etc., but all PII is removed.
 *
 * @param userId - The ID of the user to delete
 * @param requestedBy - The ID of the user/admin requesting deletion
 * @param requestorRole - The role of the requestor (admin, teacher, etc.)
 * @returns DeletionResult with details of what was deleted
 * @throws Error if user not found or already deleted
 */
export async function deleteUserData(
  userId: string,
  requestedBy: string,
  requestorRole: string
): Promise<DeletionResult> {
  return withAuditContext({ userId: requestedBy, userType: requestorRole }, async (tx) => {
    // Verify user exists and hasn't been deleted
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { accounts: true, sessions: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (user.deletedAt) {
      throw new Error(`User ${userId} has already been deleted`);
    }

    const now = new Date();

    // Step 1: Anonymize user data (soft delete)
    // Replace PII with anonymized placeholders
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@anonymized.local`,
        name: 'Deleted User',
        image: null,
        deletedAt: now,
      },
    });

    // Step 2: Delete OAuth accounts (contains tokens, not needed after anonymization)
    const accountsResult = await tx.account.deleteMany({
      where: { userId },
    });

    // Step 3: Delete all sessions (logout user everywhere)
    const sessionsResult = await tx.session.deleteMany({
      where: { userId },
    });

    // Step 4: Create audit log entry for the deletion request
    // Note: The user update above will also trigger the audit trigger,
    // but we create an explicit ANONYMIZE entry for compliance reporting
    await tx.auditLog.create({
      data: {
        tableName: 'User',
        recordId: userId,
        action: 'ANONYMIZE',
        actorId: requestedBy,
        actorType: requestorRole,
        newData: {
          reason: 'User deletion request',
          requestedAt: now.toISOString(),
          accountsDeleted: accountsResult.count,
          sessionsDeleted: sessionsResult.count,
        },
      },
    });

    return {
      success: true,
      userId,
      anonymizedAt: now,
      accountsDeleted: accountsResult.count,
      sessionsDeleted: sessionsResult.count,
    };
  });
}
