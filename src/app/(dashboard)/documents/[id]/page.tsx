import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { UploadProgress } from '@/components/upload/upload-progress';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: {
      id,
      uploadedById: session.user.id,
    },
    include: {
      questions: {
        orderBy: [{ pageNumber: 'asc' }, { createdAt: 'asc' }],
      },
      curatedQuestions: {
        where: { inCurationPool: true },
        orderBy: { rank: 'asc' },
      },
    },
  });

  if (!document) {
    notFound();
  }

  // Check if using new curation pipeline or legacy extraction
  const usesCuration =
    document.requestedQuestionCount !== null && document.requestedQuestionCount > 0;
  const isProcessing =
    ['pending', 'processing', 'extracting'].includes(document.status) ||
    (usesCuration &&
      document.curationStatus &&
      !['complete', 'failed'].includes(document.curationStatus));

  // Counts from appropriate source
  const curatedCount = document.curatedQuestions.length;
  const selectedCount = document.curatedQuestions.filter((q) => q.teacherSelected).length;
  const verifiedCount = document.questions.filter((q) => q.verified).length;
  const flaggedCount = document.questions.filter((q) => q.flagged).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href="/documents" className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Back to Documents
        </Link>
      </div>

      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <h1 className="mb-2 text-2xl font-bold">{document.fileName}</h1>
        <div className="space-y-1 text-sm text-gray-500">
          {document.totalPages && <p>{document.totalPages} pages</p>}
          <p>Uploaded {new Date(document.createdAt).toLocaleDateString()}</p>
        </div>

        {isProcessing ? (
          <div className="mt-6">
            <UploadProgress documentId={document.id} />
            {usesCuration && document.curationStatus && (
              <p className="mt-2 text-sm text-gray-500">
                Curation status: {document.curationStatus}
              </p>
            )}
          </div>
        ) : document.status === 'failed' || document.curationStatus === 'failed' ? (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-red-700">
            Processing failed: {document.errorMessage || 'Unknown error'}
          </div>
        ) : usesCuration ? (
          <div className="mt-4 space-y-3">
            <div className="flex gap-4 text-sm">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">
                {curatedCount} curated questions
              </span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
                {selectedCount} selected
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
                Target: {document.requestedQuestionCount}
              </span>
            </div>
            {document.curationStatus === 'complete' && curatedCount > 0 && (
              <Link
                href={`/documents/${document.id}/curate`}
                className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Review & Select Questions
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-4 flex gap-4 text-sm">
            <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
              {verifiedCount} verified questions
            </span>
            {flaggedCount > 0 && (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-800">
                {flaggedCount} flagged for review
              </span>
            )}
          </div>
        )}
      </div>

      {document.status === 'completed' && document.questions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Extracted Questions</h2>

          {document.questions.map((question) => (
            <div
              key={question.id}
              className={`rounded-lg border-l-4 bg-white p-4 shadow ${
                question.flagged ? 'border-yellow-500 bg-yellow-50' : 'border-green-500'
              }`}
            >
              <div className="mb-2 flex items-start justify-between">
                <span className="text-xs text-gray-500">
                  Page {question.pageNumber} | {question.questionType.replace('_', ' ')}
                </span>
                {question.flagged && (
                  <span className="rounded bg-yellow-200 px-2 py-0.5 text-xs text-yellow-800">
                    Needs Review
                  </span>
                )}
              </div>

              <p className="mb-2 font-medium">{question.questionText}</p>

              {question.options && Array.isArray(question.options) && (
                <ul className="mb-2 list-inside list-disc text-sm text-gray-600">
                  {(question.options as string[]).map((opt, i) => (
                    <li key={i}>{opt}</li>
                  ))}
                </ul>
              )}

              <div className="text-sm">
                <span className="font-medium text-green-700">Answer: </span>
                <span>{question.correctAnswer}</span>
              </div>

              <div className="mt-3 border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-500 italic">
                  Source: &quot;{question.sourceQuote}&quot;
                </p>
                {question.verificationScore && (
                  <p className="mt-1 text-xs text-gray-400">
                    Confidence: {(question.verificationScore * 100).toFixed(0)}%
                  </p>
                )}
                {question.flagReason && (
                  <p className="mt-1 text-xs text-yellow-600">Flag reason: {question.flagReason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show "no questions" only when appropriate */}
      {document.status === 'completed' && !usesCuration && document.questions.length === 0 && (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No quiz questions were found in this document.
        </div>
      )}

      {usesCuration && document.curationStatus === 'complete' && curatedCount === 0 && (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No questions could be generated from this document. The content may not be suitable for
          quiz extraction.
        </div>
      )}
    </div>
  );
}
