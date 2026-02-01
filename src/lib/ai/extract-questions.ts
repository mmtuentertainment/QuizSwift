import { generateText, Output } from 'ai';
import { z } from 'zod';
import { getExtractionModel } from './providers';

// Schema for a single extracted question
export const ExtractedQuestionSchema = z.object({
  questionText: z.string().describe('The exact question text as it appears in the source material'),
  questionType: z
    .enum([
      'multiple_choice',
      'true_false',
      'fill_in_blank',
      'short_answer',
      'matching',
      'show_work',
      'essay',
    ])
    .describe('The type of question based on its format'),
  options: z
    .array(z.string())
    .nullable()
    .describe('Answer options for multiple choice or matching, null otherwise'),
  correctAnswer: z.string().describe('The correct answer from the source material'),
  explanation: z
    .string()
    .nullable()
    .describe('Explanation or context for the answer if provided in source'),
  sourceQuote: z
    .string()
    .describe('The exact quote from the source containing this question/answer'),
});

// Schema for extraction result
export const ExtractionResultSchema = z.object({
  questions: z.array(ExtractedQuestionSchema),
  noQuestionsFound: z.boolean().describe('True if no quiz-worthy questions were found in the text'),
});

export type ExtractedQuestion = z.infer<typeof ExtractedQuestionSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

const EXTRACTION_PROMPT = `You are extracting EXISTING quiz questions and testable facts from educational text.

CRITICAL RULES:
1. ONLY extract questions that EXPLICITLY appear in the text, or facts that can become questions
2. Do NOT generate or invent new questions
3. Do NOT paraphrase - use exact wording from source as much as possible
4. Include the EXACT source quote for verification
5. If no quiz-worthy content exists, set noQuestionsFound: true
6. For facts without explicit questions, create questions that test the stated fact

WHAT TO EXTRACT:
- Explicit questions in the text (review questions, chapter questions, etc.)
- Definitions that can become "What is X?" questions
- Key facts with numbers, dates, or names
- Cause-effect relationships
- Comparisons between concepts
- True/false statements of fact

WHAT NOT TO EXTRACT:
- Opinions or subjective statements
- Content that requires external knowledge
- Vague or ambiguous statements
- Anything not directly stated in the text

For each extraction, you MUST provide:
- questionText: The question (or a question testing the fact)
- questionType: How the question should be formatted
- correctAnswer: The answer from the source
- sourceQuote: EXACT text from the source (copy-paste, not paraphrase)`;

/**
 * Extract quiz questions from a single text chunk
 */
export async function extractQuestionsFromChunk(
  chunkContent: string,
  pageNumber: number
): Promise<ExtractionResult> {
  const model = getExtractionModel();

  // AI SDK v6: Use generateText with Output.object for structured data
  const { output } = await generateText({
    model,
    output: Output.object({
      schema: ExtractionResultSchema,
    }),
    prompt: `${EXTRACTION_PROMPT}

Text from page ${pageNumber}:
---
${chunkContent}
---

Extract all quiz-worthy questions and facts from this text. Respond with a JSON object containing a "questions" array and "noQuestionsFound" boolean.`,
  });

  // Handle case where output parsing fails
  if (!output) {
    console.warn(`[extract-questions] No structured output from model for page ${pageNumber}`);
    return { questions: [], noQuestionsFound: true };
  }

  return output;
}

/**
 * Extract questions from multiple chunks (batched)
 */
export interface ChunkExtractionResult {
  chunkIndex: number;
  pageNumber: number;
  result: ExtractionResult;
  extractionFailed?: boolean;
  errorMessage?: string;
}

export async function extractQuestionsFromChunks(
  chunks: Array<{ content: string; pageNumber: number; chunkIndex: number }>,
  onProgress?: (current: number, total: number) => void
): Promise<ChunkExtractionResult[]> {
  const results: ChunkExtractionResult[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (onProgress) {
      onProgress(i + 1, chunks.length);
    }

    try {
      const result = await extractQuestionsFromChunk(chunk.content, chunk.pageNumber);

      results.push({
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber,
        result,
      });
    } catch (error) {
      // Continue with other chunks on error, but track the failure
      console.error(`Question extraction failed for page ${chunk.pageNumber}:`, error);
      results.push({
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber,
        result: { questions: [], noQuestionsFound: true },
        extractionFailed: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
