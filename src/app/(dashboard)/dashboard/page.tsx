import { auth } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome back!</h2>
        <p className="text-gray-600">
          You're signed in as {session?.user?.email}
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Get Started</h3>
        <p className="mt-2 text-gray-600">
          Upload a textbook chapter to create your first quiz. Coming soon in Phase 2!
        </p>
      </div>
    </div>
  )
}
