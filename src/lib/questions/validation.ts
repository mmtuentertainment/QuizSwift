/**
 * Zod validation schemas for question options and answer data
 *
 * These schemas validate the JSON fields stored in:
 * - CuratedQuestion.options (question configuration)
 * - QuestionAnswer.answerData (student responses)
 */

import { z } from 'zod';

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
});

export const showWorkOptionsSchema = z.object({
  type: z.literal('show_work'),
  workingSteps: z.array(z.string()),
});

// Discriminated union uses base schema (refinements applied separately)
export const questionOptionsSchema = z.discriminatedUnion('type', [
  multipleChoiceOptionsBase,
  trueFalseOptionsSchema,
  fillInBlankOptionsSchema,
  matchingOptionsSchema,
  essayOptionsSchema,
  showWorkOptionsSchema,
]);

// =============================================================================
// Answer Validation Schemas
// =============================================================================

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
// Type Exports (inferred from schemas)
// =============================================================================

export type MultipleChoiceOptionsSchema = z.infer<typeof multipleChoiceOptionsSchema>;
export type TrueFalseOptionsSchema = z.infer<typeof trueFalseOptionsSchema>;
export type FillInBlankOptionsSchema = z.infer<typeof fillInBlankOptionsSchema>;
export type MatchingOptionsSchema = z.infer<typeof matchingOptionsSchema>;
export type EssayOptionsSchema = z.infer<typeof essayOptionsSchema>;
export type ShowWorkOptionsSchema = z.infer<typeof showWorkOptionsSchema>;
export type QuestionOptionsSchema = z.infer<typeof questionOptionsSchema>;

export type MCAnswerSchema = z.infer<typeof mcAnswerSchema>;
export type TFAnswerSchema = z.infer<typeof tfAnswerSchema>;
export type FillBlankAnswerSchema = z.infer<typeof fillBlankAnswerSchema>;
export type MatchingAnswerSchema = z.infer<typeof matchingAnswerSchema>;
export type EssayAnswerSchema = z.infer<typeof essayAnswerSchema>;
export type ShowWorkAnswerSchema = z.infer<typeof showWorkAnswerSchema>;
