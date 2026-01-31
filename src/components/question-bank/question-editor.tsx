'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { CuratedQuestion } from '@/generated/prisma/client';
import { updateQuestion } from '@/actions/questions';

interface QuestionEditorProps {
  question: CuratedQuestion;
  onClose: () => void;
}

/**
 * Modal editor for curated questions.
 * Allows teachers to edit question text, correct answer, and explanation.
 *
 * For best UX, parent should provide key={question.id} to reset form state
 * when switching between questions.
 */
export function QuestionEditor({ question, onClose }: QuestionEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Initialize form data from question prop
  // State is tied to question.id - when it changes, form resets
  const [formData, setFormData] = useState({
    questionText: question.questionText,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
  });

  // Track which question the form data was initialized from
  const [initializedFor, setInitializedFor] = useState(question.id);

  // Reset form when question ID changes (e.g., different question opened)
  // This is the React 18+ pattern: sync state in render, not useEffect
  // Using a separate state variable avoids the refs-during-render lint error
  if (initializedFor !== question.id) {
    setInitializedFor(question.id);
    setFormData({
      questionText: question.questionText,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    });
  }

  // ESC key handler for modal dismiss (external system sync - valid useEffect use)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateQuestion(question.id, formData);

      if (result.success) {
        router.refresh();
        onClose();
      } else {
        setError(result.error || 'Failed to update question');
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-editor-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="question-editor-title" className="text-xl font-semibold">
            Edit Question
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Question metadata - read only */}
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded bg-gray-100 px-2 py-1">
            {question.questionType.replace(/_/g, ' ')}
          </span>
          <span className="rounded bg-purple-100 px-2 py-1 text-purple-700">
            {question.bloomLevel}
          </span>
          <span className="rounded bg-orange-100 px-2 py-1 text-orange-700">
            {question.difficulty}
          </span>
        </div>

        {error && <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="questionText" className="mb-1 block text-sm font-medium text-gray-700">Question Text</label>
            <textarea
              id="questionText"
              value={formData.questionText}
              onChange={(e) => setFormData((prev) => ({ ...prev, questionText: e.target.value }))}
              rows={4}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="correctAnswer" className="mb-1 block text-sm font-medium text-gray-700">Correct Answer</label>
            <textarea
              id="correctAnswer"
              value={formData.correctAnswer}
              onChange={(e) => setFormData((prev) => ({ ...prev, correctAnswer: e.target.value }))}
              rows={2}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="explanation" className="mb-1 block text-sm font-medium text-gray-700">Explanation</label>
            <textarea
              id="explanation"
              value={formData.explanation}
              onChange={(e) => setFormData((prev) => ({ ...prev, explanation: e.target.value }))}
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Source evidence - read only */}
          <div className="rounded bg-gray-50 p-3">
            <p className="mb-1 text-xs font-medium text-gray-500">Source Evidence</p>
            <p className="text-sm italic text-gray-700">&quot;{question.sourceEvidence}&quot;</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
