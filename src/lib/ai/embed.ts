import { embed, embedMany } from 'ai';
import { getEmbeddingModel } from './providers';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
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
 * Embed multiple texts in batch
 * Ollama works better with smaller batches, so we process in chunks of 10
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = getEmbeddingModel();

  // Ollama works better with smaller batches
  const BATCH_SIZE = 10;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    try {
      const { embeddings } = await embedMany({
        model,
        values: batch,
      });
      allEmbeddings.push(...embeddings);
    } catch (error) {
      console.error(`Embedding batch ${i}-${i + batch.length} failed:`, error);
      // Fall back to one-by-one for this batch
      for (const text of batch) {
        try {
          const { embedding } = await embed({
            model,
            value: text,
          });
          allEmbeddings.push(embedding);
        } catch (singleError) {
          console.error('Single embedding failed:', singleError);
          // Push empty embedding to maintain alignment
          allEmbeddings.push([]);
        }
      }
    }
  }

  return allEmbeddings;
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
