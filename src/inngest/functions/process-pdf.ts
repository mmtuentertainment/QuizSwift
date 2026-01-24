import { inngest } from '../client';
import { prisma } from '@/lib/prisma';
import { embedBatch, toVectorString } from '@/lib/ai/embed';
import { detectTier } from '@/lib/ai/providers';

// Types imported for type checking only - actual modules are dynamically imported
import type { PagedText, PageText } from '@/lib/pdf/extract-text';
import type { ScanDetectionResult } from '@/lib/pdf/detect-scanned';
import type { RenderedPage } from '@/lib/pdf/render-pages';
import type { OcrResult } from '@/lib/pdf/ocr';
import type { Chunk } from '@/lib/pdf/chunk';

export const processPdf = inngest.createFunction(
  {
    id: 'process-pdf',
    retries: 3,
    onFailure: async ({ event, error }) => {
      // Update document status on failure
      // The failure event wraps the original event in event.data.event
      const originalEvent = event.data.event as { data: { documentId: string } };
      const documentId = originalEvent?.data?.documentId;

      if (documentId) {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: 'failed',
            errorMessage: error.message,
          },
        });
      }
    },
  },
  { event: 'pdf/uploaded' },
  async ({ event, step }) => {
    const { documentId, fileUrl } = event.data;

    // Step 1: Update status to processing
    await step.run('update-status-processing', async () => {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'processing' },
      });
    });

    // Step 2: Extract text from PDF
    // Use dynamic import to avoid bundling pdfjs-dist at build time
    const textResult = await step.run('extract-text', async () => {
      const { extractTextFromUrl } = await import('@/lib/pdf/extract-text');
      const pagedText = await extractTextFromUrl(fileUrl);
      return pagedText;
    });

    // Step 3: Analyze for OCR needs
    const ocrAnalysis = await step.run('analyze-for-ocr', async () => {
      const { analyzePdfForOcr } = await import('@/lib/pdf/detect-scanned');
      return analyzePdfForOcr(textResult);
    });

    // Step 4: Run OCR if needed (full implementation with page rendering)
    let finalPages: PageText[] = textResult.pages;
    if (ocrAnalysis.isScanned && ocrAnalysis.pagesNeedingOcr.length > 0) {
      const ocrResult = await step.run('run-ocr', async () => {
        try {
          // Dynamic imports for heavy PDF/OCR modules
          const { fetchPdfBuffer } = await import('@/lib/pdf/extract-text');
          const { renderPagesToImages } = await import('@/lib/pdf/render-pages');
          const { ocrRenderedPages, mergeOcrWithExtracted } = await import('@/lib/pdf/ocr');

          // Fetch PDF buffer for rendering
          const pdfBuffer = await fetchPdfBuffer(fileUrl);

          // Render pages that need OCR
          const renderedPages = await renderPagesToImages(
            pdfBuffer,
            ocrAnalysis.pagesNeedingOcr,
            2.0 // 2x scale for better OCR quality
          );

          // Run OCR on rendered pages
          const ocrResults = await ocrRenderedPages(renderedPages, 'eng');

          // Merge OCR results with extracted text
          const mergedPages = mergeOcrWithExtracted(textResult.pages, ocrResults);

          return { success: true, pages: mergedPages };
        } catch (ocrError) {
          // OCR failed (possibly canvas not installed) - log and continue
          console.warn(
            `OCR failed for document ${documentId}: ${ocrError}. Using extracted text only.`
          );
          return { success: false, pages: textResult.pages };
        }
      });

      finalPages = ocrResult.pages;

      // Update document with OCR status
      if (!ocrResult.success) {
        await step.run('log-ocr-warning', async () => {
          await prisma.document.update({
            where: { id: documentId },
            data: {
              errorMessage: 'Scanned PDF detected. OCR processing was attempted but text extraction may be limited.',
            },
          });
        });
      }
    }

    // Step 5: Update document with page count
    await step.run('update-page-count', async () => {
      await prisma.document.update({
        where: { id: documentId },
        data: { totalPages: textResult.totalPages },
      });
    });

    // Step 6: Chunk text with citations
    const chunks = await step.run('chunk-text', async () => {
      const { chunkTextWithCitations } = await import('@/lib/pdf/chunk');
      return chunkTextWithCitations(finalPages, documentId, {
        chunkSize: 500,
        overlap: 100,
      });
    });

    // Step 7: Generate embeddings for all chunks
    const chunkEmbeddings = await step.run('generate-embeddings', async () => {
      if (chunks.length === 0) return [];

      // Extract chunk contents for batch embedding
      const chunkTexts = chunks.map((c) => c.content);
      console.log(`[process-pdf] Generating embeddings for ${chunkTexts.length} chunks using tier: ${detectTier()}`);

      try {
        // Generate embeddings in batch (more efficient than one-by-one)
        // Use detectTier() to automatically select Ollama (free) or OpenAI (paid)
        const embeddings = await embedBatch(chunkTexts, detectTier());
        console.log(`[process-pdf] Generated ${embeddings.length} embeddings, first has ${embeddings[0]?.length || 0} dimensions`);
        return embeddings;
      } catch (embeddingError) {
        console.error('[process-pdf] Embedding generation failed:', embeddingError);
        throw embeddingError;
      }
    });

    // Step 8: Store chunks with embeddings in database
    const storedChunks = await step.run('store-chunks', async () => {
      // Delete any existing chunks (in case of retry)
      await prisma.sourceChunk.deleteMany({
        where: { documentId },
      });

      // Store chunks one-by-one to include embedding via raw SQL
      // (Prisma doesn't support vector type directly in createMany)
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = chunkEmbeddings[i];

        if (embedding && embedding.length > 0) {
          // Insert with embedding using raw SQL
          await prisma.$executeRaw`
            INSERT INTO "SourceChunk" (
              id, "documentId", content, "pageNumber", "chunkIndex",
              "startChar", "endChar", embedding, "createdAt"
            ) VALUES (
              ${`chunk_${documentId}_${i}`},
              ${documentId},
              ${chunk.content},
              ${chunk.pageNumber},
              ${chunk.chunkIndex},
              ${chunk.startChar},
              ${chunk.endChar},
              ${toVectorString(embedding)}::vector,
              NOW()
            )
          `;
        } else {
          // Insert without embedding (fallback)
          await prisma.sourceChunk.create({
            data: {
              id: `chunk_${documentId}_${i}`,
              documentId,
              content: chunk.content,
              pageNumber: chunk.pageNumber,
              chunkIndex: chunk.chunkIndex,
              startChar: chunk.startChar,
              endChar: chunk.endChar,
            },
          });
        }
      }

      return chunks.length;
    });

    // Step 9: Update status to extracting (ready for AI)
    await step.run('update-status-extracting', async () => {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'extracting',
          errorMessage: null, // Clear any warnings
        },
      });
    });

    // Trigger next step in pipeline - route based on requestedQuestionCount
    await step.run('trigger-next-step', async () => {
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { requestedQuestionCount: true },
      });

      if (doc?.requestedQuestionCount) {
        // New curation pipeline for documents with question count
        await inngest.send({
          name: 'pdf/curation.ready',
          data: { documentId },
        });
      } else {
        // Legacy extraction pipeline for backward compatibility
        await inngest.send({
          name: 'pdf/processing.complete',
          data: {
            documentId,
            chunksCreated: storedChunks,
            totalPages: textResult.totalPages,
          },
        });
      }
    });

    return {
      documentId,
      totalPages: textResult.totalPages,
      chunksCreated: storedChunks,
      ocrNeeded: ocrAnalysis.isScanned,
      pagesOcrd: ocrAnalysis.pagesNeedingOcr.length,
      embeddingsGenerated: chunkEmbeddings.length,
    };
  }
);
