import { embed, embedMany } from 'ai';
import { getEmbeddingModel } from './providers';
import type { Tier } from './providers';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

/**
 * Embed a single text string
 */
export async function embedText(
  text: string,
  tier: Tier = 'paid'
): Promise<number[]> {
  const model = getEmbeddingModel(tier);

  const { embedding } = await embed({
    model,
    value: text,
  });

  return embedding;
}

/**
 * Embed multiple texts in batch
 */
export async function embedBatch(
  texts: string[],
  tier: Tier = 'paid'
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = getEmbeddingModel(tier);

  const { embeddings } = await embedMany({
    model,
    values: texts,
  });

  return embeddings;
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
