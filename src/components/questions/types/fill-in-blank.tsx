'use client';

import { useCallback } from 'react';
import { MathText } from '@/components/quiz/math-display';

/**
 * Options structure for fill-in-the-blank questions.
 * Matches the shape stored in CuratedQuestion.options JSON field.
 */
export interface FillInBlankOptions {
  blanks: Array<{
    id: string;
    correctAnswer: string;
    acceptableVariants?: string[];
    caseSensitive?: boolean;
  }>;
}

interface FillInBlankProps {
  /** Question text containing [BLANK] markers */
  questionText: string;
  /** Fill-in-blank options with correct answers */
  options: FillInBlankOptions;
  /** Current answers array (one per blank) */
  answers: string[];
  /** Callback when answers change */
  onAnswer: (answers: string[]) => void;
  /** Whether the component is read-only (for review mode) */
  readOnly?: boolean;
  /** Whether to show correct/incorrect indicators */
  showCorrect?: boolean;
}

/**
 * Renders a fill-in-the-blank question with inline input fields.
 * Parses [BLANK] markers in the question text and replaces them with inputs.
 * Supports LaTeX in question text via MathText component.
 *
 * Usage:
 * - Quiz taking: readOnly=false, showCorrect=false
 * - Quiz review: readOnly=true, showCorrect=true
 * - Teacher preview: readOnly=true, showCorrect=true
 */
export function FillInBlank({
  questionText,
  options,
  answers,
  onAnswer,
  readOnly = false,
  showCorrect = false,
}: FillInBlankProps) {
  /**
   * Check if an answer is correct for a given blank.
   * Handles case sensitivity and acceptable variants.
   */
  const isAnswerCorrect = useCallback(
    (blankIndex: number, answer: string): boolean => {
      if (blankIndex >= options.blanks.length) return false;
      const blank = options.blanks[blankIndex];

      const normalize = (str: string) =>
        blank.caseSensitive ? str.trim() : str.trim().toLowerCase();

      const normalizedAnswer = normalize(answer);
      const normalizedCorrect = normalize(blank.correctAnswer);

      if (normalizedAnswer === normalizedCorrect) return true;

      // Check acceptable variants
      if (blank.acceptableVariants) {
        return blank.acceptableVariants.some(
          (variant) => normalize(variant) === normalizedAnswer
        );
      }

      return false;
    },
    [options.blanks]
  );

  /**
   * Handle input change for a specific blank.
   */
  const handleInputChange = (blankIndex: number, value: string) => {
    if (readOnly) return;
    const newAnswers = [...answers];
    newAnswers[blankIndex] = value;
    onAnswer(newAnswers);
  };

  // Split question text by [BLANK] markers
  const parts = questionText.split(/\[BLANK\]/gi);

  // Ensure answers array has correct length
  const normalizedAnswers = options.blanks.map((_, i) => answers[i] || '');

  return (
    <div className="space-y-4">
      {/* Question text with inline blanks */}
      <div className="leading-relaxed">
        {parts.map((part, partIndex) => {
          const blankIndex = partIndex;
          const isLastPart = partIndex === parts.length - 1;
          const hasBlankAfter = !isLastPart;

          // Get blank info for this position
          const blank = hasBlankAfter ? options.blanks[blankIndex] : null;
          const answer = hasBlankAfter ? normalizedAnswers[blankIndex] : '';
          const isCorrect = hasBlankAfter && answer ? isAnswerCorrect(blankIndex, answer) : null;

          return (
            <span key={partIndex} className="align-middle">
              {/* Render text part with LaTeX support */}
              {part && <MathText>{part}</MathText>}

              {/* Render blank input if not the last part */}
              {hasBlankAfter && blank && (
                <span className="relative mx-1 inline-block align-middle">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => handleInputChange(blankIndex, e.target.value)}
                    disabled={readOnly}
                    aria-label={`Blank ${blankIndex + 1}`}
                    className={`
                      inline-block w-32 border-b-2 bg-transparent px-2 py-1 text-center
                      transition-colors focus:outline-none focus:ring-0
                      ${readOnly ? 'cursor-default' : ''}
                      ${
                        showCorrect && answer
                          ? isCorrect
                            ? 'border-green-500 text-green-700'
                            : 'border-red-500 text-red-700'
                          : 'border-gray-400 text-gray-900 focus:border-blue-500'
                      }
                    `}
                    placeholder={readOnly && showCorrect ? blank.correctAnswer : ''}
                  />

                  {/* Correct/Incorrect indicator */}
                  {showCorrect && answer && (
                    <span
                      className={`
                        absolute -right-5 top-1/2 -translate-y-1/2
                        ${isCorrect ? 'text-green-600' : 'text-red-600'}
                      `}
                    >
                      {isCorrect ? (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-label="Correct"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-label="Incorrect"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                    </span>
                  )}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Show correct answers in review mode */}
      {showCorrect && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="mb-2 text-sm font-medium text-blue-900">Correct Answers:</p>
          <ul className="space-y-1">
            {options.blanks.map((blank, index) => {
              const userAnswer = normalizedAnswers[index];
              const correct = isAnswerCorrect(index, userAnswer);

              return (
                <li key={blank.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-blue-800">Blank {index + 1}:</span>
                  <span className="text-blue-700">{blank.correctAnswer}</span>
                  {userAnswer && (
                    <span className={correct ? 'text-green-600' : 'text-red-600'}>
                      (You answered: {userAnswer})
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
