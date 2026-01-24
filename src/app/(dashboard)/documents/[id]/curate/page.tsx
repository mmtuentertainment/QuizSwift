import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { CurationClient } from './curation-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CuratePage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const document = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      fileName: true,
      uploadedById: true,
      requestedQuestionCount: true,
      curationStatus: true,
      contentAnalysis: true,
      curatedQuestions: {
        where: { inCurationPool: true },
        orderBy: { rank: 'asc' },
      },
    },
  });

  if (!document) {
    notFound();
  }

  if (document.uploadedById !== session.user.id) {
    redirect('/dashboard');
  }

  if (document.curationStatus !== 'complete') {
    // Redirect to document page to show processing status
    redirect(`/documents/${id}`);
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Curate Questions</h1>
        <p className="text-gray-600">
          Select {document.requestedQuestionCount} questions from the curated pool for your quiz.
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Document: {document.fileName}
        </p>
      </div>

      <CurationClient
        documentId={document.id}
        questions={document.curatedQuestions}
        targetCount={document.requestedQuestionCount ?? 15}
        contentAnalysis={document.contentAnalysis as object | null}
      />
    </div>
  );
}
