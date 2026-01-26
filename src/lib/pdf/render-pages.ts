import * as pdfjs from 'pdfjs-dist';

// Set worker source for pdfjs (required for Node.js environment)
// In Next.js, we'll use the legacy build for server-side
if (typeof window === 'undefined') {
  // Server-side: use legacy build without worker
  pdfjs.GlobalWorkerOptions.workerSrc = '';
}

export interface RenderedPage {
  pageNumber: number;
  imageBuffer: Uint8Array;
  width: number;
  height: number;
}

/**
 * Render a single PDF page to an image buffer (PNG format)
 * Uses canvas for rendering - works in Node.js with canvas package
 */
export async function renderPageToImage(
  pdfBuffer: ArrayBuffer,
  pageNumber: number,
  scale: number = 2.0 // 2x scale for better OCR quality
): Promise<RenderedPage> {
  const uint8 = new Uint8Array(pdfBuffer);
  const pdf = await pdfjs.getDocument({
    data: uint8,
    useSystemFonts: true,
    // Disable worker for server-side rendering
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;

  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  // Create canvas for rendering
  // In Node.js, we need the canvas package
  const { createCanvas } = await import('canvas');
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  // pdfjs-dist v5 requires canvas in addition to canvasContext
  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
    canvas: canvas as unknown as HTMLCanvasElement,
  }).promise;

  // Convert to PNG buffer
  const pngBuffer = canvas.toBuffer('image/png');

  await pdf.destroy();

  return {
    pageNumber,
    imageBuffer: new Uint8Array(pngBuffer),
    width: viewport.width,
    height: viewport.height,
  };
}

/**
 * Render multiple PDF pages to images
 * Processes sequentially to manage memory
 */
export async function renderPagesToImages(
  pdfBuffer: ArrayBuffer,
  pageNumbers: number[],
  scale: number = 2.0,
  onProgress?: (current: number, total: number) => void
): Promise<RenderedPage[]> {
  const results: RenderedPage[] = [];

  for (let i = 0; i < pageNumbers.length; i++) {
    const pageNumber = pageNumbers[i];

    if (onProgress) {
      onProgress(i + 1, pageNumbers.length);
    }

    const rendered = await renderPageToImage(pdfBuffer, pageNumber, scale);
    results.push(rendered);
  }

  return results.sort((a, b) => a.pageNumber - b.pageNumber);
}

/**
 * Get total page count from a PDF
 */
export async function getPdfPageCount(pdfBuffer: ArrayBuffer): Promise<number> {
  const uint8 = new Uint8Array(pdfBuffer);
  const pdf = await pdfjs.getDocument({
    data: uint8,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  const count = pdf.numPages;
  await pdf.destroy();

  return count;
}
