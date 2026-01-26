import type { PagedText, PageText } from './extract-text';

// Threshold: if average chars per page is below this, likely scanned
const LOW_TEXT_THRESHOLD = 100;

// Threshold for individual page detection
const PAGE_LOW_TEXT_THRESHOLD = 50;

/**
 * Check if a single page appears to be scanned (low text content)
 */
export function isLowTextPage(page: PageText): boolean {
  return page.charCount < PAGE_LOW_TEXT_THRESHOLD;
}

/**
 * Detect if a PDF is likely scanned (image-based rather than text-native)
 * @param pagedText - Result from extractTextWithPages
 * @returns true if PDF appears to be scanned and needs OCR
 */
export function detectScannedPdf(pagedText: PagedText): boolean {
  if (pagedText.totalPages === 0) {
    return true; // Empty PDF, treat as needing OCR
  }

  const totalChars = pagedText.pages.reduce((sum, page) => sum + page.charCount, 0);
  const avgCharsPerPage = totalChars / pagedText.totalPages;

  return avgCharsPerPage < LOW_TEXT_THRESHOLD;
}

/**
 * Get list of page numbers that need OCR processing
 * (pages with very low text content in an otherwise text-native PDF)
 */
export function getPagesNeedingOcr(pagedText: PagedText): number[] {
  return pagedText.pages.filter((page) => isLowTextPage(page)).map((page) => page.pageNumber);
}

export interface ScanDetectionResult {
  isScanned: boolean;
  avgCharsPerPage: number;
  totalPages: number;
  pagesNeedingOcr: number[];
}

/**
 * Full scan detection with details
 */
export function analyzePdfForOcr(pagedText: PagedText): ScanDetectionResult {
  const totalChars = pagedText.pages.reduce((sum, page) => sum + page.charCount, 0);

  return {
    isScanned: detectScannedPdf(pagedText),
    avgCharsPerPage: pagedText.totalPages > 0 ? totalChars / pagedText.totalPages : 0,
    totalPages: pagedText.totalPages,
    pagesNeedingOcr: getPagesNeedingOcr(pagedText),
  };
}
