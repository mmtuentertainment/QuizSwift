import { inngest } from '../client';
import { prisma } from '@/lib/prisma';
import { curateQuestions, CurationProgress } from '@/lib/ai';
import { detectTier } from '@/lib/ai/providers';

/**
 * Intelligent Question Curation Job
 *
 * Replaces the old chunk-by-chunk extraction with a 5-pass reasoning pipeline:
 * 1. Assembles full document text from chunks
 * 2. Runs 5-pass curation (analyze -> extract concepts -> generate -> evaluate -> select)
 * 3. Stores curated questions with evaluation scores
 * 4. Updates document status
 */
export const curateQuestionsJob = inngest.createFunction(
  {
    id: 'curate-questions',
    retries: 1, // Fewer retries since this is more expensive
    onFailure: async ({ event, error }) => {
      const originalEvent = event.data.event as { data: { documentId: string } };
      const documentId = originalEvent.data.documentId;
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'failed',
          curationStatus: 'failed',
          errorMessage: `Curation failed: ${error.message}`,
        },
      });
    },
  },
  { event: 'pdf/curation.ready' },
  async ({ event, step }) => {
    const { documentId } = event.data;

    // Determine tier and get document settings
    const tier = detectTier();
    console.log(`[curate-questions] Using tier: ${tier}`);

    // Step 1: Load document and chunks
    const { fullText, requestedCount } = await step.run('load-document', async () => {
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          requestedQuestionCount: true,
          chunks: {
            orderBy: { chunkIndex: 'asc' },
            select: { content: true },
          },
        },
      });

      if (!doc) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Assemble full document text from chunks
      const fullText = doc.chunks.map(c => c.content).join('\n\n');
      const requestedCount = doc.requestedQuestionCount ?? 15;

      return { fullText, requestedCount };
    });

    if (!fullText || fullText.trim().length === 0) {
      await step.run('no-content-error', async () => {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: 'failed',
            curationStatus: 'failed',
            errorMessage: 'No text content found in document',
          },
        });
      });
      return { error: 'No content found' };
    }

    // Step 2: Update status to analyzing
    await step.run('update-status-analyzing', async () => {
      await prisma.document.update({
        where: { id: documentId },
        data: { curationStatus: 'analyzing' },
      });
    });

    // Step 3: Run 5-pass curation pipeline
    const curationResult = await step.run('run-curation-pipeline', async () => {
      console.log(`[curate-questions] Starting 5-pass curation for ${requestedCount} questions (generating ${requestedCount * 2})`);

      const result = await curateQuestions(
        fullText,
        requestedCount,
        tier,
        (progress: CurationProgress) => {
          console.log(`[curate-questions] Pass ${progress.pass} (${progress.passName}): ${progress.status}${progress.durationMs ? ` - ${progress.durationMs}ms` : ''}`);
        }
      );

      console.log(`[curate-questions] Pipeline complete in ${result.stats.totalDurationMs}ms, ${result.stats.totalTokens} tokens`);
      return result;
    });

    // Step 4: Store curation metadata on document
    await step.run('store-curation-metadata', async () => {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          curationStatus: 'curating',
          contentAnalysis: curationResult.contentAnalysis as object,
          conceptExtraction: curationResult.conceptExtraction as object,
          bloomDistribution: curationResult.questionGeneration.bloomDistribution as object,
        },
      });
    });

    // Step 5: Store curated questions
    const storedCount = await step.run('store-curated-questions', async () => {
      // Delete any existing curated questions (in case of retry)
      await prisma.curatedQuestion.deleteMany({
        where: { documentId },
      });

      // Get concept names for denormalization
      const conceptMap = new Map(
        curationResult.conceptExtraction.concepts.map(c => [c.id, c.name])
      );

      // Store all curated questions
      const questionsToCreate = curationResult.curatedQuestions.map(q => {
        const evaluation = curationResult.questionEvaluation.evaluations.find(
          e => e.questionId === q.id
        );

        return {
          documentId,
          questionText: q.questionText,
          questionType: q.questionType,
          bloomLevel: q.bloomLevel,
          difficulty: q.difficulty,
          options: q.options ?? undefined,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          workingSteps: q.workingSteps ?? undefined,
          targetConceptId: q.targetConceptId,
          targetConceptName: conceptMap.get(q.targetConceptId) ?? 'Unknown',
          comprehensionRationale: q.comprehensionRationale,
          sourceEvidence: q.sourceEvidence,
          evaluationScore: q.evaluationScore,
          comprehensionDepth: evaluation?.comprehensionDepth ?? null,
          clarity: evaluation?.clarity ?? null,
          answerability: evaluation?.answerability ?? null,
          rank: q.rank,
          inCurationPool: q.selected,
          teacherSelected: false,
        };
      });

      await prisma.curatedQuestion.createMany({
        data: questionsToCreate,
      });

      return {
        total: questionsToCreate.length,
        inPool: questionsToCreate.filter(q => q.inCurationPool).length,
      };
    });

    // Step 6: Update document status to complete
    await step.run('update-status-complete', async () => {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'completed',
          curationStatus: 'complete',
          errorMessage: null,
        },
      });
    });

    return {
      documentId,
      questionsGenerated: storedCount.total,
      questionsInPool: storedCount.inPool,
      requestedCount,
      stats: curationResult.stats,
    };
  }
);
