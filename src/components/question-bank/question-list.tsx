'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { QuestionEditor } from './question-editor';
import type { CuratedQuestion, Document } from '@/generated/prisma/client';

type QuestionWithDocument = CuratedQuestion & {
  document: Pick<Document, 'id' | 'fileName'>;
};

interface QuestionListProps {
  questions: QuestionWithDocument[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Paginated list of questions in the question bank.
 * Shows question preview, metadata badges, and edit button.
 */
export function QuestionList({
  questions,
  total,
  page,
  totalPages,
}: QuestionListProps) {
  const searchParams = useSearchParams();
  const [editingQuestion, setEditingQuestion] = useState<CuratedQuestion | null>(null);

  const buildPageUrl = (pageNum: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNum.toString());
    return `/question-bank?${params.toString()}`;
  };

  if (questions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-600">No questions found.</p>
        <p className="mt-2 text-sm text-gray-500">
          Try adjusting your filters or upload a document to generate questions.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 text-sm text-gray-600">
        Showing {questions.length} of {total} questions
      </div>

      <div className="space-y-4">
        {questions.map((question) => (
          <div
            key={question.id}
            className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {/* Source document and metadata */}
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/documents/${question.documentId}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {question.document.fileName}
                  </Link>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs capitalize">
                    {question.questionType.replace(/_/g, ' ')}
                  </span>
                  <span className="rounded bg-purple-100 px-2 py-0.5 text-xs capitalize text-purple-700">
                    {question.bloomLevel}
                  </span>
                  <span className="rounded bg-orange-100 px-2 py-0.5 text-xs capitalize text-orange-700">
                    {question.difficulty}
                  </span>
                </div>

                {/* Question text preview */}
                <p className="text-gray-800">
                  {question.questionText.slice(0, 200)}
                  {question.questionText.length > 200 ? '...' : ''}
                </p>

                {/* Concept tag */}
                {question.targetConceptName && (
                  <p className="mt-2 text-xs text-gray-500">
                    Concept: {question.targetConceptName}
                  </p>
                )}
              </div>

              {/* Edit button */}
              <button
                onClick={() => setEditingQuestion(question)}
                className="shrink-0 rounded border border-gray-300 px-3 py-1 text-sm transition-colors hover:bg-gray-50"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={buildPageUrl(page - 1)}
              className="rounded border border-gray-300 px-3 py-1 text-sm transition-colors hover:bg-gray-50"
            >
              Previous
            </Link>
          )}

          <span className="px-3 py-1 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>

          {page < totalPages && (
            <Link
              href={buildPageUrl(page + 1)}
              className="rounded border border-gray-300 px-3 py-1 text-sm transition-colors hover:bg-gray-50"
            >
              Next
            </Link>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editingQuestion && (
        <QuestionEditor
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
        />
      )}
    </div>
  );
}
