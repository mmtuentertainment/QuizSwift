import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { QuizBuilder } from '@/components/quiz/quiz-builder';

export default async function NewQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: documentId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Verify document and get selected questions
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      fileName: true,
      uploadedById: true,
      curatedQuestions: {
        where: { teacherSelected: true },
        orderBy: { rank: 'asc' },
      },
    },
  });

  if (!document || document.uploadedById !== session.user.id) {
    redirect('/documents');
  }

  if (document.curatedQuestions.length === 0) {
    // Redirect to curation if no questions selected
    redirect(`/documents/${documentId}/curate`);
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Link href={`/documents/${documentId}/quiz`} className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Back to Quizzes
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-bold">Create Quiz</h1>
      <p className="mb-6 text-gray-600">From: {document.fileName}</p>

      <QuizBuilder
        documentId={documentId}
        availableQuestions={document.curatedQuestions}
      />
    </div>
  );
}
