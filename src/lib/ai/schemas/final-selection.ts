import { z } from 'zod';
import { CuratedQuestionSchema } from './question-generation';

/**
 * Pass 5: Final Selection
 * Ranks and selects questions for the teacher curation pool
 */
export const RankedQuestionSchema = z.object({
  questionId: z.string(),
  rank: z.number().describe('1 = best'),
  finalScore: z.number().min(0).max(100).describe('Combined quality score (0-100)'),
  includedInPool: z.boolean().describe('Whether this question makes the 2x cut'),
  exclusionReason: z.string().nullable().describe('Why excluded if not in pool'),
});

export const FinalSelectionSchema = z.object({
  rankedQuestions: z.array(RankedQuestionSchema).describe('All questions with final rankings'),

  selectedForPool: z
    .array(z.string())
    .describe('Question IDs selected for teacher pool (2x requested count)'),

  poolQuality: z.object({
    averageScore: z.number(),
    bloomBalance: z
      .number()
      .min(0)
      .max(100)
      .describe('How well distribution matches targets (100=perfect)'),
    conceptCoverage: z.number().min(0).max(100).describe('Percentage of important concepts tested'),
    typeVariety: z.number().min(0).max(100).describe('Variety of question types'),
  }),

  curatorNotes: z.string().describe('Summary for teachers about the curated question pool'),
});

// Combined schema for storing the full curated question with evaluation
export const StorableCuratedQuestionSchema = CuratedQuestionSchema.extend({
  evaluationScore: z.number().nullable(),
  rank: z.number().nullable(),
  selected: z
    .boolean()
    .default(false)
    .describe('Whether teacher has selected this for the final quiz'),
});

export type RankedQuestion = z.infer<typeof RankedQuestionSchema>;
export type FinalSelection = z.infer<typeof FinalSelectionSchema>;
export type StorableCuratedQuestion = z.infer<typeof StorableCuratedQuestionSchema>;
