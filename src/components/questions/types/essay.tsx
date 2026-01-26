'use client';

import { useMemo } from 'react';

/**
 * Options structure for essay/short answer questions.
 * Matches the shape stored in CuratedQuestion.options JSON field.
 */
export interface EssayOptions {
  minWords?: number;
  maxWords?: number;
  rubric?: string;
  guidelines?: string;
}

interface EssayProps {
  /** Essay options with word limits and rubric */
  options?: EssayOptions;
  /** Current text value */
  text: string;
  /** Callback when text changes */
  onTextChange: (text: string) => void;
  /** Whether the component is read-only (for review mode) */
  readOnly?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum rows for textarea */
  minRows?: number;
}

/**
 * Renders an essay/short answer question with textarea and word count.
 * Shows min/max word requirements and validates against them.
 *
 * Usage:
 * - Quiz taking: readOnly=false
 * - Quiz review: readOnly=true
 * - Teacher preview: readOnly=true
 */
export function Essay({
  options,
  text,
  onTextChange,
  readOnly = false,
  placeholder = 'Enter your answer here...',
  minRows = 6,
}: EssayProps) {
  const minWords = options?.minWords;
  const maxWords = options?.maxWords;
  const rubric = options?.rubric;
  const guidelines = options?.guidelines;

  /**
   * Calculate word count from text.
   * Handles multiple spaces, newlines, and trims.
   */
  const wordCount = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [text]);

  /**
   * Determine if word count is within acceptable range.
   */
  const wordCountStatus = useMemo(() => {
    if (minWords && wordCount < minWords) {
      return 'under';
    }
    if (maxWords && wordCount > maxWords) {
      return 'over';
    }
    return 'ok';
  }, [wordCount, minWords, maxWords]);

  /**
   * Get word count indicator styling and message.
   */
  const wordCountIndicator = useMemo(() => {
    if (wordCountStatus === 'under' && minWords) {
      return {
        color: 'text-yellow-600',
        message: `${minWords - wordCount} more words needed`,
      };
    }
    if (wordCountStatus === 'over' && maxWords) {
      return {
        color: 'text-red-600',
        message: `${wordCount - maxWords} words over limit`,
      };
    }
    return {
      color: 'text-gray-500',
      message: null,
    };
  }, [wordCountStatus, wordCount, minWords, maxWords]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    onTextChange(e.target.value);
  };

  return (
    <div className="space-y-3">
      {/* Guidelines if provided */}
      {guidelines && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-medium text-gray-700">Guidelines:</p>
          <p className="mt-1 text-sm text-gray-600">{guidelines}</p>
        </div>
      )}

      {/* Word limits display */}
      {(minWords || maxWords) && (
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {minWords && (
            <span>
              Minimum: <span className="font-medium">{minWords}</span> words
            </span>
          )}
          {maxWords && (
            <span>
              Maximum: <span className="font-medium">{maxWords}</span> words
            </span>
          )}
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={text}
          onChange={handleChange}
          disabled={readOnly}
          placeholder={placeholder}
          rows={minRows}
          aria-label="Essay answer"
          aria-describedby="word-count"
          className={`
            w-full resize-y rounded-lg border p-4
            transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${readOnly ? 'cursor-default bg-gray-50' : 'bg-white'}
            ${
              wordCountStatus === 'over'
                ? 'border-red-300'
                : wordCountStatus === 'under' && wordCount > 0
                ? 'border-yellow-300'
                : 'border-gray-300 focus:border-blue-500'
            }
          `}
        />

        {/* Word count indicator */}
        <div
          id="word-count"
          className={`
            mt-2 flex items-center justify-between text-sm
          `}
        >
          <span className={wordCountIndicator.color}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
            {wordCountIndicator.message && (
              <span className="ml-2">({wordCountIndicator.message})</span>
            )}
          </span>

          {/* Character count */}
          <span className="text-gray-400">
            {text.length} characters
          </span>
        </div>
      </div>

      {/* Rubric display (for transparency or review) */}
      {rubric && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-purple-900">
              <svg
                className="h-4 w-4 transition-transform group-open:rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Grading Rubric
            </summary>
            <div className="mt-3 whitespace-pre-wrap text-sm text-purple-800">
              {rubric}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
