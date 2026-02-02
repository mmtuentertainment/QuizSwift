import { z } from 'zod';

/**
 * Pass 3: Question Generation
 * Generates 2x requested count with Bloom's Taxonomy distribution
 */
export const BloomLevel = z.enum([
  'remember', // Recall facts
  'understand', // Explain concepts - TARGET: 40%
  'apply', // Use in new situations - TARGET: 30%
  'analyze', // Break down components - TARGET: 20%
  'evaluate', // Make judgments - TARGET: 10%
  'create', // Produce new work (rare for quiz questions)
]);

/**
 * Canonical question types for AI generation (7 types).
 *
 * Note: This differs from QUESTION_TYPES in src/lib/questions/types.ts which
 * includes 9 types (7 canonical + 2 legacy aliases: fill_blank, true_false_justify).
 * AI should only generate canonical types; legacy aliases exist for backward compatibility.
 *
 * @see src/lib/questions/types.ts - QUESTION_TYPES and CANONICAL_QUESTION_TYPES
 */
export const QuestionType = z.enum([
  'multiple_choice',
  'short_answer',
  'true_false',
  'show_work',
  'matching',
  'fill_in_blank',
  'essay',
]);

export const CuratedQuestionSchema = z.object({
  id: z.string().describe('Unique question identifier'),

  questionText: z.string().describe('The question to ask the student'),

  questionType: QuestionType.describe('Format of the question'),

  bloomLevel: BloomLevel.describe("Bloom's Taxonomy cognitive level"),

  targetConceptId: z.string().describe('ID of the concept this question tests'),

  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level'),

  // Answer structure depends on question type
  options: z
    .array(z.string())
    .nullable()
    .describe('Options for multiple choice/matching, null otherwise'),

  correctAnswer: z.string().describe('The correct answer'),

  explanation: z.string().describe('Why this is the correct answer'),

  comprehensionRationale: z.string().describe('Why this tests understanding, not just recall'),

  sourceEvidence: z.string().describe('Quote from document supporting this question/answer'),

  // For show_work questions
  workingSteps: z
    .array(z.string())
    .nullable()
    .describe('Expected solution steps for show_work questions'),
});

export const QuestionGenerationSchema = z.object({
  questions: z
    .array(CuratedQuestionSchema)
    .describe('Generated questions (should be 2x requested count)'),

  bloomDistribution: z
    .object({
      remember: z.number(),
      understand: z.number(),
      apply: z.number(),
      analyze: z.number(),
      evaluate: z.number(),
      create: z.number(),
    })
    .describe("Actual distribution of questions by Bloom's level"),

  typeDistribution: z
    .object({
      multiple_choice: z.number(),
      short_answer: z.number(),
      true_false: z.number(),
      show_work: z.number(),
      matching: z.number(),
      fill_in_blank: z.number(),
      essay: z.number(),
    })
    .describe('Distribution by question type'),
});

export type CuratedQuestion = z.infer<typeof CuratedQuestionSchema>;
export type QuestionGeneration = z.infer<typeof QuestionGenerationSchema>;

/**
 * Anti-patterns that indicate a True/False question is actually a comparison/preference question.
 * These questions cannot be answered with True/False and should be a different type.
 *
 * Exported for use in both Zod schema refinements and runtime validation.
 * @see validateQuestionFormat in curate-questions.ts
 */
export const TRUE_FALSE_ANTI_PATTERNS = [
  'which is better',
  'which one',
  'compare',
  'prefer',
  'would you rather',
  'what is your',
  'which do you',
  'opinion',
  'favorite',
];

/**
 * Validated question schema with format-specific refinements.
 *
 * Use this schema for POST-generation validation. The base CuratedQuestionSchema
 * is intentionally loose to avoid over-constraining AI output during generation.
 *
 * Refinements:
 * - fill_in_blank: questionText must contain '___' or '[BLANK]' marker
 * - true_false: correctAnswer must be 'True' or 'False' (case insensitive)
 * - true_false: questionText must NOT be a comparison/preference question
 */
export const ValidatedQuestionSchema = CuratedQuestionSchema.refine(
  (q) => {
    if (q.questionType === 'fill_in_blank') {
      return q.questionText.includes('___') || q.questionText.includes('[BLANK]');
    }
    return true;
  },
  {
    message: 'Fill-in-blank questions must contain ___ or [BLANK] marker',
    path: ['questionText'],
  }
)
  .refine(
    (q) => {
      if (q.questionType === 'true_false') {
        const normalized = q.correctAnswer.trim().toLowerCase();
        return normalized === 'true' || normalized === 'false';
      }
      return true;
    },
    {
      message: 'True/False questions must have True or False as the correct answer',
      path: ['correctAnswer'],
    }
  )
  .refine(
    (q) => {
      if (q.questionType === 'true_false') {
        const lowerText = q.questionText.toLowerCase();
        return !TRUE_FALSE_ANTI_PATTERNS.some((pattern) => lowerText.includes(pattern));
      }
      return true;
    },
    {
      message:
        'True/False questions cannot be comparison, preference, or opinion questions',
      path: ['questionText'],
    }
  );

export type ValidatedQuestion = z.infer<typeof ValidatedQuestionSchema>;
