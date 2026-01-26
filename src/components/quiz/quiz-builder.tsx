'use client';

import { useState } from 'react';
import { createQuiz } from '@/actions/quiz';
import type { CuratedQuestion } from '@/generated/prisma/client';

interface QuizBuilderProps {
  documentId: string;
  availableQuestions: CuratedQuestion[];
}

export function QuizBuilder({ documentId, availableQuestions }: QuizBuilderProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(availableQuestions.map((q) => q.id))
  );
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setError('Please select at least one question');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a quiz title');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set('documentId', documentId);
    formData.set('title', title);
    formData.set('description', description);
    formData.set('questionIds', JSON.stringify(Array.from(selectedIds)));
    if (timeLimit) {
      formData.set('timeLimit', timeLimit.toString());
    }
    formData.set('shuffleQuestions', shuffleQuestions.toString());

    const result = await createQuiz(formData);

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
    // On success, createQuiz redirects to quiz detail page
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded bg-red-100 p-3 text-red-700">{error}</div>
      )}

      {/* Quiz details */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-4 text-lg font-medium">Quiz Details</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              placeholder="Chapter 5 Quiz"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              rows={2}
              placeholder="Optional description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Time Limit (minutes)
              </label>
              <input
                type="number"
                value={timeLimit ?? ''}
                onChange={(e) =>
                  setTimeLimit(e.target.value ? parseInt(e.target.value) : null)
                }
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                min={1}
                max={300}
                placeholder="No limit"
              />
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id="shuffle"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="mr-2 h-4 w-4"
              />
              <label htmlFor="shuffle" className="text-sm text-gray-700">
                Shuffle question order
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Question selection */}
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Questions</h2>
          <span className="text-sm text-gray-600">
            {selectedIds.size} of {availableQuestions.length} selected
          </span>
        </div>

        <div className="space-y-2">
          {availableQuestions.map((question, idx) => (
            <div
              key={question.id}
              className={`rounded border p-3 ${
                selectedIds.has(question.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(question.id)}
                  onChange={() => toggleQuestion(question.id)}
                  className="mt-1 h-4 w-4"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">
                      Q{idx + 1}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {question.questionType.replace('_', ' ')}
                    </span>
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">
                      {question.bloomLevel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-800">
                    {question.questionText.slice(0, 150)}
                    {question.questionText.length > 150 ? '...' : ''}
                  </p>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <a
          href={`/documents/${documentId}`}
          className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isSubmitting || selectedIds.size === 0}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isSubmitting ? 'Creating...' : 'Create Quiz'}
        </button>
      </div>
    </form>
  );
}
