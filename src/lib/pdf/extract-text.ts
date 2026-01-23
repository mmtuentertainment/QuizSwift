import { extractText, getDocumentProxy } from 'unpdf';

export interface PageText {
  pageNumber: number;
  content: string;
  charCount: number;
}

export interface PagedText {
  totalPages: number;
  pages: PageText[];
}

/**
 * Extract text from a PDF buffer with page-by-page tracking
 * @param buffer - PDF file as ArrayBuffer or Uint8Array
 * @returns Object with total pages and per-page text content
 */
export async function extractTextWithPages(
  buffer: ArrayBuffer | Uint8Array
): Promise<PagedText> {
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const pdf = await getDocumentProxy(uint8);

  const { totalPages, text } = await extractText(pdf, { mergePages: false });

  // When mergePages: false, text is string[] - one per page
  const textArray = text as string[];

  return {
    totalPages,
    pages: textArray.map((content, index) => ({
      pageNumber: index + 1,
      content: content.trim(),
      charCount: content.trim().length,
    })),
  };
}

/**
 * Extract text from a PDF at a URL
 * @param url - URL to fetch PDF from
 */
export async function extractTextFromUrl(url: string): Promise<PagedText> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  return extractTextWithPages(buffer);
}

/**
 * Get raw PDF buffer from URL for rendering
 */
export async function fetchPdfBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }
  return response.arrayBuffer();
}
