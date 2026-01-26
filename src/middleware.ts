import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

/**
 * Route protection middleware
 *
 * Protects:
 * - /api/documents/* - Document management APIs
 * - /api/audit - Audit log API
 * - /(dashboard)/* - All dashboard pages
 *
 * Allows without auth:
 * - /api/inngest - Called by Inngest with its own signing key verification
 * - /api/auth/* - Auth.js routes
 * - Public pages (/, /login, etc.)
 */
export default auth((req) => {
  const { pathname } = req.nextUrl

  // Skip auth for Inngest webhook (has its own signing key verification)
  if (pathname.startsWith("/api/inngest")) {
    return NextResponse.next()
  }

  // Skip auth for Auth.js routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Check authentication for protected routes
  const isProtectedAPI =
    pathname.startsWith("/api/documents") ||
    pathname.startsWith("/api/audit") ||
    pathname.startsWith("/api/upload")

  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/documents") ||
    pathname.startsWith("/upload") ||
    pathname.startsWith("/admin")

  if (isProtectedAPI || isProtectedPage) {
    if (!req.auth?.user) {
      if (isProtectedAPI) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        )
      }
      // Redirect to login for pages
      const loginUrl = new URL("/login", req.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Match API routes (except auth)
    "/api/:path*",
    // Match dashboard routes (using route groups)
    "/dashboard/:path*",
    "/documents/:path*",
    "/upload/:path*",
    "/admin/:path*",
  ],
}
