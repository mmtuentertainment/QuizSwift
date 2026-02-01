'use client';

/**
 * Quiz Settings Form Component
 *
 * Form for editing quiz settings with validation.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateQuizSettings } from '@/actions/quiz';
import type { ShowResultsOptionValue } from '@/lib/enums';
import { QUIZ_TIME_LIMIT } from '@/lib/questions/validation';

interface QuizSettingsFormProps {
  quiz: {
    id: string;
    title: string;
    description: string | null;
    timeLimit: number | null;
    shuffleQuestions: boolean;
    showResults: ShowResultsOptionValue;
  };
  documentId: string;
}

export function QuizSettingsForm({ quiz, documentId }: QuizSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description || '');
  const [timeLimit, setTimeLimit] = useState<string>(
    quiz.timeLimit ? String(quiz.timeLimit) : ''
  );
  const [shuffleQuestions, setShuffleQuestions] = useState(quiz.shuffleQuestions);
  const [showResults, setShowResults] = useState<ShowResultsOptionValue>(quiz.showResults);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const parsedTimeLimit = timeLimit ? parseInt(timeLimit, 10) : null;
    if (timeLimit && (isNaN(parsedTimeLimit!) || parsedTimeLimit! < QUIZ_TIME_LIMIT.MIN || parsedTimeLimit! > QUIZ_TIME_LIMIT.MAX)) {
      setError(`Time limit must be between ${QUIZ_TIME_LIMIT.MIN} and ${QUIZ_TIME_LIMIT.MAX} minutes`);
      return;
    }

    startTransition(async () => {
      const result = await updateQuizSettings(quiz.id, {
        title: title.trim(),
        description: description.trim() || null,
        timeLimit: parsedTimeLimit,
        shuffleQuestions,
        showResults,
      });

      if (!result.success) {
        setError(result.error || 'Failed to save settings');
        return;
      }

      // Navigate back to quiz detail
      router.push(`/documents/${documentId}/quiz/${quiz.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter quiz title..."
          maxLength={200}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Optional description for students..."
          maxLength={500}
        />
        <p className="text-xs text-gray-500">{description.length}/500 characters</p>
      </div>

      {/* Time Limit */}
      <div className="space-y-2">
        <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700">
          Time Limit (minutes)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            id="timeLimit"
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            min={QUIZ_TIME_LIMIT.MIN}
            max={QUIZ_TIME_LIMIT.MAX}
            className="w-32 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="None"
          />
          <span className="text-sm text-gray-500">
            Leave empty for no time limit
          </span>
        </div>
      </div>

      {/* Shuffle Questions */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="shuffleQuestions"
          checked={shuffleQuestions}
          onChange={(e) => setShuffleQuestions(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="shuffleQuestions" className="text-sm font-medium text-gray-700">
          Shuffle questions for each student
        </label>
      </div>

      {/* Show Results */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          When to show results to students
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="showResults"
              value="after_submit"
              checked={showResults === 'after_submit'}
              onChange={(e) => setShowResults(e.target.value as ShowResultsOptionValue)}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Immediately after submission
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="showResults"
              value="after_due"
              checked={showResults === 'after_due'}
              onChange={(e) => setShowResults(e.target.value as ShowResultsOptionValue)}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              After due date
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="showResults"
              value="manual"
              checked={showResults === 'manual'}
              onChange={(e) => setShowResults(e.target.value as ShowResultsOptionValue)}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Manual release only
            </span>
          </label>
        </div>
      </div>

      {/* Submit buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}
