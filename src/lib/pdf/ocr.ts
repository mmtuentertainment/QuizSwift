import { createWorker, Worker } from 'tesseract.js';
import type { RenderedPage } from './render-pages';

export interface OcrResult {
  pageNumber: number;
  text: string;
  confidence: number;
}

/**
 * OCR a single page image
 * Creates and terminates worker for each page to prevent memory leaks
 */
export async function ocrPage(
  imageBuffer: Buffer | Uint8Array,
  pageNumber: number,
  language: string = 'eng'
): Promise<OcrResult> {
  let worker: Worker | null = null;

  try {
    worker = await createWorker(language);

    // Convert to Buffer if needed - tesseract.js requires Buffer type
    const buffer = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);

    const { data } = await worker.recognize(buffer);

    return {
      pageNumber,
      text: data.text.trim(),
      confidence: data.confidence,
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

/**
 * OCR a rendered page (combines rendering and OCR)
 */
export async function ocrRenderedPage(
  renderedPage: RenderedPage,
  language: string = 'eng'
): Promise<OcrResult> {
  return ocrPage(renderedPage.imageBuffer, renderedPage.pageNumber, language);
}

/**
 * OCR multiple page images sequentially
 * Processes one at a time to manage memory
 */
export async function ocrAllPages(
  pageImages: Array<{ buffer: Buffer | Uint8Array; pageNumber: number }>,
  language: string = 'eng',
  onProgress?: (current: number, total: number) => void
): Promise<OcrResult[]> {
  const results: OcrResult[] = [];

  for (let i = 0; i < pageImages.length; i++) {
    const { buffer, pageNumber } = pageImages[i];

    if (onProgress) {
      onProgress(i + 1, pageImages.length);
    }

    const result = await ocrPage(buffer, pageNumber, language);
    results.push(result);
  }

  return results.sort((a, b) => a.pageNumber - b.pageNumber);
}

/**
 * OCR rendered pages (from renderPagesToImages output)
 */
export async function ocrRenderedPages(
  renderedPages: RenderedPage[],
  language: string = 'eng',
  onProgress?: (current: number, total: number) => void
): Promise<OcrResult[]> {
  const pageImages = renderedPages.map((rp) => ({
    buffer: rp.imageBuffer,
    pageNumber: rp.pageNumber,
  }));
  return ocrAllPages(pageImages, language, onProgress);
}

/**
 * Merge OCR results into PagedText format
 */
export function mergeOcrWithExtracted(
  extractedPages: Array<{ pageNumber: number; content: string; charCount: number }>,
  ocrResults: OcrResult[]
): Array<{ pageNumber: number; content: string; charCount: number }> {
  const ocrByPage = new Map(ocrResults.map((r) => [r.pageNumber, r]));

  return extractedPages.map((page) => {
    const ocrResult = ocrByPage.get(page.pageNumber);

    // If OCR result exists and has more content, use it
    if (ocrResult && ocrResult.text.length > page.charCount) {
      return {
        pageNumber: page.pageNumber,
        content: ocrResult.text,
        charCount: ocrResult.text.length,
      };
    }

    return page;
  });
}
