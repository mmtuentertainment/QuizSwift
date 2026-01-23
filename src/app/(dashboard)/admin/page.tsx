import { auth } from "@/lib/auth"
import Link from "next/link"

/**
 * Admin dashboard page for compliance management.
 * Provides access to:
 * - DPA template download
 * - Audit log viewer
 * - User management (coming in future phases)
 */
export default async function AdminPage() {
  const session = await auth()

  // TODO (Phase 1-05): Add role check - only admins can access this page

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <p className="mt-1 text-gray-600">
          Compliance management and audit tools
        </p>
      </div>

      {/* Compliance Documents Section */}
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">
          Compliance Documents
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Download required legal documents for school district compliance.
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <h4 className="font-medium text-gray-900">
                Data Processing Agreement (DPA)
              </h4>
              <p className="text-sm text-gray-600">
                COPPA/FERPA compliant template for school districts
              </p>
            </div>
            <a
              href="/legal/dpa-template.md"
              download="QuizSwift-DPA-Template.md"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Download
            </a>
          </div>
        </div>
      </section>

      {/* Audit & Compliance Section */}
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">
          Audit & Compliance
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Review system audit logs and compliance reports.
        </p>

        <div className="mt-4 space-y-3">
          <Link
            href="/admin/audit"
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100"
          >
            <div>
              <h4 className="font-medium text-gray-900">Audit Log Viewer</h4>
              <p className="text-sm text-gray-600">
                Query and review data access and modification logs
              </p>
            </div>
            <span className="text-gray-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
          </Link>
        </div>
      </section>

      {/* User Management Section - Future */}
      <section className="rounded-lg border bg-white p-6 shadow-sm opacity-60">
        <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
        <p className="mt-2 text-sm text-gray-600">
          Manage users and handle data deletion requests.
        </p>

        <div className="mt-4">
          <p className="text-sm italic text-gray-500">
            Coming in Phase 1-05: Role-based access control
          </p>
        </div>
      </section>

      {/* Current User Info */}
      <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Logged in as:</span>{" "}
          {session?.user?.email}
        </p>
        <p className="mt-1 text-xs text-blue-600">
          Note: Full admin role verification coming in Phase 1-05
        </p>
      </section>
    </div>
  )
}
