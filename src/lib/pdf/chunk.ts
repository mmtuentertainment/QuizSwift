import type { PageText } from './extract-text';

export interface Chunk {
  content: string;
  pageNumber: number;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  documentId: string;
}

export interface ChunkOptions {
  chunkSize?: number;  // Target size in characters
  overlap?: number;    // Overlap between chunks
  minChunkSize?: number; // Minimum chunk size (avoid tiny final chunks)
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  chunkSize: 500,
  overlap: 100,
  minChunkSize: 50,
};

/**
 * Split text into overlapping chunks while preserving page boundaries
 * Each chunk tracks its source page and character positions
 */
export function chunkTextWithCitations(
  pages: PageText[],
  documentId: string,
  options: ChunkOptions = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: Chunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    if (page.charCount === 0) {
      continue; // Skip empty pages
    }

    let start = 0;
    let pageChunkIndex = 0;

    while (start < page.content.length) {
      // Calculate end position
      let end = Math.min(start + opts.chunkSize, page.content.length);

      // Try to break at sentence boundary if not at end of page
      if (end < page.content.length) {
        const searchStart = Math.max(start + opts.minChunkSize, end - 100);
        const searchText = page.content.slice(searchStart, end);

        // Find last sentence boundary (. ! ? followed by space or end)
        const sentenceEnd = searchText.search(/[.!?]\s*$/);
        if (sentenceEnd !== -1) {
          end = searchStart + sentenceEnd + 1;
        }
      }

      const content = page.content.slice(start, end).trim();

      // Only add non-empty chunks
      if (content.length >= opts.minChunkSize || start + opts.chunkSize >= page.content.length) {
        chunks.push({
          content,
          pageNumber: page.pageNumber,
          chunkIndex: globalChunkIndex++,
          startChar: start,
          endChar: end,
          documentId,
        });
        pageChunkIndex++;
      }

      // Move forward with overlap
      const nextStart = end - opts.overlap;

      // Prevent infinite loop: break if we're not making forward progress
      if (nextStart <= start || end >= page.content.length) {
        break;
      }

      start = nextStart;
    }
  }

  return chunks;
}

/**
 * Find the chunk that best matches a given text excerpt
 * Useful for mapping extracted questions back to source chunks
 */
export function findMatchingChunk(
  chunks: Chunk[],
  excerpt: string,
  minMatchRatio: number = 0.5
): Chunk | null {
  const excerptLower = excerpt.toLowerCase();

  let bestMatch: Chunk | null = null;
  let bestScore = 0;

  for (const chunk of chunks) {
    const chunkLower = chunk.content.toLowerCase();

    // Simple substring match score
    if (chunkLower.includes(excerptLower)) {
      return chunk; // Exact match
    }

    // Calculate word overlap
    const excerptWords = new Set(excerptLower.split(/\s+/));
    const chunkWords = new Set(chunkLower.split(/\s+/));
    const intersection = [...excerptWords].filter((w) => chunkWords.has(w));
    const score = intersection.length / excerptWords.size;

    if (score > bestScore && score >= minMatchRatio) {
      bestScore = score;
      bestMatch = chunk;
    }
  }

  return bestMatch;
}

/**
 * Get citation string for a chunk
 */
export function formatCitation(chunk: Chunk): string {
  return `Page ${chunk.pageNumber}`;
}
