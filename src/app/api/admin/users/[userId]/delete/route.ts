import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { deleteUserData } from "@/lib/user-deletion"

/**
 * DELETE /api/admin/users/[userId]/delete
 *
 * Anonymizes user data for COPPA/GDPR compliance.
 * Requires authentication. In future phases, will also require admin role.
 *
 * Response codes:
 * - 200: User successfully anonymized
 * - 401: Not authenticated
 * - 404: User not found
 * - 409: User already deleted
 * - 500: Server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // TODO (Phase 1-05): Add role check - only admins can delete other users
    // For now, any authenticated user can trigger deletion (for COPPA self-deletion)

    const { userId } = await params

    // Perform the deletion
    const result = await deleteUserData(userId, session.user.id, "admin")

    return NextResponse.json(result)
  } catch (error) {
    console.error("User deletion error:", error)

    if (error instanceof Error) {
      // Handle specific error cases
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes("already been deleted")) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: "Failed to delete user data" },
      { status: 500 }
    )
  }
}
