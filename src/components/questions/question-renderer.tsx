'use client';

import Image from 'next/image';
import { MultipleChoice } from './types/multiple-choice';
import { TrueFalse } from './types/true-false';
import { FillInBlank } from './types/fill-in-blank';
import { Essay } from './types/essay';
import { Matching } from './types/matching';
import { ShowYourWork, type ShowYourWorkData } from '@/components/quiz/show-your-work';
import { MathText } from '@/components/quiz/math-display';
import type {
  QuestionOptions,
  MatchingAnswer,
} from '@/lib/questions/types';

// Import type guards
import {
  isMultipleChoiceOptions as isMC,
  isTrueFalseOptions as isTF,
  isFillInBlankOptions as isFIB,
  isMatchingOptions as isMatch,
  isEssayOptions as isEss,
  isShowWorkOptions as isSW,
} from '@/lib/questions/types';

/**
 * Union type for all answer data structures used by the QuestionRenderer.
 * This is what gets stored when a student answers a question.
 *
 * Named RendererAnswerData to avoid collision with lib/questions/types.ts AnswerData.
 */
export type RendererAnswerData =
  | { type: 'multiple_choice'; selectedId: string | null }
  | { type: 'true_false'; selectedAnswer: boolean | null }
  | { type: 'fill_in_blank'; answers: string[] }
  | { type: 'essay' | 'short_answer'; text: string }
  | { type: 'show_work'; data: ShowYourWorkData }
  | { type: 'matching'; pairs: MatchingAnswer['pairs'] };

/**
 * Supported question types.
 * Maps to CuratedQuestion.questionType field.
 */
export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'true_false_justify'
  | 'fill_in_blank'
  | 'fill_blank'
  | 'essay'
  | 'short_answer'
  | 'show_work'
  | 'matching';

interface QuestionRendererProps {
  /** Question text (may contain LaTeX) */
  questionText: string;
  /** Type of question */
  questionType: QuestionType | string;
  /** Question-specific options (choices, blanks, rubric, etc.) */
  options: QuestionOptions | null;
  /** Current answer data */
  answer: RendererAnswerData | null;
  /** Callback when answer changes */
  onAnswer: (answer: RendererAnswerData) => void;
  /** Whether the component is read-only (for review mode) */
  readOnly?: boolean;
  /** Whether to show correct/incorrect indicators */
  showCorrect?: boolean;
  /** Correct answer for display in review mode */
  correctAnswer?: string;
  /** Optional image URL for the question */
  imageUrl?: string | null;
  /** Alt text for the question image */
  imageAltText?: string | null;
}

/**
 * Dispatcher component that renders the appropriate question type component.
 * Routes based on questionType to handle all supported question formats.
 *
 * Supports:
 * - multiple_choice: Radio selection from options
 * - true_false / true_false_justify: Binary True/False selection
 * - fill_in_blank / fill_blank: Inline text inputs
 * - essay / short_answer: Textarea with word count
 * - show_work: Canvas for math work + final answer
 * - matching: Drag and drop matching pairs
 */
export function QuestionRenderer({
  questionText,
  questionType,
  options,
  answer,
  onAnswer,
  readOnly = false,
  showCorrect = false,
  correctAnswer,
  imageUrl,
  imageAltText,
}: QuestionRendererProps) {
  /**
   * Helper to get typed answer data or return null.
   */
  const getTypedAnswer = <T extends RendererAnswerData['type']>(
    type: T
  ): Extract<RendererAnswerData, { type: T }> | null => {
    if (answer && answer.type === type) {
      return answer as Extract<RendererAnswerData, { type: T }>;
    }
    return null;
  };

  /**
   * Render the question input based on type.
   */
  const renderQuestionInput = () => {
    switch (questionType) {
      case 'multiple_choice': {
        // Check if options match MultipleChoiceOptions structure
        if (!options || !isMC(options)) {
          return (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
              No options available for this question.
            </div>
          );
        }

        const mcAnswer = getTypedAnswer('multiple_choice');

        return (
          <MultipleChoice
            options={{
              choices: options.choices.map((c) => ({
                id: c.id,
                text: c.text,
                isCorrect: c.isCorrect,
              })),
            }}
            selectedId={mcAnswer?.selectedId ?? null}
            onSelect={(choiceId) =>
              onAnswer({ type: 'multiple_choice', selectedId: choiceId })
            }
            readOnly={readOnly}
            showCorrect={showCorrect}
          />
        );
      }

      case 'true_false':
      case 'true_false_justify': {
        const tfAnswer = getTypedAnswer('true_false');

        // Try to get options, or derive from correctAnswer
        let correctBool = false;
        if (options && isTF(options)) {
          correctBool = options.correctAnswer;
        } else if (correctAnswer) {
          correctBool = correctAnswer.toLowerCase() === 'true';
        }

        // Get justification from options if available (TrueFalseOptions has optional justification)
        const justification = (options && isTF(options))
          ? options.justification
          : undefined;

        return (
          <TrueFalse
            options={{
              correctAnswer: correctBool,
              justification,
            }}
            selectedAnswer={tfAnswer?.selectedAnswer ?? null}
            onSelect={(value) =>
              onAnswer({ type: 'true_false', selectedAnswer: value })
            }
            readOnly={readOnly}
            showCorrect={showCorrect}
          />
        );
      }

      case 'fill_in_blank':
      case 'fill_blank': {
        const fibAnswer = getTypedAnswer('fill_in_blank');

        // Convert FillInBlankOptions to component format
        let blanksConfig: Array<{
          id: string;
          correctAnswer: string;
          acceptableVariants?: string[];
          caseSensitive?: boolean;
        }> = [];

        if (options && isFIB(options)) {
          blanksConfig = options.blanks.map((b, idx) => ({
            id: String(idx),
            correctAnswer: b.acceptedAnswers[0] || '',
            acceptableVariants: b.acceptedAnswers.slice(1),
            caseSensitive: b.caseSensitive,
          }));
        } else if (correctAnswer) {
          // Single blank from correctAnswer
          blanksConfig = [{ id: '0', correctAnswer }];
        }

        return (
          <FillInBlank
            questionText={questionText}
            options={{ blanks: blanksConfig }}
            answers={fibAnswer?.answers ?? []}
            onAnswer={(answers) =>
              onAnswer({ type: 'fill_in_blank', answers })
            }
            readOnly={readOnly}
            showCorrect={showCorrect}
          />
        );
      }

      case 'essay':
      case 'short_answer': {
        // Get answer text - both essay and short_answer share the same shape
        let answerText = '';
        if (answer && (answer.type === 'essay' || answer.type === 'short_answer')) {
          answerText = answer.text;
        }

        // Get essay options if available
        let essayConfig: {
          minWords?: number;
          maxWords?: number;
          rubric?: string;
          guidelines?: string;
        } = {};

        if (options && isEss(options)) {
          essayConfig = {
            minWords: options.minWords,
            maxWords: options.maxWords,
            rubric: options.rubric,
            guidelines: options.guidelines,
          };
        }

        return (
          <Essay
            options={essayConfig}
            text={answerText}
            onTextChange={(text) =>
              onAnswer({ type: questionType as 'essay' | 'short_answer', text })
            }
            readOnly={readOnly}
            placeholder={
              questionType === 'short_answer'
                ? 'Enter your short answer...'
                : 'Enter your essay response...'
            }
            minRows={questionType === 'short_answer' ? 3 : 6}
          />
        );
      }

      case 'show_work': {
        const swAnswer = getTypedAnswer('show_work');

        // Get working steps from options
        let workingSteps: string[] | undefined;
        if (options && isSW(options)) {
          workingSteps = options.workingSteps;
        }

        return (
          <ShowYourWork
            questionText={questionText}
            workingSteps={workingSteps}
            onSubmit={(data) => onAnswer({ type: 'show_work', data })}
            readOnly={readOnly}
            initialCanvasState={swAnswer?.data?.canvasState ?? undefined}
            initialAnswer={swAnswer?.data?.finalAnswer ?? ''}
          />
        );
      }

      case 'matching': {
        if (!options || !isMatch(options)) {
          return (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
              No matching pairs available for this question.
            </div>
          );
        }

        const matchAnswer = getTypedAnswer('matching');

        return (
          <Matching
            options={options}
            answer={matchAnswer ? { type: 'matching', pairs: matchAnswer.pairs } : null}
            onAnswer={(matchingAnswer) =>
              onAnswer({ type: 'matching', pairs: matchingAnswer.pairs })
            }
            readOnly={readOnly}
            showCorrect={showCorrect}
          />
        );
      }

      default: {
        return (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            <p className="font-medium">Unknown Question Type</p>
            <p className="mt-1 text-sm">
              Question type &quot;{questionType}&quot; is not supported.
            </p>
          </div>
        );
      }
    }
  };

  // For fill-in-blank and show_work, the question text is rendered within the component
  const shouldRenderQuestionText =
    questionType !== 'fill_in_blank' &&
    questionType !== 'fill_blank' &&
    questionType !== 'show_work';

  // Build image URL - if it's a storage key, prepend the public URL
  // Guard: if R2 URL not configured and imageUrl is a storage key, return null
  const resolvedImageUrl = imageUrl
    ? imageUrl.startsWith('http')
      ? imageUrl
      : process.env.NEXT_PUBLIC_R2_URL
        ? `${process.env.NEXT_PUBLIC_R2_URL}/${imageUrl}`
        : null
    : null;

  return (
    <div className="space-y-4">
      {/* Question image (if present) */}
      {resolvedImageUrl && (
        <div className="relative mb-4 h-64 w-full">
          <Image
            src={resolvedImageUrl}
            alt={imageAltText || 'Question image'}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="rounded border border-gray-200 object-contain"
          />
        </div>
      )}

      {/* Question text with LaTeX support */}
      {shouldRenderQuestionText && (
        <div className="text-lg">
          <MathText>{questionText}</MathText>
        </div>
      )}

      {/* Question-type-specific input */}
      {renderQuestionInput()}

      {/* Show correct answer in review mode (for essay/short answer types) */}
      {showCorrect &&
        correctAnswer &&
        (questionType === 'essay' || questionType === 'short_answer') && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-sm font-medium text-green-900">Correct Answer:</p>
            <div className="mt-1 text-green-800">
              <MathText>{correctAnswer}</MathText>
            </div>
          </div>
        )}
    </div>
  );
}
