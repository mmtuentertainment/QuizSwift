/**
 * Zod validation schemas for question options and answer data
 *
 * These schemas validate the JSON fields stored in:
 * - CuratedQuestion.options (question configuration)
 * - QuestionAnswer.answerData (student responses)
 */

import { z } from 'zod';

// =============================================================================
// Validation Constants
// =============================================================================

/** Quiz time limit bounds (in minutes) */
export const QUIZ_TIME_LIMIT = {
  MIN: 1,
  MAX: 300,
} as const;

/** Quiz title length bounds */
export const QUIZ_TITLE_LENGTH = {
  MIN: 1,
  MAX: 200,
} as const;

/** Quiz description max length */
export const QUIZ_DESCRIPTION_MAX_LENGTH = 500;

// =============================================================================
// Question Options Schemas
// =============================================================================

// Base schema for discriminated union (without refinement)
const multipleChoiceOptionsBase = z.object({
  type: z.literal('multiple_choice'),
  choices: z.array(z.object({
    id: z.string().min(1),
    text: z.string().min(1),
    isCorrect: z.boolean(),
  })).min(2).max(6),
});

// Full schema with refinement for standalone validation
export const multipleChoiceOptionsSchema = multipleChoiceOptionsBase.refine(
  data => data.choices.filter(c => c.isCorrect).length === 1,
  { message: "Exactly one choice must be marked correct" }
);

export const trueFalseOptionsSchema = z.object({
  type: z.literal('true_false'),
  correctAnswer: z.boolean(),
  justification: z.string().optional(),
});

export const fillInBlankOptionsSchema = z.object({
  type: z.literal('fill_in_blank'),
  blanks: z.array(z.object({
    index: z.number().int().min(0),
    acceptedAnswers: z.array(z.string().min(1)).min(1),
    caseSensitive: z.boolean(),
  })).min(1),
});

export const matchingOptionsSchema = z.object({
  type: z.literal('matching'),
  pairs: z.array(z.object({
    id: z.string().min(1),
    left: z.string().min(1),
    right: z.string().min(1),
  })).min(2),
});

export const essayOptionsSchema = z.object({
  type: z.literal('essay'),
  minWords: z.number().int().min(0).optional(),
  maxWords: z.number().int().min(1).optional(),
  rubric: z.string().optional(),
  guidelines: z.string().optional(),
});

export const showWorkOptionsSchema = z.object({
  type: z.literal('show_work'),
  workingSteps: z.array(z.string()),
});

export const shortAnswerOptionsSchema = z.object({
  type: z.literal('short_answer'),
});

/**
 * Discriminated union for question options.
 *
 * Note: Uses base schema for multiple_choice because Zod discriminatedUnion
 * requires ZodObject schemas (refined schemas are ZodEffects which are incompatible).
 *
 * For multiple_choice validation with the "exactly one correct" business rule,
 * use multipleChoiceOptionsSchema directly after discriminated union parsing.
 */
export const questionOptionsSchema = z.discriminatedUnion('type', [
  multipleChoiceOptionsBase,
  trueFalseOptionsSchema,
  fillInBlankOptionsSchema,
  matchingOptionsSchema,
  essayOptionsSchema,
  showWorkOptionsSchema,
  shortAnswerOptionsSchema,
]);

// =============================================================================
// Answer Validation Schemas
// =============================================================================

// Non-typed answer schemas (for backward compatibility)
export const mcAnswerSchema = z.object({
  selectedChoiceId: z.string().min(1),
});

export const tfAnswerSchema = z.object({
  answer: z.boolean(),
});

export const fillBlankAnswerSchema = z.object({
  blanks: z.array(z.string()),
});

export const matchingAnswerSchema = z.object({
  pairs: z.array(z.object({
    leftId: z.string().min(1),
    rightId: z.string().min(1),
  })),
});

export const essayAnswerSchema = z.object({
  text: z.string(),
  wordCount: z.number().int().min(0),
});

export const showWorkAnswerSchema = z.object({
  finalAnswer: z.string(),
  canvasState: z.record(z.unknown()),
});

// =============================================================================
// Typed Answer Schemas (for discriminated union)
// =============================================================================

/**
 * Typed answer schema for multiple choice questions.
 * Includes 'type' field for discriminated union validation.
 */
export const mcAnswerSchemaTyped = z.object({
  type: z.literal('multiple_choice'),
  selectedChoiceId: z.string().min(1),
});

/**
 * Typed answer schema for true/false questions.
 */
export const tfAnswerSchemaTyped = z.object({
  type: z.literal('true_false'),
  answer: z.boolean(),
});

/**
 * Typed answer schema for fill-in-blank questions.
 */
export const fillBlankAnswerSchemaTyped = z.object({
  type: z.literal('fill_in_blank'),
  blanks: z.array(z.string()),
});

/**
 * Typed answer schema for matching questions.
 */
export const matchingAnswerSchemaTyped = z.object({
  type: z.literal('matching'),
  pairs: z.array(z.object({
    leftId: z.string().min(1),
    rightId: z.string().min(1),
  })),
});

/**
 * Typed answer schema for essay questions.
 */
export const essayAnswerSchemaTyped = z.object({
  type: z.literal('essay'),
  text: z.string(),
  wordCount: z.number().int().min(0),
});

/**
 * Typed answer schema for short answer questions.
 */
export const shortAnswerSchemaTyped = z.object({
  type: z.literal('short_answer'),
  text: z.string(),
  wordCount: z.number().int().min(0),
});

/**
 * Typed answer schema for show-your-work questions.
 * canvasState can be any value (tldraw snapshot) but must be present.
 */
export const showWorkAnswerSchemaTyped = z.object({
  type: z.literal('show_work'),
  finalAnswer: z.string(),
  // Use .transform() to ensure canvasState is always present in output
  canvasState: z.any().transform((v) => v as unknown),
});

/**
 * Discriminated union for validating answer data at runtime.
 *
 * Use this to validate answerData received from untrusted sources
 * (e.g., server action parameters) before processing.
 *
 * @example
 * ```typescript
 * const result = answerDataSchema.safeParse(answerData);
 * if (!result.success) return { error: 'Invalid answer format' };
 * const validatedAnswer = result.data;
 * ```
 */
export const answerDataSchema = z.discriminatedUnion('type', [
  mcAnswerSchemaTyped,
  tfAnswerSchemaTyped,
  fillBlankAnswerSchemaTyped,
  matchingAnswerSchemaTyped,
  essayAnswerSchemaTyped,
  shortAnswerSchemaTyped,
  showWorkAnswerSchemaTyped,
]);

export type AnswerDataSchema = z.infer<typeof answerDataSchema>;

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type MultipleChoiceOptionsSchema = z.infer<typeof multipleChoiceOptionsSchema>;
export type TrueFalseOptionsSchema = z.infer<typeof trueFalseOptionsSchema>;
export type FillInBlankOptionsSchema = z.infer<typeof fillInBlankOptionsSchema>;
export type MatchingOptionsSchema = z.infer<typeof matchingOptionsSchema>;
export type EssayOptionsSchema = z.infer<typeof essayOptionsSchema>;
export type ShowWorkOptionsSchema = z.infer<typeof showWorkOptionsSchema>;
export type ShortAnswerOptionsSchema = z.infer<typeof shortAnswerOptionsSchema>;
export type QuestionOptionsSchema = z.infer<typeof questionOptionsSchema>;

export type MCAnswerSchema = z.infer<typeof mcAnswerSchema>;
export type TFAnswerSchema = z.infer<typeof tfAnswerSchema>;
export type FillBlankAnswerSchema = z.infer<typeof fillBlankAnswerSchema>;
export type MatchingAnswerSchema = z.infer<typeof matchingAnswerSchema>;
export type EssayAnswerSchema = z.infer<typeof essayAnswerSchema>;
export type ShowWorkAnswerSchema = z.infer<typeof showWorkAnswerSchema>;

// =============================================================================
// Validation Helper Functions
// =============================================================================

export type ValidatedQuestionOptions = z.infer<typeof questionOptionsSchema>;

/**
 * Safely parse question options from database JSON.
 * Returns null if validation fails (graceful degradation).
 *
 * @example
 * ```typescript
 * const options = parseQuestionOptions(question.options);
 * if (!options) {
 *   console.warn('Invalid question options');
 *   return;
 * }
 * // options is now typed as ValidatedQuestionOptions
 * ```
 */
export function parseQuestionOptions(data: unknown): ValidatedQuestionOptions | null {
  const result = questionOptionsSchema.safeParse(data);
  return result.success ? result.data : null;
}

export type ValidatedAnswerData = z.infer<typeof answerDataSchema>;

/**
 * Safely parse answer data from database JSON.
 * Returns null if validation fails.
 *
 * @example
 * ```typescript
 * const answer = parseAnswerData(questionAnswer.answerData);
 * if (!answer) {
 *   console.warn('Invalid answer data');
 *   return;
 * }
 * // answer is now typed as ValidatedAnswerData
 * ```
 */
export function parseAnswerData(data: unknown): ValidatedAnswerData | null {
  const result = answerDataSchema.safeParse(data);
  return result.success ? result.data : null;
}
