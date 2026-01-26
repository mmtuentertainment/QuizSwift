'use client';

/**
 * Options structure for true/false questions.
 * Matches the shape stored in CuratedQuestion.options JSON field.
 */
export interface TrueFalseOptions {
  correctAnswer: boolean;
  justification?: string;
}

interface TrueFalseProps {
  /** True/false options with correctAnswer and optional justification */
  options: TrueFalseOptions;
  /** Currently selected answer (true, false, or null for no selection) */
  selectedAnswer: boolean | null;
  /** Callback when an answer is selected */
  onSelect: (answer: boolean) => void;
  /** Whether the component is read-only (for review mode) */
  readOnly?: boolean;
  /** Whether to show correct/incorrect indicators */
  showCorrect?: boolean;
}

/**
 * Renders a true/false question with binary choice buttons.
 *
 * Usage:
 * - Quiz taking: readOnly=false, showCorrect=false
 * - Quiz review: readOnly=true, showCorrect=true
 * - Teacher preview: readOnly=true, showCorrect=true
 */
export function TrueFalse({
  options,
  selectedAnswer,
  onSelect,
  readOnly = false,
  showCorrect = false,
}: TrueFalseProps) {
  const handleSelect = (answer: boolean) => {
    if (readOnly) return;
    onSelect(answer);
  };

  const handleKeyDown = (e: React.KeyboardEvent, answer: boolean) => {
    if (readOnly) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(answer);
    }
  };

  const renderOption = (value: boolean, label: string) => {
    const isSelected = selectedAnswer === value;
    const isCorrectAnswer = options.correctAnswer === value;
    const showCorrectIndicator = showCorrect && isCorrectAnswer;
    const showIncorrectIndicator = showCorrect && isSelected && !isCorrectAnswer;

    // Determine styling based on state
    let borderClass = 'border-gray-200';
    let bgClass = 'bg-white hover:bg-gray-50';
    let textClass = 'text-gray-700';

    if (isSelected && !showCorrect) {
      borderClass = 'border-blue-500';
      bgClass = 'bg-blue-50';
      textClass = 'text-blue-700';
    } else if (showCorrectIndicator) {
      borderClass = 'border-green-500';
      bgClass = 'bg-green-50';
      textClass = 'text-green-700';
    } else if (showIncorrectIndicator) {
      borderClass = 'border-red-500';
      bgClass = 'bg-red-50';
      textClass = 'text-red-700';
    }

    if (readOnly) {
      bgClass = bgClass.replace('hover:bg-gray-50', '');
    }

    return (
      <div
        role="radio"
        aria-checked={isSelected}
        aria-disabled={readOnly}
        tabIndex={readOnly ? -1 : 0}
        onClick={() => handleSelect(value)}
        onKeyDown={(e) => handleKeyDown(e, value)}
        className={`
          flex flex-1 items-center justify-center gap-3 rounded-lg border-2 p-4 transition-all
          ${borderClass} ${bgClass}
          ${readOnly ? 'cursor-default' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
      >
        {/* Radio indicator */}
        <div
          className={`
            flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2
            ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'}
          `}
        >
          {isSelected && (
            <div className="h-2 w-2 rounded-full bg-white" />
          )}
        </div>

        {/* Label */}
        <span className={`text-lg font-semibold ${textClass}`}>
          {label}
        </span>

        {/* Correct/Incorrect indicator */}
        {showCorrectIndicator && (
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-green-600">
            <svg
              className="h-4 w-4"
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
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-red-600">
            <svg
              className="h-4 w-4"
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
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-4" role="radiogroup" aria-label="True or False">
        {renderOption(true, 'True')}
        {renderOption(false, 'False')}
      </div>

      {/* Show justification in review mode */}
      {showCorrect && options.justification && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-medium text-blue-900">Justification:</p>
          <p className="mt-1 text-sm text-blue-800">{options.justification}</p>
        </div>
      )}
    </div>
  );
}
