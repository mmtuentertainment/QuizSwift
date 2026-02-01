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

export interface ShortAnswerOptions {
  type: 'short_answer';
  // Short answer questions have no special options - just text input
}

export type QuestionOptions =
  | MultipleChoiceOptions
  | TrueFalseOptions
  | FillInBlankOptions
  | MatchingOptions
  | EssayOptions
  | ShowWorkOptions
  | ShortAnswerOptions;

// =============================================================================
// Canonical Question Types
// =============================================================================

/**
 * Canonical question types - the preferred, normalized forms.
 *
 * Use these for:
 * - New code and features
 * - Type definitions and interfaces
 * - Validation after normalization
 *
 * For accepting user/database input that may contain legacy aliases,
 * use QUESTION_TYPES instead, then normalize with normalizeQuestionType().
 *
 * @see QUESTION_TYPES - includes legacy aliases for backward compatibility
 * @see normalizeQuestionType - converts legacy aliases to canonical forms
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
// Answer Data - Storage/Grading Layer
// =============================================================================
//
// DUAL TYPE SYSTEM:
// The application uses two answer data formats:
//
// 1. AnswerData (these types) - Storage/Grading Layer
//    - Used by server actions, grading functions, and database
//    - Stored in QuestionAnswer.answerData (Prisma Json field)
//    - Optimized for persistence and grading logic
//
// 2. RendererAnswerData - UI Layer (in components/questions/question-renderer.tsx)
//    - Used by QuestionRenderer and type-specific components
//    - Optimized for React state management
//
// Conversion between formats happens in quiz-taker.tsx:
//    toLibAnswerData(): RendererAnswerData -> AnswerData (for submission)
//    toRendererAnswerData(): AnswerData -> RendererAnswerData (for display)
//
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
// Type Guards for QuestionOptions
// Use to narrow QuestionOptions to specific option types for type-safe access
// =============================================================================

/**
 * Type guard for multiple choice question options.
 * Narrows QuestionOptions to MultipleChoiceOptions for type-safe access to choices.
 *
 * @example
 * ```typescript
 * if (isMultipleChoiceOptions(options)) {
 *   options.choices.forEach(c => console.log(c.text)); // Type-safe
 * }
 * ```
 */
export function isMultipleChoiceOptions(options: QuestionOptions): options is MultipleChoiceOptions {
  return options.type === 'multiple_choice';
}

/**
 * Type guard for true/false question options.
 * Narrows QuestionOptions to TrueFalseOptions for type-safe access to correctAnswer.
 *
 * @example
 * ```typescript
 * if (isTrueFalseOptions(options)) {
 *   const correct = options.correctAnswer; // Type-safe boolean
 * }
 * ```
 */
export function isTrueFalseOptions(options: QuestionOptions): options is TrueFalseOptions {
  return options.type === 'true_false';
}

/**
 * Type guard for fill-in-blank question options.
 * Narrows QuestionOptions to FillInBlankOptions for type-safe access to blanks array.
 *
 * @example
 * ```typescript
 * if (isFillInBlankOptions(options)) {
 *   options.blanks.forEach(b => console.log(b.acceptedAnswers)); // Type-safe
 * }
 * ```
 */
export function isFillInBlankOptions(options: QuestionOptions): options is FillInBlankOptions {
  return options.type === 'fill_in_blank';
}

/**
 * Type guard for matching question options.
 * Narrows QuestionOptions to MatchingOptions for type-safe access to pairs array.
 *
 * @example
 * ```typescript
 * if (isMatchingOptions(options)) {
 *   options.pairs.forEach(p => console.log(p.left, p.right)); // Type-safe
 * }
 * ```
 */
export function isMatchingOptions(options: QuestionOptions): options is MatchingOptions {
  return options.type === 'matching';
}

/**
 * Type guard for essay question options.
 * Narrows QuestionOptions to EssayOptions for type-safe access to minWords, maxWords, rubric.
 *
 * @example
 * ```typescript
 * if (isEssayOptions(options)) {
 *   const min = options.minWords ?? 0; // Type-safe
 * }
 * ```
 */
export function isEssayOptions(options: QuestionOptions): options is EssayOptions {
  return options.type === 'essay';
}

/**
 * Type guard for show-your-work question options.
 * Narrows QuestionOptions to ShowWorkOptions for type-safe access to workingSteps.
 *
 * @example
 * ```typescript
 * if (isShowWorkOptions(options)) {
 *   options.workingSteps.forEach(s => console.log(s)); // Type-safe
 * }
 * ```
 */
export function isShowWorkOptions(options: QuestionOptions): options is ShowWorkOptions {
  return options.type === 'show_work';
}

/**
 * Type guard for short answer question options.
 * Narrows QuestionOptions to ShortAnswerOptions.
 *
 * @example
 * ```typescript
 * if (isShortAnswerOptions(options)) {
 *   // Short answer has no special options
 * }
 * ```
 */
export function isShortAnswerOptions(options: QuestionOptions): options is ShortAnswerOptions {
  return options.type === 'short_answer';
}

// =============================================================================
// Type Guards for AnswerData
// Use to narrow AnswerData to specific answer types for type-safe processing
// =============================================================================

/**
 * Type guard for multiple choice answer data.
 * Narrows AnswerData to MCAnswer for type-safe access to selectedChoiceId.
 *
 * @example
 * ```typescript
 * if (isMCAnswer(answer)) {
 *   console.log(`Selected: ${answer.selectedChoiceId}`); // Type-safe
 * }
 * ```
 */
export function isMCAnswer(answer: AnswerData): answer is MCAnswer {
  return answer.type === 'multiple_choice';
}

/**
 * Type guard for true/false answer data.
 * Narrows AnswerData to TFAnswer for type-safe access to answer boolean.
 *
 * @example
 * ```typescript
 * if (isTFAnswer(answer)) {
 *   const isTrue = answer.answer; // Type-safe boolean
 * }
 * ```
 */
export function isTFAnswer(answer: AnswerData): answer is TFAnswer {
  return answer.type === 'true_false';
}

/**
 * Type guard for fill-in-blank answer data.
 * Narrows AnswerData to FillBlankAnswer for type-safe access to blanks array.
 *
 * @example
 * ```typescript
 * if (isFillBlankAnswer(answer)) {
 *   answer.blanks.forEach((b, i) => console.log(`Blank ${i}: ${b}`)); // Type-safe
 * }
 * ```
 */
export function isFillBlankAnswer(answer: AnswerData): answer is FillBlankAnswer {
  return answer.type === 'fill_in_blank';
}

/**
 * Type guard for matching answer data.
 * Narrows AnswerData to MatchingAnswer for type-safe access to pairs array.
 *
 * @example
 * ```typescript
 * if (isMatchingAnswer(answer)) {
 *   answer.pairs.forEach(p => console.log(`${p.leftId} -> ${p.rightId}`)); // Type-safe
 * }
 * ```
 */
export function isMatchingAnswer(answer: AnswerData): answer is MatchingAnswer {
  return answer.type === 'matching';
}

/**
 * Type guard for essay/short answer data.
 * Narrows AnswerData to EssayAnswer for type-safe access to text and wordCount.
 * Handles both 'essay' and 'short_answer' types.
 *
 * @example
 * ```typescript
 * if (isEssayAnswer(answer)) {
 *   console.log(`${answer.wordCount} words: ${answer.text}`); // Type-safe
 * }
 * ```
 */
export function isEssayAnswer(answer: AnswerData): answer is EssayAnswer {
  return answer.type === 'essay' || answer.type === 'short_answer';
}

/**
 * Type guard for show-your-work answer data.
 * Narrows AnswerData to ShowWorkAnswer for type-safe access to finalAnswer and canvasState.
 *
 * @example
 * ```typescript
 * if (isShowWorkAnswer(answer)) {
 *   console.log(`Answer: ${answer.finalAnswer}`); // Type-safe
 *   const canvas = answer.canvasState; // Type-safe (unknown)
 * }
 * ```
 */
export function isShowWorkAnswer(answer: AnswerData): answer is ShowWorkAnswer {
  return answer.type === 'show_work';
}

// =============================================================================
// Canvas State Validation (for tldraw TLEditorSnapshot)
// =============================================================================

/**
 * Minimal validation for tldraw canvas state.
 * TLEditorSnapshot requires: { document, session } at minimum.
 * We validate both properties exist - tldraw will handle malformed data gracefully.
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
  // Validate both exist for complete snapshot structure
  const hasDocument = 'document' in obj && typeof obj.document === 'object' && obj.document !== null;
  const hasSession = 'session' in obj && typeof obj.session === 'object' && obj.session !== null;

  if (!hasDocument || !hasSession) {
    return false;
  }

  // Validate session has version property (TLSessionStateSnapshot.version)
  const session = obj.session as Record<string, unknown>;
  return 'version' in session && (typeof session.version === 'number' || typeof session.version === 'string');
}

// =============================================================================
// Question Type Constants and Type
// =============================================================================

/**
 * All valid question type strings, including legacy aliases.
 *
 * Use this when:
 * - Validating raw input from database/API (may contain legacy aliases)
 * - Checking if a string is any valid question type
 *
 * After validation, normalize to canonical form:
 * ```typescript
 * if (isValidQuestionType(rawType)) {
 *   const canonical = normalizeQuestionType(rawType);
 * }
 * ```
 *
 * @see CANONICAL_QUESTION_TYPES - canonical forms only (preferred for new code)
 * @see normalizeQuestionType - converts legacy aliases to canonical forms
 */
export const QUESTION_TYPES = [
  'essay',
  'fill_blank',
  'fill_in_blank',
  'matching',
  'multiple_choice',
  'short_answer',
  'show_work',
  'true_false',
  'true_false_justify',
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
// Legacy Aliases (backward compatibility)
// =============================================================================
//
// TODO(LEGACY-TYPES): Remove deprecated type aliases when no longer in use
// Tracked in: .planning/STATE.md pending_todos
// These exist for backward compatibility with Phase 2.1 components.
// Check usage with: grep -r "MultipleChoiceAnswer\|ShortAnswerOptions" src/
//
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
