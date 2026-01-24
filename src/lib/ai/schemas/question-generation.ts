import { z } from 'zod';

/**
 * Pass 3: Question Generation
 * Generates 2x requested count with Bloom's Taxonomy distribution
 */
export const BloomLevel = z.enum([
  'remember',    // Recall facts
  'understand',  // Explain concepts - TARGET: 40%
  'apply',       // Use in new situations - TARGET: 30%
  'analyze',     // Break down components - TARGET: 20%
  'evaluate',    // Make judgments - TARGET: 10%
  'create',      // Produce new work (rare for quiz questions)
]);

export const QuestionType = z.enum([
  'multiple_choice',
  'short_answer',
  'true_false_justify',
  'show_work',
  'matching',
  'fill_blank',
]);

export const CuratedQuestionSchema = z.object({
  id: z.string().describe('Unique question identifier'),

  questionText: z.string()
    .describe('The question to ask the student'),

  questionType: QuestionType
    .describe('Format of the question'),

  bloomLevel: BloomLevel
    .describe('Bloom\'s Taxonomy cognitive level'),

  targetConceptId: z.string()
    .describe('ID of the concept this question tests'),

  difficulty: z.enum(['easy', 'medium', 'hard'])
    .describe('Difficulty level'),

  // Answer structure depends on question type
  options: z.array(z.string()).nullable()
    .describe('Options for multiple choice/matching, null otherwise'),

  correctAnswer: z.string()
    .describe('The correct answer'),

  explanation: z.string()
    .describe('Why this is the correct answer'),

  comprehensionRationale: z.string()
    .describe('Why this tests understanding, not just recall'),

  sourceEvidence: z.string()
    .describe('Quote from document supporting this question/answer'),

  // For show_work questions
  workingSteps: z.array(z.string()).nullable()
    .describe('Expected solution steps for show_work questions'),
});

export const QuestionGenerationSchema = z.object({
  questions: z.array(CuratedQuestionSchema)
    .describe('Generated questions (should be 2x requested count)'),

  bloomDistribution: z.object({
    remember: z.number(),
    understand: z.number(),
    apply: z.number(),
    analyze: z.number(),
    evaluate: z.number(),
    create: z.number(),
  }).describe('Actual distribution of questions by Bloom\'s level'),

  typeDistribution: z.object({
    multiple_choice: z.number(),
    short_answer: z.number(),
    true_false_justify: z.number(),
    show_work: z.number(),
    matching: z.number(),
    fill_blank: z.number(),
  }).describe('Distribution by question type'),
});

export type CuratedQuestion = z.infer<typeof CuratedQuestionSchema>;
export type QuestionGeneration = z.infer<typeof QuestionGenerationSchema>;
