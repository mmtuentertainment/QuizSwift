'use client';

/**
 * Quiz Detail Client Component
 *
 * Interactive client component for the quiz detail page:
 * - Displays quiz metadata and status
 * - Lists all questions with edit buttons
 * - Handles publish/unpublish with CONT-06 preview requirement
 * - Opens QuestionEditor modal for editing
 */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { publishQuiz, unpublishQuiz } from '@/actions/quiz';
import { QuestionEditor } from '@/components/questions/question-editor';
import { MathText } from '@/components/quiz/math-display';
import type { QuestionOptions } from '@/lib/questions/types';

interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: string;
  correctAnswer: string;
  explanation: string;
  sourceEvidence: string;
  options: unknown;
  bloomLevel: string;
  difficulty: string;
  position: number;
  points: number;
  imageUrl: string | null;
  imageAltText: string | null;
}

interface QuizData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  teacherPreviewedAt: string | null;
  publishedAt: string | null;
  timeLimit: number | null;
  shuffleQuestions: boolean;
  showResults: string;
}

interface QuizDetailClientProps {
  quiz: QuizData;
  questions: QuizQuestion[];
  documentId: string;
}

export function QuizDetailClient({
  quiz,
  questions,
  documentId,
}: QuizDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [localQuestions, setLocalQuestions] = useState(questions);

  const isPreviewed = quiz.teacherPreviewedAt !== null;
  const isPublished = quiz.status === 'published';
  const canPublish = isPreviewed && !isPublished;

  const handlePublish = () => {
    setError(null);
    startTransition(async () => {
      const result = await publishQuiz(quiz.id);
      if (!result.success) {
        setError(result.error || 'Failed to publish quiz');
      } else {
        router.refresh();
      }
    });
  };

  const handleUnpublish = () => {
    setError(null);
    startTransition(async () => {
      const result = await unpublishQuiz(quiz.id);
      if (!result.success) {
        setError(result.error || 'Failed to unpublish quiz');
      } else {
        router.refresh();
      }
    });
  };

  const handleQuestionSave = (updatedQuestion: {
    id: string;
    questionText: string;
    questionType: string;
    correctAnswer: string;
    explanation: string;
    sourceEvidence: string;
    options: QuestionOptions | null;
    bloomLevel: string;
    difficulty: string;
    imageUrl?: string | null;
    imageAltText?: string | null;
  }) => {
    // Update local state with saved question, preserving image metadata
    setLocalQuestions((prev) =>
      prev.map((q) =>
        q.id === updatedQuestion.id
          ? {
              ...q,
              ...updatedQuestion,
              // Preserve existing image data if not provided in update
              imageUrl: updatedQuestion.imageUrl ?? q.imageUrl,
              imageAltText: updatedQuestion.imageAltText ?? q.imageAltText,
            }
          : q
      )
    );
  };

  // Status badge color
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    preview_required: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-red-100 text-red-700',
  };

  return (
    <>
      {/* Quiz Header */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[quiz.status] || statusColors.draft}`}
              >
                {quiz.status.replace(/_/g, ' ')}
              </span>
            </div>
            {quiz.description && (
              <p className="mt-2 text-gray-600">{quiz.description}</p>
            )}

            {/* Quiz settings summary */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
              <span>{localQuestions.length} questions</span>
              {quiz.timeLimit && <span>{quiz.timeLimit} min time limit</span>}
              {quiz.shuffleQuestions && <span>Questions shuffled</span>}
              <span>Results: {quiz.showResults.replace(/_/g, ' ')}</span>
            </div>

            {/* Preview status */}
            <div className="mt-4">
              {isPreviewed ? (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>
                    Previewed on{' '}
                    {new Date(quiz.teacherPreviewedAt!).toLocaleDateString()}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-yellow-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Preview required before publishing</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Link
              href={`/documents/${documentId}/quiz/${quiz.id}/preview`}
              className="rounded-lg border border-blue-600 bg-white px-4 py-2 text-center text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              {isPreviewed ? 'Preview Again' : 'Start Preview'}
            </Link>

            <Link
              href={`/documents/${documentId}/quiz/${quiz.id}/edit`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit Settings
            </Link>

            {isPublished ? (
              <button
                onClick={handleUnpublish}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-400"
              >
                {isPending ? 'Working...' : 'Unpublish'}
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={isPending || !canPublish}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
                title={!isPreviewed ? 'Preview required before publishing' : undefined}
              >
                {isPending ? 'Publishing...' : 'Publish Quiz'}
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Published info */}
        {isPublished && quiz.publishedAt && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-800">
              Published on {new Date(quiz.publishedAt).toLocaleDateString()} at{' '}
              {new Date(quiz.publishedAt).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
          <span className="text-sm text-gray-500">
            Total points: {localQuestions.reduce((sum, q) => sum + q.points, 0)}
          </span>
        </div>

        {localQuestions.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No questions in this quiz yet.</p>
          </div>
        ) : (
          localQuestions.map((question, index) => (
            <div
              key={question.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Question header */}
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                      {index + 1}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      {question.questionType.replace(/_/g, ' ')}
                    </span>
                    <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                      {question.bloomLevel}
                    </span>
                    <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                      {question.difficulty}
                    </span>
                    <span className="text-xs text-gray-500">
                      {question.points} {question.points === 1 ? 'pt' : 'pts'}
                    </span>
                  </div>

                  {/* Question text */}
                  <div className="mt-2 text-gray-900">
                    <MathText>
                      {question.questionText.length > 200
                        ? question.questionText.substring(0, 200) + '...'
                        : question.questionText}
                    </MathText>
                  </div>

                  {/* Correct answer preview */}
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="font-medium">Answer:</span>{' '}
                    {question.correctAnswer.length > 100
                      ? question.correctAnswer.substring(0, 100) + '...'
                      : question.correctAnswer}
                  </div>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => setEditingQuestion(question)}
                  className="ml-4 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Question Editor Modal */}
      {editingQuestion && (
        <QuestionEditor
          question={{
            ...editingQuestion,
            options: editingQuestion.options as QuestionOptions | null,
          }}
          isOpen={true}
          onClose={() => setEditingQuestion(null)}
          onSave={handleQuestionSave}
        />
      )}
    </>
  );
}
