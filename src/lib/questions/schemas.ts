/**
 * Zod schemas for question options validation
 *
 * Used to validate JSON data from database before type narrowing.
 * These schemas mirror the TypeScript interfaces in types.ts.
 */

import { z } from 'zod';

// Multiple Choice Options Schema
export const MultipleChoiceOptionsSchema = z.object({
  type: z.literal('multiple_choice'),
  choices: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean(),
  })),
});

// True/False Options Schema
export const TrueFalseOptionsSchema = z.object({
  type: z.literal('true_false'),
  correctAnswer: z.boolean(),
  justification: z.string().optional(),
});

// Fill in Blank Options Schema
export const FillInBlankOptionsSchema = z.object({
  type: z.literal('fill_in_blank'),
  blanks: z.array(z.object({
    index: z.number(),
    acceptedAnswers: z.array(z.string()),
    caseSensitive: z.boolean().default(false),
  })),
});

// Matching Options Schema
export const MatchingOptionsSchema = z.object({
  type: z.literal('matching'),
  pairs: z.array(z.object({
    id: z.string(),
    left: z.string(),
    right: z.string(),
  })),
});

// Essay Options Schema
export const EssayOptionsSchema = z.object({
  type: z.literal('essay'),
  minWords: z.number().optional(),
  maxWords: z.number().optional(),
  rubric: z.string().optional(),
  guidelines: z.string().optional(),
});

// Show Work Options Schema
export const ShowWorkOptionsSchema = z.object({
  type: z.literal('show_work'),
  workingSteps: z.array(z.string()),
});

// Union schema for all question options
export const QuestionOptionsSchema = z.discriminatedUnion('type', [
  MultipleChoiceOptionsSchema,
  TrueFalseOptionsSchema,
  FillInBlankOptionsSchema,
  MatchingOptionsSchema,
  EssayOptionsSchema,
  ShowWorkOptionsSchema,
]);

export type ValidatedQuestionOptions = z.infer<typeof QuestionOptionsSchema>;

/**
 * Safely parse question options from database JSON.
 * Returns null if validation fails (graceful degradation).
 */
export function parseQuestionOptions(data: unknown): ValidatedQuestionOptions | null {
  const result = QuestionOptionsSchema.safeParse(data);
  return result.success ? result.data : null;
}

// =============================================================================
// Answer Data Schemas (for validating student responses)
// =============================================================================

export const MCAnswerSchema = z.object({
  type: z.literal('multiple_choice'),
  selectedChoiceId: z.string(),
});

export const TFAnswerSchema = z.object({
  type: z.literal('true_false'),
  answer: z.boolean(),
});

export const FillBlankAnswerSchema = z.object({
  type: z.literal('fill_in_blank'),
  blanks: z.array(z.string()),
});

export const MatchingAnswerSchema = z.object({
  type: z.literal('matching'),
  pairs: z.array(z.object({
    leftId: z.string(),
    rightId: z.string(),
  })),
});

export const EssayAnswerSchema = z.object({
  type: z.literal('essay'),
  text: z.string(),
  wordCount: z.number(),
});

export const ShortAnswerSchema = z.object({
  type: z.literal('short_answer'),
  text: z.string(),
  wordCount: z.number(),
});

export const ShowWorkAnswerSchema = z.object({
  type: z.literal('show_work'),
  finalAnswer: z.string(),
  canvasState: z.unknown(),
});

export const AnswerDataSchema = z.discriminatedUnion('type', [
  MCAnswerSchema,
  TFAnswerSchema,
  FillBlankAnswerSchema,
  MatchingAnswerSchema,
  EssayAnswerSchema,
  ShortAnswerSchema,
  ShowWorkAnswerSchema,
]);

export type ValidatedAnswerData = z.infer<typeof AnswerDataSchema>;

/**
 * Safely parse answer data from database JSON.
 * Returns null if validation fails.
 */
export function parseAnswerData(data: unknown): ValidatedAnswerData | null {
  const result = AnswerDataSchema.safeParse(data);
  return result.success ? result.data : null;
}
