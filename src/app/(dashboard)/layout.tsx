import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SignOutButton } from "@/components/auth/sign-out-button"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">QuizSwift</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session.user.name || session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
