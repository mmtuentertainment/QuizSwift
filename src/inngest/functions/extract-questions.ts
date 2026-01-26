import { inngest } from '../client';
import { prisma } from '@/lib/prisma';
import { extractQuestionsFromChunks } from '@/lib/ai/extract-questions';
import { verifyGrounding } from '@/lib/ai/verify-grounding';

/**
 * CONT-05 Clarification: "Reject" means flagged=true, NOT deleted
 *
 * All extracted questions are stored. Questions that fail grounding verification
 * are marked with:
 * - verified: false
 * - flagged: true
 * - flagReason: explains why (low grounding score)
 *
 * Teachers see ALL questions but flagged ones have warnings.
 * This allows teachers to:
 * 1. Review flagged questions manually
 * 2. Edit and approve if the extraction was actually correct
 * 3. Delete if the extraction was truly wrong
 */
export const extractQuestionsJob = inngest.createFunction(
  {
    id: 'extract-questions',
    retries: 2,
    onFailure: async ({ event, error }) => {
      // Access the original event data from the wrapped failure event
      const originalEvent = event.data.event as { data: { documentId: string } };
      const documentId = originalEvent.data.documentId;
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'failed',
          errorMessage: `Extraction failed: ${error.message}`,
        },
      });
    },
  },
  { event: 'pdf/processing.complete' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Step 1: Load chunks from database
    const chunks = await step.run('load-chunks', async () => {
      return prisma.sourceChunk.findMany({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' },
        select: {
          id: true,
          content: true,
          pageNumber: true,
          chunkIndex: true,
        },
      });
    });

    if (chunks.length === 0) {
      await step.run('no-chunks-error', async () => {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: 'failed',
            errorMessage: 'No text chunks found in document',
          },
        });
      });
      return { error: 'No chunks found' };
    }

    // Step 2: Extract questions from each chunk
    const extractions = await step.run('extract-from-chunks', async () => {
      return extractQuestionsFromChunks(chunks);
    });

    // Step 3: Flatten and deduplicate questions
    // Overlapping chunks can extract the same question multiple times
    const allQuestions = await step.run('flatten-and-dedupe-questions', async () => {
      const flattened = extractions.flatMap((e) =>
        e.result.questions.map((q) => ({
          ...q,
          chunkPageNumber: e.pageNumber,
        }))
      );

      // Deduplicate by normalized question text (case-insensitive, whitespace-normalized)
      const seen = new Map<string, (typeof flattened)[0]>();
      for (const q of flattened) {
        const normalizedText = q.questionText.toLowerCase().replace(/\s+/g, ' ').trim();

        // Keep the first occurrence (usually from earlier chunk with better context)
        if (!seen.has(normalizedText)) {
          seen.set(normalizedText, q);
        }
      }

      return Array.from(seen.values());
    });

    if (allQuestions.length === 0) {
      await step.run('no-questions-found', async () => {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: 'completed',
            errorMessage: 'No quiz questions found in document',
          },
        });
      });
      return { questionsCreated: 0, verified: 0, flagged: 0 };
    }

    // Step 4: Verify each question against source using vector similarity
    const verifiedQuestions = await step.run('verify-questions', async () => {
      const results: Array<{
        question: (typeof allQuestions)[0];
        verified: boolean;
        similarity: number;
        sourceChunkId: string | null;
        status: string;
      }> = [];

      for (const question of allQuestions) {
        const verification = await verifyGrounding(
          {
            questionText: question.questionText,
            questionType: question.questionType,
            options: question.options,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            sourceQuote: question.sourceQuote,
          },
          documentId
        );

        results.push({
          question,
          verified: verification.verified,
          similarity: verification.similarity,
          sourceChunkId: verification.sourceChunkId,
          status: verification.status,
        });
      }

      return results;
    });

    // Step 5: Store ALL questions (verified AND flagged) in database
    // CONT-05: "Reject" means flagged=true, not deleted
    const storedCounts = await step.run('store-questions', async () => {
      // Delete any existing questions (in case of retry)
      await prisma.extractedQuestion.deleteMany({
        where: { documentId },
      });

      let verified = 0;
      let flagged = 0;

      for (const { question, ...verification } of verifiedQuestions) {
        // Flag if not verified (below GROUNDING_THRESHOLD)
        const isFlagged = !verification.verified;

        // Generate flag reason based on status
        let flagReason: string | null = null;
        if (isFlagged) {
          if (verification.status === 'weak') {
            flagReason = `Weak grounding (${(verification.similarity * 100).toFixed(1)}% match) - review recommended`;
          } else {
            flagReason = `Could not verify against source (${(verification.similarity * 100).toFixed(1)}% match) - manual review required`;
          }
        }

        await prisma.extractedQuestion.create({
          data: {
            documentId,
            questionText: question.questionText,
            questionType: question.questionType,
            // Prisma Json type needs undefined for null values
            options: question.options ?? undefined,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            sourceQuote: question.sourceQuote,
            pageNumber: question.chunkPageNumber,
            verified: verification.verified,
            verificationScore: verification.similarity,
            sourceChunkId: verification.sourceChunkId,
            flagged: isFlagged,
            flagReason,
          },
        });

        if (verification.verified) {
          verified++;
        } else {
          flagged++;
        }
      }

      return { total: verifiedQuestions.length, verified, flagged };
    });

    // Step 6: Update document status to completed
    await step.run('update-status-completed', async () => {
      // Include summary in document if there are flagged questions
      const warningMessage =
        storedCounts.flagged > 0
          ? `${storedCounts.flagged} of ${storedCounts.total} questions flagged for review`
          : null;

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'completed',
          errorMessage: warningMessage,
        },
      });
    });

    return {
      documentId,
      questionsCreated: storedCounts.total,
      verified: storedCounts.verified,
      flagged: storedCounts.flagged,
    };
  }
);
