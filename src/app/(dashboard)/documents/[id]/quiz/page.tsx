import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getQuizzesForDocument } from '@/actions/quiz';

export default async function QuizListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: documentId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Verify document ownership
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, fileName: true, uploadedById: true },
  });

  if (!document || document.uploadedById !== session.user.id) {
    redirect('/documents');
  }

  const quizzesResult = await getQuizzesForDocument(documentId);
  const quizzes = quizzesResult.success ? quizzesResult.quizzes : [];

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Link href={`/documents/${documentId}`} className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Back to Document
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quizzes</h1>
          <p className="text-gray-600">From: {document.fileName}</p>
        </div>
        <Link
          href={`/documents/${documentId}/quiz/new`}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Create New Quiz
        </Link>
      </div>

      {quizzes.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600">No quizzes created yet.</p>
          <Link
            href={`/documents/${documentId}/quiz/new`}
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Create your first quiz
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/documents/${documentId}/quiz/${quiz.id}`}
              className="block rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{quiz.title}</h3>
                  <p className="text-sm text-gray-600">
                    {quiz._count.questions} questions
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                      quiz.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : quiz.status === 'preview_required'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {quiz.status.replace(/_/g, ' ')}
                  </span>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(quiz.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
