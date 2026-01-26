import { z } from 'zod';

/**
 * Pass 1: Content Analysis
 * Analyzes the full document to understand content type, topics, and learning objectives
 */
export const ContentAnalysisSchema = z.object({
  contentType: z
    .enum(['textbook', 'worksheet', 'article', 'lecture_notes', 'mixed'])
    .describe('The type of educational content'),

  subjectArea: z.string().describe('Primary subject (e.g., "Algebra", "Biology", "US History")'),

  gradeLevel: z
    .enum(['elementary', 'middle', 'high', 'college'])
    .describe('Estimated grade level of content'),

  keyTopics: z.array(z.string()).min(1).max(10).describe('Main topics covered in the document'),

  learningObjectives: z
    .array(
      z.object({
        objective: z.string().describe('What the student should learn'),
        bloomLevel: z
          .enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'])
          .describe("Bloom's Taxonomy level for this objective"),
      })
    )
    .min(1)
    .max(8)
    .describe('Key learning objectives derived from content'),

  hasMathContent: z
    .boolean()
    .describe('Whether document contains mathematical formulas or problems'),

  estimatedReadingTime: z
    .number()
    .describe('Estimated reading time in minutes for average student'),

  difficultySummary: z
    .string()
    .describe('Brief assessment of content difficulty and prerequisites'),
});

export type ContentAnalysis = z.infer<typeof ContentAnalysisSchema>;
