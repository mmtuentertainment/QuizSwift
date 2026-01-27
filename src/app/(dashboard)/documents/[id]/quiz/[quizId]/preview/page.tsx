import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { TeacherPreviewWrapper } from './actions';

/**
 * Teacher Preview Page
 *
 * Allows teachers to experience the quiz exactly as students will see it.
 * Completing the preview is required before the quiz can be published (CONT-06).
 *
 * Flow:
 * 1. Teacher starts preview (creates QuizAttempt)
 * 2. Teacher answers questions
 * 3. On submit, quiz is marked as previewed (teacherPreviewedAt is set)
 * 4. Teacher can now publish the quiz
 */
export default async function TeacherPreviewPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id: documentId, quizId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch quiz with questions
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { question: true },
        orderBy: { position: 'asc' },
      },
    },
  });

  // Verify ownership
  if (!quiz || quiz.createdById !== session.user.id) {
    redirect(`/documents/${documentId}`);
  }

  // Verify quiz belongs to the document
  if (quiz.documentId !== documentId) {
    redirect(`/documents/${documentId}/quiz`);
  }

  // Extract questions from quiz
  const questions = quiz.questions.map((qq) => qq.question);

  // Check if already previewed
  const alreadyPreviewed = quiz.teacherPreviewedAt !== null;

  return (
    <div className="container mx-auto max-w-3xl p-6">
      {/* Back navigation */}
      <div className="mb-6">
        <Link
          href={`/documents/${documentId}/quiz/${quizId}`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          &larr; Back to Quiz Details
        </Link>
      </div>

      {/* Preview mode banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-xl">
            <span role="img" aria-label="preview">&#128065;</span>
          </div>
          <div>
            <h2 className="font-bold text-blue-900">Teacher Preview Mode</h2>
            <p className="mt-1 text-sm text-blue-700">
              Experience the quiz exactly as your students will see it.
              {!alreadyPreviewed && (
                <> Complete the preview to enable publishing.</>
              )}
            </p>
            {alreadyPreviewed && (
              <p className="mt-2 text-sm text-green-700">
                This quiz has been previewed and can be published.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quiz header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
        {quiz.description && (
          <p className="mt-2 text-gray-600">{quiz.description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
          <span>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
          {quiz.timeLimit && (
            <span>| {quiz.timeLimit} minute time limit</span>
          )}
          {quiz.shuffleQuestions && (
            <span>| Questions shuffled</span>
          )}
        </div>
      </div>

      {/* Quiz taker component with preview callback */}
      <TeacherPreviewWrapper
        quizId={quizId}
        documentId={documentId}
        questions={questions}
        timeLimit={quiz.timeLimit}
      />
    </div>
  );
}
