import { z } from 'zod';

/**
 * Pass 4: Question Evaluation (Self-Reflexion)
 * AI evaluates its own generated questions for quality
 */
export const QuestionEvaluationItemSchema = z.object({
  questionId: z.string().describe('ID of the question being evaluated'),

  comprehensionDepth: z
    .number()
    .min(1)
    .max(5)
    .describe('1=pure recall, 3=basic comprehension, 5=deep understanding'),

  clarity: z.number().min(1).max(5).describe('1=ambiguous, 5=crystal clear'),

  answerability: z
    .number()
    .min(1)
    .max(5)
    .describe('1=requires external knowledge, 5=fully answerable from document'),

  difficultyAppropriateness: z
    .number()
    .min(1)
    .max(5)
    .describe('1=too easy/hard, 5=perfectly calibrated'),

  overallScore: z.number().min(1).max(5).describe('Weighted average of above metrics'),

  strengths: z.array(z.string()).describe('What makes this question good'),

  weaknesses: z.array(z.string()).describe('Areas for improvement'),

  suggestedRewrite: z
    .string()
    .nullable()
    .describe('Improved version if score < 3.5, null otherwise'),

  recommendation: z
    .enum(['keep', 'improve', 'discard'])
    .describe('Whether to include in final pool'),
});

export const QuestionEvaluationSchema = z.object({
  evaluations: z
    .array(QuestionEvaluationItemSchema)
    .describe('Evaluation for each generated question'),

  qualitySummary: z.object({
    averageScore: z.number(),
    highQualityCount: z.number().describe('Score >= 4.0'),
    mediumQualityCount: z.number().describe('Score 3.0-3.9'),
    lowQualityCount: z.number().describe('Score < 3.0'),
  }),

  recommendedImprovements: z.array(z.string()).describe('General suggestions for the question set'),
});

export type QuestionEvaluationItem = z.infer<typeof QuestionEvaluationItemSchema>;
export type QuestionEvaluation = z.infer<typeof QuestionEvaluationSchema>;
