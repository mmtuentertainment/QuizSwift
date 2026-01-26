'use client';

import { MathText } from '@/components/quiz/math-display';

/**
 * Options structure for multiple choice questions.
 * Matches the shape stored in CuratedQuestion.options JSON field.
 */
export interface MultipleChoiceOptions {
  choices: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
}

interface MultipleChoiceProps {
  /** Multiple choice options with id, text, and correctness */
  options: MultipleChoiceOptions;
  /** Currently selected choice ID */
  selectedId: string | null;
  /** Callback when a choice is selected */
  onSelect: (choiceId: string) => void;
  /** Whether the component is read-only (for review mode) */
  readOnly?: boolean;
  /** Whether to show correct/incorrect indicators */
  showCorrect?: boolean;
}

/**
 * Renders a multiple choice question with selectable options.
 * Supports LaTeX in choice text via MathText component.
 *
 * Usage:
 * - Quiz taking: readOnly=false, showCorrect=false
 * - Quiz review: readOnly=true, showCorrect=true
 * - Teacher preview: readOnly=true, showCorrect=true
 */
export function MultipleChoice({
  options,
  selectedId,
  onSelect,
  readOnly = false,
  showCorrect = false,
}: MultipleChoiceProps) {
  // Generate A, B, C, D... labels
  const getLabel = (index: number): string => {
    return String.fromCharCode(65 + index); // A=65, B=66, etc.
  };

  const handleSelect = (choiceId: string) => {
    if (readOnly) return;
    onSelect(choiceId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, choiceId: string) => {
    if (readOnly) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(choiceId);
    }
  };

  return (
    <div className="space-y-3" role="radiogroup" aria-label="Multiple choice options">
      {options.choices.map((choice, index) => {
        const isSelected = selectedId === choice.id;
        const isCorrectChoice = choice.isCorrect;
        const showCorrectIndicator = showCorrect && isCorrectChoice;
        const showIncorrectIndicator = showCorrect && isSelected && !isCorrectChoice;

        // Determine border and background colors based on state
        let borderClass = 'border-gray-200';
        let bgClass = 'bg-white hover:bg-gray-50';

        if (isSelected && !showCorrect) {
          borderClass = 'border-blue-500';
          bgClass = 'bg-blue-50';
        } else if (showCorrectIndicator) {
          borderClass = 'border-green-500';
          bgClass = 'bg-green-50';
        } else if (showIncorrectIndicator) {
          borderClass = 'border-red-500';
          bgClass = 'bg-red-50';
        }

        if (readOnly) {
          bgClass = bgClass.replace('hover:bg-gray-50', '');
        }

        return (
          <div
            key={choice.id}
            role="radio"
            aria-checked={isSelected}
            aria-disabled={readOnly}
            tabIndex={readOnly ? -1 : 0}
            onClick={() => handleSelect(choice.id)}
            onKeyDown={(e) => handleKeyDown(e, choice.id)}
            className={`
              flex items-start gap-3 rounded-lg border-2 p-4 transition-all
              ${borderClass} ${bgClass}
              ${readOnly ? 'cursor-default' : 'cursor-pointer'}
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            `}
          >
            {/* Radio indicator */}
            <div
              className={`
                flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2
                ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'}
              `}
            >
              {isSelected && (
                <div className="h-2.5 w-2.5 rounded-full bg-white" />
              )}
            </div>

            {/* Label */}
            <span
              className={`
                flex h-6 w-6 flex-shrink-0 items-center justify-center rounded
                text-sm font-semibold
                ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}
              `}
            >
              {getLabel(index)}
            </span>

            {/* Choice text with LaTeX support */}
            <div className="flex-1 pt-0.5">
              <MathText>{choice.text}</MathText>
            </div>

            {/* Correct/Incorrect indicator */}
            {showCorrectIndicator && (
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-green-600">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-label="Correct answer"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
            )}
            {showIncorrectIndicator && (
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-red-600">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-label="Incorrect selection"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
