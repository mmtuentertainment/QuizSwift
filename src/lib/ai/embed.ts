import { embed, embedMany } from 'ai';
import { getEmbeddingModel } from './providers';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

/**
 * Result from batch embedding operation with failure tracking.
 * Allows callers to detect and handle partial failures.
 */
export interface BatchEmbeddingResult {
  /** Embeddings array - empty arrays at failedIndexes positions */
  embeddings: number[][];
  /** Indexes of texts that failed to embed (0-based) */
  failedIndexes: number[];
}

/**
 * Embed a single text string
 */
export async function embedText(text: string): Promise<number[]> {
  const model = getEmbeddingModel();

  const { embedding } = await embed({
    model,
    value: text,
  });

  return embedding;
}

/**
 * Embed multiple texts in batch with failure tracking.
 * Ollama works better with smaller batches, so we process in chunks of 10.
 *
 * @returns BatchEmbeddingResult with embeddings array and list of failed indexes.
 *          Empty arrays are placed at failed positions to maintain alignment.
 */
export async function embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
  if (texts.length === 0) return { embeddings: [], failedIndexes: [] };

  const model = getEmbeddingModel();

  // Ollama works better with smaller batches
  const BATCH_SIZE = 10;
  const allEmbeddings: number[][] = [];
  const failedIndexes: number[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchEndIndex = Math.min(i + BATCH_SIZE, texts.length);

    try {
      const { embeddings } = await embedMany({
        model,
        values: batch,
      });
      allEmbeddings.push(...embeddings);
    } catch (error) {
      console.error(
        `[embedBatch] Batch ${i}-${batchEndIndex} failed, falling back to individual embedding:`,
        error
      );
      // Fall back to one-by-one for this batch
      for (let j = 0; j < batch.length; j++) {
        const textIndex = i + j;
        const textPreview = batch[j].slice(0, 50).replace(/\n/g, ' ');
        try {
          const { embedding } = await embed({
            model,
            value: batch[j],
          });
          allEmbeddings.push(embedding);
        } catch (singleError) {
          console.error(
            `[embedBatch] Single embedding failed for index ${textIndex} ("${textPreview}..."):`,
            singleError
          );
          // Push empty embedding to maintain alignment
          allEmbeddings.push([]);
          failedIndexes.push(textIndex);
        }
      }
    }
  }

  if (failedIndexes.length > 0) {
    console.warn(
      `[embedBatch] ${failedIndexes.length}/${texts.length} embeddings failed at indexes: ${failedIndexes.join(', ')}`
    );
  }

  return { embeddings: allEmbeddings, failedIndexes };
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same dimension');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Format embedding as PostgreSQL vector string
 */
export function toVectorString(embedding: number[]): string {
  return '[' + embedding.join(',') + ']';
}
