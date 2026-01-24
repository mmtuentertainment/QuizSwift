import { openai } from '@ai-sdk/openai';
import { ollama } from 'ollama-ai-provider';

export type Tier = 'free' | 'paid';

/**
 * Get the extraction model based on user tier
 * Free tier: Ollama (local, llama3.1)
 * Paid tier: OpenAI (gpt-4o)
 *
 * Note: Returns any type due to Ollama (V1) and OpenAI (V3) using different
 * @ai-sdk/provider versions. Both are compatible at runtime with generateObject.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getExtractionModel(tier: Tier = 'paid'): any {
  if (tier === 'free') {
    // Requires Ollama running locally with llama3.1 model
    return ollama('llama3.1');
  }

  return openai('gpt-4o');
}

/**
 * Get the embedding model based on user tier
 * Free tier: Ollama (nomic-embed-text)
 * Paid tier: OpenAI (text-embedding-3-small)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEmbeddingModel(tier: Tier = 'paid'): any {
  if (tier === 'free') {
    return ollama.textEmbeddingModel('nomic-embed-text');
  }

  return openai.embeddingModel('text-embedding-3-small');
}

/**
 * Check if Ollama is available for free tier
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}
