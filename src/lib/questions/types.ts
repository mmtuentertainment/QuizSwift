/**
 * TypeScript types for question options and answer data
 *
 * These types define the structure of the JSON fields stored in:
 * - CuratedQuestion.options (question configuration)
 * - QuestionAnswer.answerData (student responses)
 */

// =============================================================================
// Question Options (stored in CuratedQuestion.options)
// Discriminated union with 'type' field for runtime type checking
// =============================================================================

export interface MultipleChoiceOptions {
  type: 'multiple_choice';
  choices: Array<{
    id: string;         // e.g., "A", "B", "C", "D"
    text: string;       // Option text (may contain LaTeX)
    isCorrect: boolean;
  }>;
}

export interface TrueFalseOptions {
  type: 'true_false';
  correctAnswer: boolean;
}

export interface FillInBlankOptions {
  type: 'fill_in_blank';
  // Question text contains [BLANK] markers
  blanks: Array<{
    index: number;            // Position of blank (0-indexed)
    acceptedAnswers: string[]; // Multiple acceptable answers
    caseSensitive: boolean;
  }>;
}

export interface MatchingOptions {
  type: 'matching';
  pairs: Array<{
    id: string;
    left: string;   // Term/prompt
    right: string;  // Definition/match
  }>;
}

export interface EssayOptions {
  type: 'essay';
  minWords?: number;
  maxWords?: number;
  rubric?: string;  // Grading criteria
}

export interface ShowWorkOptions {
  type: 'show_work';
  workingSteps: string[];  // Already used in Phase 2.1
}

export type QuestionOptions =
  | MultipleChoiceOptions
  | TrueFalseOptions
  | FillInBlankOptions
  | MatchingOptions
  | EssayOptions
  | ShowWorkOptions;

// =============================================================================
// Answer Data (stored in QuestionAnswer.answerData)
// =============================================================================

export interface MCAnswer {
  selectedChoiceId: string;
}

export interface TFAnswer {
  answer: boolean;
}

export interface FillBlankAnswer {
  blanks: string[];
}

export interface MatchingAnswer {
  pairs: Array<{
    leftId: string;
    rightId: string;
  }>;
}

export interface EssayAnswer {
  text: string;
  wordCount: number;
}

export interface ShowWorkAnswer {
  finalAnswer: string;
  canvasState: object;
}

export type AnswerData =
  | MCAnswer
  | TFAnswer
  | FillBlankAnswer
  | MatchingAnswer
  | EssayAnswer
  | ShowWorkAnswer;

// =============================================================================
// Type Guards
// =============================================================================

export function isMultipleChoiceOptions(options: QuestionOptions): options is MultipleChoiceOptions {
  return options.type === 'multiple_choice';
}

export function isTrueFalseOptions(options: QuestionOptions): options is TrueFalseOptions {
  return options.type === 'true_false';
}

export function isFillInBlankOptions(options: QuestionOptions): options is FillInBlankOptions {
  return options.type === 'fill_in_blank';
}

export function isMatchingOptions(options: QuestionOptions): options is MatchingOptions {
  return options.type === 'matching';
}

export function isEssayOptions(options: QuestionOptions): options is EssayOptions {
  return options.type === 'essay';
}

export function isShowWorkOptions(options: QuestionOptions): options is ShowWorkOptions {
  return options.type === 'show_work';
}

// =============================================================================
// Legacy Aliases (backward compatibility with Phase 2.1 components)
// These will be removed when components are updated in Phase 4
// =============================================================================

/** @deprecated Use MultipleChoiceOptions instead */
export interface MultipleChoiceAnswer {
  selectedIds: string[];
}

/** @deprecated Use FillBlankAnswer instead */
export interface ShortAnswerOptions {
  maxLength?: number;
  placeholder?: string;
}

/** @deprecated Use FillBlankAnswer instead */
export interface ShortAnswerAnswer {
  text: string;
}

/** @deprecated Use TrueFalseOptions instead */
export interface TrueFalseJustifyOptions {
  statement: string;
}

/** @deprecated Use TFAnswer instead */
export interface TrueFalseJustifyAnswer {
  value: boolean;
  justification: string;
}

/** @deprecated Use FillInBlankOptions instead */
export interface FillBlankOptions {
  textWithBlanks: string;
  blankCount: number;
}

/** @deprecated Generic answer type for question renderer */
export type QuestionAnswer =
  | MatchingAnswer
  | MultipleChoiceAnswer
  | ShortAnswerAnswer
  | TrueFalseJustifyAnswer
  | { blanks: Record<string, string> }
  | ShowWorkAnswer;
