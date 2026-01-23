import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

/**
 * GET /api/audit
 *
 * Query audit logs with filtering by date range, user, table, and action.
 * Requires authentication. In future phases, will require admin role.
 *
 * Query parameters:
 * - startDate (required): ISO date string for range start
 * - endDate (required): ISO date string for range end
 * - userId (optional): Filter by actor ID
 * - tableName (optional): Filter by table name (User, Quiz, etc.)
 * - action (optional): Filter by action type (INSERT, UPDATE, DELETE, ANONYMIZE)
 * - limit (optional): Max records to return (default: 100, max: 1000)
 * - offset (optional): Pagination offset (default: 0)
 *
 * Response:
 * - 200: { logs: AuditLog[], pagination: { total, limit, offset, hasMore } }
 * - 400: Missing required parameters
 * - 401: Not authenticated
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // TODO (Phase 1-05): Add role check - only admins can view audit logs

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const userId = searchParams.get("userId")
    const tableName = searchParams.get("tableName")
    const action = searchParams.get("action")
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000)
    const offset = parseInt(searchParams.get("offset") || "0")

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      )
    }

    // Validate date formats
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)" },
        { status: 400 }
      )
    }

    // Build where clause
    const where: {
      createdAt: { gte: Date; lte: Date }
      actorId?: string
      tableName?: string
      action?: string
    } = {
      createdAt: {
        gte: start,
        lte: end,
      },
    }

    if (userId) {
      where.actorId = userId
    }

    if (tableName) {
      where.tableName = tableName
    }

    if (action) {
      where.action = action
    }

    // Execute queries in parallel
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    })
  } catch (error) {
    console.error("Audit query error:", error)
    return NextResponse.json(
      { error: "Failed to query audit logs" },
      { status: 500 }
    )
  }
}
