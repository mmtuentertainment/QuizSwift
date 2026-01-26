import { prisma } from '@/lib/prisma';
import { embedText, toVectorString } from './embed';
import type { ExtractedQuestion } from './extract-questions';

export const GROUNDING_THRESHOLD = 0.85;
export const WARNING_THRESHOLD = 0.75;

export interface VerificationResult {
  verified: boolean;
  status: 'grounded' | 'weak' | 'ungrounded';
  similarity: number;
  sourceChunkId: string | null;
  pageNumber: number | null;
  message: string;
}

/**
 * Verify that an extracted question is grounded in source text
 * Uses vector similarity against pre-computed chunk embeddings
 *
 * IMPORTANT: This uses embeddings generated in Plan 02-03.
 * Chunks must have embeddings populated for vector search to work.
 */
export async function verifyGrounding(
  question: ExtractedQuestion,
  documentId: string
): Promise<VerificationResult> {
  // Combine question and source quote for embedding
  const textToEmbed = `${question.questionText} ${question.sourceQuote}`;

  // Get embedding for the question
  const embedding = await embedText(textToEmbed);

  // Convert to Postgres vector format
  const vectorString = toVectorString(embedding);

  // Find most similar chunk using pgvector
  // Uses embeddings stored in 02-03 pipeline
  const chunksWithEmbeddings = await prisma.$queryRaw<
    Array<{
      id: string;
      content: string;
      page_number: number;
      similarity: number;
    }>
  >`
    SELECT
      id,
      content,
      "pageNumber" as page_number,
      1 - (embedding <=> ${vectorString}::vector) as similarity
    FROM "SourceChunk"
    WHERE "documentId" = ${documentId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorString}::vector
    LIMIT 1
  `;

  // If no chunks have embeddings, use text-based matching fallback
  if (chunksWithEmbeddings.length === 0) {
    return verifyGroundingTextBased(question, documentId);
  }

  const match = chunksWithEmbeddings[0];

  if (match.similarity >= GROUNDING_THRESHOLD) {
    return {
      verified: true,
      status: 'grounded',
      similarity: match.similarity,
      sourceChunkId: match.id,
      pageNumber: match.page_number,
      message: 'Question verified against source text',
    };
  }

  if (match.similarity >= WARNING_THRESHOLD) {
    return {
      verified: false,
      status: 'weak',
      similarity: match.similarity,
      sourceChunkId: match.id,
      pageNumber: match.page_number,
      message: 'Question has weak grounding - review recommended',
    };
  }

  return {
    verified: false,
    status: 'ungrounded',
    similarity: match.similarity,
    sourceChunkId: null,
    pageNumber: null,
    message: 'Question could not be verified against source text',
  };
}

/**
 * Fallback text-based grounding verification
 * Used when chunks don't have embeddings yet (edge case)
 */
async function verifyGroundingTextBased(
  question: ExtractedQuestion,
  documentId: string
): Promise<VerificationResult> {
  // Get all chunks for this document
  const chunks = await prisma.sourceChunk.findMany({
    where: { documentId },
    select: { id: true, content: true, pageNumber: true },
  });

  // Normalize source quote for matching
  const sourceQuoteLower = question.sourceQuote.toLowerCase().trim();
  const sourceWords = new Set(sourceQuoteLower.split(/\s+/));

  let bestMatch: { id: string; pageNumber: number; score: number } | null = null;

  for (const chunk of chunks) {
    const chunkLower = chunk.content.toLowerCase();

    // Check for substring match
    if (chunkLower.includes(sourceQuoteLower)) {
      return {
        verified: true,
        status: 'grounded',
        similarity: 1.0,
        sourceChunkId: chunk.id,
        pageNumber: chunk.pageNumber,
        message: 'Question verified - exact source quote found',
      };
    }

    // Calculate word overlap
    const chunkWords = new Set(chunkLower.split(/\s+/));
    const intersection = [...sourceWords].filter((w) => chunkWords.has(w));
    const score = intersection.length / sourceWords.size;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { id: chunk.id, pageNumber: chunk.pageNumber, score };
    }
  }

  if (bestMatch && bestMatch.score >= GROUNDING_THRESHOLD) {
    return {
      verified: true,
      status: 'grounded',
      similarity: bestMatch.score,
      sourceChunkId: bestMatch.id,
      pageNumber: bestMatch.pageNumber,
      message: 'Question verified via text matching',
    };
  }

  if (bestMatch && bestMatch.score >= WARNING_THRESHOLD) {
    return {
      verified: false,
      status: 'weak',
      similarity: bestMatch.score,
      sourceChunkId: bestMatch.id,
      pageNumber: bestMatch.pageNumber,
      message: 'Weak text match - review recommended',
    };
  }

  return {
    verified: false,
    status: 'ungrounded',
    similarity: bestMatch?.score ?? 0,
    sourceChunkId: null,
    pageNumber: null,
    message: 'Could not verify question against source text',
  };
}

/**
 * Batch verify multiple questions
 */
export async function verifyQuestionsGrounding(
  questions: ExtractedQuestion[],
  documentId: string
): Promise<Array<{ question: ExtractedQuestion; verification: VerificationResult }>> {
  const results: Array<{ question: ExtractedQuestion; verification: VerificationResult }> = [];

  for (const question of questions) {
    const verification = await verifyGrounding(question, documentId);
    results.push({ question, verification });
  }

  return results;
}
