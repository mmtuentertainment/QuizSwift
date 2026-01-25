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
  const usesCuration = document.requestedQuestionCount !== null && document.requestedQuestionCount > 0;
  const isProcessing = ['pending', 'processing', 'extracting'].includes(document.status) ||
    (usesCuration && document.curationStatus && !['complete', 'failed'].includes(document.curationStatus));

  // Counts from appropriate source
  const curatedCount = document.curatedQuestions.length;
  const selectedCount = document.curatedQuestions.filter((q) => q.teacherSelected).length;
  const verifiedCount = document.questions.filter((q) => q.verified).length;
  const flaggedCount = document.questions.filter((q) => q.flagged).length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/documents" className="text-blue-600 hover:text-blue-800 text-sm">
          &larr; Back to Documents
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">{document.fileName}</h1>
        <div className="text-sm text-gray-500 space-y-1">
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
          <div className="mt-4 bg-red-50 text-red-700 p-3 rounded-md">
            Processing failed: {document.errorMessage || 'Unknown error'}
          </div>
        ) : usesCuration ? (
          <div className="mt-4 space-y-3">
            <div className="flex gap-4 text-sm">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {curatedCount} curated questions
              </span>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                {selectedCount} selected
              </span>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                Target: {document.requestedQuestionCount}
              </span>
            </div>
            {document.curationStatus === 'complete' && curatedCount > 0 && (
              <Link
                href={`/documents/${document.id}/curate`}
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Review & Select Questions
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-4 flex gap-4 text-sm">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
              {verifiedCount} verified questions
            </span>
            {flaggedCount > 0 && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
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
              className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                question.flagged
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-green-500'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-gray-500">
                  Page {question.pageNumber} | {question.questionType.replace('_', ' ')}
                </span>
                {question.flagged && (
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                    Needs Review
                  </span>
                )}
              </div>

              <p className="font-medium mb-2">{question.questionText}</p>

              {question.options && Array.isArray(question.options) && (
                <ul className="list-disc list-inside text-sm text-gray-600 mb-2">
                  {(question.options as string[]).map((opt, i) => (
                    <li key={i}>{opt}</li>
                  ))}
                </ul>
              )}

              <div className="text-sm">
                <span className="font-medium text-green-700">Answer: </span>
                <span>{question.correctAnswer}</span>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 italic">
                  Source: &quot;{question.sourceQuote}&quot;
                </p>
                {question.verificationScore && (
                  <p className="text-xs text-gray-400 mt-1">
                    Confidence: {(question.verificationScore * 100).toFixed(0)}%
                  </p>
                )}
                {question.flagReason && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Flag reason: {question.flagReason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}


      {/* Show "no questions" only when appropriate */}
      {document.status === 'completed' && !usesCuration && document.questions.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No quiz questions were found in this document.
        </div>
      )}

      {usesCuration && document.curationStatus === 'complete' && curatedCount === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No questions could be generated from this document. The content may not be suitable for quiz extraction.
        </div>
      )}
    </div>
  );
}
