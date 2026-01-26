import { z } from 'zod';

/**
 * Pass 2: Concept Extraction
 * Extracts testable concepts with importance ranking and dependencies
 */
export const ConceptSchema = z.object({
  id: z.string().describe('Unique identifier for this concept'),
  name: z.string().describe('Concept name (e.g., "Pythagorean Theorem")'),
  definition: z.string().describe('Brief definition from the document'),
  importance: z
    .number()
    .min(1)
    .max(5)
    .describe('Importance for testing: 1=minor detail, 5=core concept'),
  category: z
    .enum(['definition', 'process', 'relationship', 'example', 'rule', 'formula'])
    .describe('Type of concept'),
  dependencies: z.array(z.string()).describe('IDs of concepts this one builds upon'),
  sourceEvidence: z.string().describe('Quote from document supporting this concept'),
});

export const ConceptExtractionSchema = z.object({
  concepts: z
    .array(ConceptSchema)
    .min(1)
    .max(30)
    .describe('Testable concepts extracted from document'),

  conceptMap: z.string().describe('Brief description of how concepts relate to each other'),

  recommendedFocus: z
    .array(z.string())
    .describe('Concept IDs recommended for primary testing focus (importance >= 4)'),
});

export type Concept = z.infer<typeof ConceptSchema>;
export type ConceptExtraction = z.infer<typeof ConceptExtractionSchema>;
