import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getQuestions, getTeacherDocuments } from '@/actions/questions';
import { QuestionFilters, QuestionList } from '@/components/question-bank';

interface PageProps {
  searchParams: Promise<{
    documentId?: string;
    questionType?: string;
    bloomLevel?: string;
    search?: string;
    page?: string;
  }>;
}

export const metadata = {
  title: 'Question Bank | QuizSwift',
  description: 'Browse and manage all your questions across documents',
};

/**
 * Question Bank page for browsing and filtering all teacher questions.
 * Supports filtering by document, question type, Bloom's level, and text search.
 * URL-based filter state enables bookmarking and sharing.
 */
export default async function QuestionBankPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [documentsResult, questionsResult] = await Promise.all([
    getTeacherDocuments(),
    getQuestions({
      documentId: params.documentId,
      questionType: params.questionType,
      bloomLevel: params.bloomLevel,
      search: params.search,
      page: params.page ? (parseInt(params.page, 10) || 1) : 1,
    }),
  ]);

  // Extract data with fallbacks for error cases
  const documents = documentsResult.success ? documentsResult.documents : [];
  const questions = questionsResult.success ? questionsResult.questions : [];
  const total = questionsResult.success ? questionsResult.total : 0;
  const page = questionsResult.success ? questionsResult.page : 1;
  const totalPages = questionsResult.success ? questionsResult.totalPages : 1;

  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
        <p className="mt-1 text-gray-600">
          Browse and manage all your questions across documents.
        </p>
      </div>

      {/* Stats summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Questions</p>
          <p className="text-2xl font-semibold">{total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Documents</p>
          <p className="text-2xl font-semibold">{documents.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Current Page</p>
          <p className="text-2xl font-semibold">
            {page} / {totalPages || 1}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Active Filters</p>
          <p className="text-2xl font-semibold">
            {[params.documentId, params.questionType, params.bloomLevel, params.search].filter(
              Boolean
            ).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Suspense
        fallback={
          <div className="mb-6 flex gap-4">
            <div className="h-10 flex-1 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-40 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-40 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-40 animate-pulse rounded bg-gray-200" />
          </div>
        }
      >
        <QuestionFilters documents={documents} />
      </Suspense>

      {/* Question list */}
      <QuestionList
        questions={questions}
        total={total}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
