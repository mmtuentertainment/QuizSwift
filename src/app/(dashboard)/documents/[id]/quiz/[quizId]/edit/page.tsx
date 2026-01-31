import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getQuizWithQuestions } from '@/actions/quiz';
import { QuizSettingsForm } from './quiz-settings-form';

/**
 * Quiz Edit Settings Page
 *
 * Allows teachers to edit quiz settings:
 * - Title and description
 * - Time limit
 * - Shuffle questions toggle
 * - Results visibility settings
 */
export default async function QuizEditPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id: documentId, quizId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const result = await getQuizWithQuestions(quizId);

  if (!result.success) {
    redirect(`/documents/${documentId}/quiz`);
  }

  const quiz = result.quiz;

  // Verify quiz belongs to the document
  if (quiz.documentId !== documentId) {
    redirect(`/documents/${documentId}/quiz`);
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      {/* Back navigation */}
      <div className="mb-6">
        <Link
          href={`/documents/${documentId}/quiz/${quizId}`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          &larr; Back to Quiz Details
        </Link>
      </div>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Quiz Settings</h1>
        <p className="mt-2 text-gray-600">
          Update the settings for &quot;{quiz.title}&quot;
        </p>
      </div>

      {/* Settings form */}
      <QuizSettingsForm
        quiz={{
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          timeLimit: quiz.timeLimit,
          shuffleQuestions: quiz.shuffleQuestions,
          showResults: quiz.showResults,
        }}
        documentId={documentId}
      />
    </div>
  );
}
