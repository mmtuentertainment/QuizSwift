import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { SignInButton } from '@/components/auth/sign-in-button';

export default async function LoginPage() {
  const session = await auth();

  // Redirect to dashboard if already logged in
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">QuizSwift</h1>
          <p className="mt-2 text-gray-600">Sign in to create factually accurate quizzes</p>
        </div>

        <div className="flex justify-center pt-4">
          <SignInButton />
        </div>

        <p className="text-center text-xs text-gray-500">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </main>
  );
}
