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
 * AI Provider availability error with troubleshooting instructions
 */
export class AIProviderUnavailableError extends Error {
  constructor(provider: string, troubleshooting: string[]) {
    const message = [
      `AI provider "${provider}" is not available.`,
      '',
      'Troubleshooting steps:',
      ...troubleshooting.map((s, i) => `  ${i + 1}. ${s}`),
    ].join('\n');
    super(message);
    this.name = 'AIProviderUnavailableError';
  }
}

// Cache Ollama availability check (refreshed every 30 seconds)
let ollamaAvailableCache: { available: boolean; checkedAt: number } | null = null;
const CACHE_TTL_MS = 30000;

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
 * Check if Ollama is available (with caching to avoid repeated calls)
 */
export async function isOllamaAvailable(): Promise<boolean> {
  const now = Date.now();

  // Return cached result if still valid
  if (ollamaAvailableCache && now - ollamaAvailableCache.checkedAt < CACHE_TTL_MS) {
    return ollamaAvailableCache.available;
  }

  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags', {
      signal: AbortSignal.timeout(5000), // 5 second timeout for health check
    });
    const available = response.ok;
    ollamaAvailableCache = { available, checkedAt: now };
    return available;
  } catch {
    ollamaAvailableCache = { available: false, checkedAt: now };
    return false;
  }
}

/**
 * Ensure Ollama is available before returning model, with actionable error message
 */
export async function ensureOllamaAvailable(): Promise<void> {
  const available = await isOllamaAvailable();
  if (!available) {
    throw new AIProviderUnavailableError('Ollama', [
      'Ensure Ollama is installed: https://ollama.com/download',
      'Start Ollama service: ollama serve',
      'Pull required model: ollama pull hermes2pro-32k',
      'Check if port 11434 is accessible: curl http://127.0.0.1:11434/api/tags',
    ]);
  }
}

/**
 * Get extraction model with availability check
 * Call this instead of getExtractionModel() when you need guaranteed availability
 */
export async function getExtractionModelSafe(): Promise<ReturnType<typeof getExtractionModel>> {
  await ensureOllamaAvailable();
  return getExtractionModel();
}

/**
 * Get embedding model with availability check
 * Call this instead of getEmbeddingModel() when you need guaranteed availability
 */
export async function getEmbeddingModelSafe(): Promise<ReturnType<typeof getEmbeddingModel>> {
  await ensureOllamaAvailable();
  return getEmbeddingModel();
}
