import { createOllama } from 'ai-sdk-ollama';
import { Agent, setGlobalDispatcher } from 'undici';

/**
 * Configure global fetch dispatcher with extended timeouts for slow AI models.
 *
 * Node.js native fetch uses undici internally with a default headersTimeout
 * of 30 seconds. This causes UND_ERR_HEADERS_TIMEOUT errors when calling
 * Ollama models like qwen3:8b that take 2-5 minutes per inference.
 *
 * By setting a global dispatcher, all fetch calls (including those from
 * the Ollama client) will use extended timeouts.
 */
const extendedTimeoutAgent = new Agent({
  headersTimeout: 600000, // 10 minutes (in milliseconds)
  bodyTimeout: 600000, // 10 minutes
  keepAliveTimeout: 600000, // 10 minutes
});

setGlobalDispatcher(extendedTimeoutAgent);

// Use Ollama provider with explicit IPv4 address to avoid IPv6 connection issues on Windows
// Windows resolves 'localhost' to ::1 (IPv6) first, but Ollama only listens on 127.0.0.1 (IPv4)
const ollamaProvider = createOllama({
  baseURL: 'http://127.0.0.1:11434',
});

/**
 * Get the extraction model (Hermes 2 Pro Mistral 7B via Ollama)
 *
 * Hermes 2 Pro Mistral 7B is fine-tuned for function calling and JSON mode:
 *   - 90% function calling accuracy (best in class for 7B)
 *   - 84% JSON mode accuracy
 *   - Trained specifically for structured output tasks
 *   - Using custom model with 32K context (vs 4K Ollama default)
 *
 * Note: Returns any type for flexibility with AI SDK.
 * Using ai-sdk-ollama v3+ (v2 spec compatible with AI SDK v6).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getExtractionModel(): any {
  // Hermes 2 Pro with extended 32K context for complex schema generation
  return ollamaProvider('hermes2pro-32k');
}

/**
 * Get the embedding model (mxbai-embed-large via Ollama)
 *
 * mxbai-embed-large is best-in-class for local embeddings:
 *   - MTEB score 64.68 (outperforms OpenAI text-embedding-3-large)
 *   - 1,024 dimensions, only 1.2GB VRAM
 *   - Best accuracy for document retrieval and grounding verification
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEmbeddingModel(): any {
  // mxbai-embed-large: highest MTEB score (64.68), 1.2GB VRAM
  // Outperforms commercial models on retrieval tasks
  return ollamaProvider.embedding('mxbai-embed-large');
}

/**
 * Check if Ollama is available
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}
