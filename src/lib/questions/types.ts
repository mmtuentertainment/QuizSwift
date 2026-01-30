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
  justification?: string;
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
  guidelines?: string;  // Student-facing guidelines/instructions
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
// Canonical Question Types
// =============================================================================

/**
 * Canonical question types used throughout the application.
 * Legacy aliases (fill_blank, true_false_justify) are supported via grading.ts switch cases.
 */
export const CANONICAL_QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'fill_in_blank',
  'matching',
  'essay',
  'short_answer',
  'show_work',
] as const;

export type CanonicalQuestionType = (typeof CANONICAL_QUESTION_TYPES)[number];

/**
 * Normalize legacy question type aliases to canonical types.
 * Returns the input unchanged if already canonical or unrecognized.
 */
export function normalizeQuestionType(type: string): string {
  switch (type) {
    case 'fill_blank':
      return 'fill_in_blank';
    case 'true_false_justify':
      return 'true_false';
    default:
      return type;
  }
}

/**
 * Type guard to validate if a string is a valid canonical question type.
 * Use for runtime validation of untrusted input.
 */
export function isValidCanonicalQuestionType(type: string): type is CanonicalQuestionType {
  return (CANONICAL_QUESTION_TYPES as readonly string[]).includes(type);
}

// =============================================================================
// Answer Data (stored in QuestionAnswer.answerData)
// Discriminated union with 'type' field for runtime type checking
// Note: UI components use a different format (RendererAnswerData in question-renderer.tsx)
// =============================================================================

export interface MCAnswer {
  type: 'multiple_choice';
  selectedChoiceId: string;
}

export interface TFAnswer {
  type: 'true_false';
  answer: boolean;
}

export interface FillBlankAnswer {
  type: 'fill_in_blank';
  blanks: string[];
}

export interface MatchingAnswer {
  type: 'matching';
  pairs: Array<{
    leftId: string;
    rightId: string;
  }>;
}

export interface EssayAnswer {
  type: 'essay' | 'short_answer';
  text: string;
  wordCount: number;
}

export interface ShowWorkAnswer {
  type: 'show_work';
  finalAnswer: string;
  /**
   * Canvas state from tldraw editor.getSnapshot()
   * Type is `unknown` for JSON persistence compatibility - at runtime this is TLEditorSnapshot.
   * See: https://tldraw.dev/docs/persistence
   */
  canvasState: unknown;
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

// Answer Data type guards
export function isMCAnswer(answer: AnswerData): answer is MCAnswer {
  return answer.type === 'multiple_choice';
}

export function isTFAnswer(answer: AnswerData): answer is TFAnswer {
  return answer.type === 'true_false';
}

export function isFillBlankAnswer(answer: AnswerData): answer is FillBlankAnswer {
  return answer.type === 'fill_in_blank';
}

export function isMatchingAnswer(answer: AnswerData): answer is MatchingAnswer {
  return answer.type === 'matching';
}

export function isEssayAnswer(answer: AnswerData): answer is EssayAnswer {
  return answer.type === 'essay' || answer.type === 'short_answer';
}

export function isShowWorkAnswer(answer: AnswerData): answer is ShowWorkAnswer {
  return answer.type === 'show_work';
}

// =============================================================================
// Canvas State Validation (for tldraw TLEditorSnapshot)
// =============================================================================

/**
 * Minimal validation for tldraw canvas state.
 * TLEditorSnapshot requires: { document, session } at minimum.
 * We only validate structure exists - tldraw will handle malformed data gracefully.
 */
export function isValidCanvasState(value: unknown): value is Record<string, unknown> {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  // TLEditorSnapshot has 'document' and 'session' properties
  // We check for 'document' as the minimum required field
  return 'document' in obj && typeof obj.document === 'object' && obj.document !== null;
}

// =============================================================================
// Question Type Constants and Type
// =============================================================================

/**
 * Canonical list of all supported question types.
 * Includes aliases (fill_blank, true_false_justify) for backward compatibility.
 */
export const QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'true_false_justify',
  'fill_in_blank',
  'fill_blank',
  'essay',
  'short_answer',
  'show_work',
  'matching',
] as const;

/**
 * Union type of all valid question types.
 * Derived from QUESTION_TYPES for single source of truth.
 */
export type QuestionType = (typeof QUESTION_TYPES)[number];

/**
 * Type guard to validate strings from database/API as valid QuestionType.
 * Use this when receiving questionType from external sources.
 */
export function isValidQuestionType(value: string): value is QuestionType {
  return QUESTION_TYPES.includes(value as QuestionType);
}

// =============================================================================
// Legacy Aliases (backward compatibility with Phase 2.1 components)
// These will be removed when components are updated in Phase 4
// =============================================================================

/** @deprecated Use MCAnswer instead */
export interface MultipleChoiceAnswer {
  selectedIds: string[];
}

/** @deprecated Use FillInBlankOptions instead */
export interface ShortAnswerOptions {
  maxLength?: number;
  placeholder?: string;
}

/** @deprecated Use EssayAnswer instead */
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
