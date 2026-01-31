import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getQuizWithQuestions } from '@/actions/quiz';
import { QuizDetailClient } from './quiz-detail-client';

/**
 * Quiz Detail Page
 *
 * Shows all questions in a quiz with:
 * - Quiz metadata (title, description, settings)
 * - Preview status indicator
 * - Publish button (requires preview - CONT-06)
 * - List of questions with edit buttons (CONT-07)
 */
export default async function QuizDetailPage({
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

  // Format questions for client component
  const questions = quiz.questions.map((qq) => ({
    id: qq.question.id,
    questionText: qq.question.questionText,
    questionType: qq.question.questionType,
    correctAnswer: qq.question.correctAnswer,
    explanation: qq.question.explanation,
    sourceEvidence: qq.question.sourceEvidence,
    options: qq.question.options,
    bloomLevel: qq.question.bloomLevel,
    difficulty: qq.question.difficulty,
    position: qq.position,
    points: qq.points,
    imageUrl: qq.question.imageUrl,
    imageAltText: qq.question.imageAltText,
  }));

  return (
    <div className="container mx-auto max-w-4xl p-6">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/documents" className="text-blue-600 hover:text-blue-800">
              Documents
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li>
            <Link
              href={`/documents/${documentId}`}
              className="text-blue-600 hover:text-blue-800"
            >
              {quiz.document.fileName}
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li>
            <Link
              href={`/documents/${documentId}/quiz`}
              className="text-blue-600 hover:text-blue-800"
            >
              Quizzes
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-600">{quiz.title}</li>
        </ol>
      </nav>

      {/* Quiz Detail Client Component */}
      <QuizDetailClient
        quiz={{
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          status: quiz.status,
          teacherPreviewedAt: quiz.teacherPreviewedAt?.toISOString() ?? null,
          publishedAt: quiz.publishedAt?.toISOString() ?? null,
          timeLimit: quiz.timeLimit,
          shuffleQuestions: quiz.shuffleQuestions,
          showResults: quiz.showResults,
        }}
        questions={questions}
        documentId={documentId}
      />
    </div>
  );
}
