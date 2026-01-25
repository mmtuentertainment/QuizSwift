import { inngest } from '../client';
import { prisma } from '@/lib/prisma';
import {
  runPass1ContentAnalysis,
  runPass2ConceptExtraction,
  runPass3QuestionGeneration,
  runPass4Evaluation,
  runPass5FinalSelection,
  buildCuratedQuestions,
} from '@/lib/ai/curate-questions';

/**
 * Intelligent Question Curation Job
 *
 * 5-pass reasoning pipeline with Inngest checkpointing:
 * Each AI pass is a separate step.run() call, allowing:
 * - Independent timeout per pass (up to 5 minutes each)
 * - Automatic checkpointing between passes
 * - Retry individual passes without rerunning entire pipeline
 *
 * Pass flow:
 * 1. Content Analysis - Understand document structure and content
 * 2. Concept Extraction - Identify key concepts and prerequisites
 * 3. Question Generation - Generate 2x requested questions
 * 4. Self-Evaluation - Score and evaluate each question
 * 5. Final Selection - Rank and select best questions for curation pool
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

    console.log(`[curate-questions] Starting curation for document ${documentId}`);

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

    // Initialize timing stats
    const passTimings: Record<string, number> = {};
    let totalTokens = 0;

    // Step 3: Pass 1 - Content Analysis
    console.log(`[curate-questions] Starting Pass 1: Content Analysis`);
    const pass1 = await step.run('pass-1-content-analysis', async () => {
      const result = await runPass1ContentAnalysis(fullText);
      console.log(`[curate-questions] Pass 1 complete in ${result.durationMs}ms`);
      return result;
    });
    passTimings.pass1 = pass1.durationMs;
    totalTokens += pass1.tokens;

    // Step 4: Pass 2 - Concept Extraction
    console.log(`[curate-questions] Starting Pass 2: Concept Extraction`);
    const pass2 = await step.run('pass-2-concept-extraction', async () => {
      const result = await runPass2ConceptExtraction(fullText, pass1.output);
      console.log(`[curate-questions] Pass 2 complete in ${result.durationMs}ms`);
      return result;
    });
    passTimings.pass2 = pass2.durationMs;
    totalTokens += pass2.tokens;

    // Step 5: Pass 3 - Question Generation (2x count)
    console.log(`[curate-questions] Starting Pass 3: Question Generation for ${requestedCount * 2} questions`);
    const pass3 = await step.run('pass-3-question-generation', async () => {
      const result = await runPass3QuestionGeneration(
        fullText,
        pass1.output,
        pass2.output,
        requestedCount
      );
      console.log(`[curate-questions] Pass 3 complete in ${result.durationMs}ms, generated ${result.output.questions.length} questions`);
      return result;
    });
    passTimings.pass3 = pass3.durationMs;
    totalTokens += pass3.tokens;

    // Step 6: Pass 4 - Self-Evaluation
    console.log(`[curate-questions] Starting Pass 4: Self-Evaluation`);
    const pass4 = await step.run('pass-4-evaluation', async () => {
      const result = await runPass4Evaluation(pass1.output, pass3.output);
      console.log(`[curate-questions] Pass 4 complete in ${result.durationMs}ms`);
      return result;
    });
    passTimings.pass4 = pass4.durationMs;
    totalTokens += pass4.tokens;

    // Step 7: Pass 5 - Final Selection
    console.log(`[curate-questions] Starting Pass 5: Final Selection`);
    const pass5 = await step.run('pass-5-final-selection', async () => {
      const result = await runPass5FinalSelection(
        pass1.output,
        pass2.output,
        pass3.output,
        pass4.output,
        requestedCount
      );
      console.log(`[curate-questions] Pass 5 complete in ${result.durationMs}ms, selected ${result.output.selectedForPool.length} questions`);
      return result;
    });
    passTimings.pass5 = pass5.durationMs;
    totalTokens += pass5.tokens;

    // Step 8: Store curation metadata on document
    await step.run('store-curation-metadata', async () => {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          curationStatus: 'curating',
          contentAnalysis: pass1.output as object,
          conceptExtraction: pass2.output as object,
          bloomDistribution: pass3.output.bloomDistribution as object,
        },
      });
    });

    // Step 9: Build and store curated questions
    const storedCount = await step.run('store-curated-questions', async () => {
      // Delete any existing curated questions (in case of retry)
      await prisma.curatedQuestion.deleteMany({
        where: { documentId },
      });

      // Build final curated questions from pass results
      const curatedQuestions = buildCuratedQuestions(
        pass2.output,
        pass3.output,
        pass4.output,
        pass5.output
      );

      // Get concept names for denormalization
      const conceptMap = new Map(
        pass2.output.concepts.map(c => [c.id, c.name])
      );

      // Store all curated questions
      const questionsToCreate = curatedQuestions.map(q => {
        const evaluation = pass4.output.evaluations.find(
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

    // Step 10: Update document status to complete
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

    const totalDurationMs = Object.values(passTimings).reduce((a, b) => a + b, 0);
    console.log(`[curate-questions] Pipeline complete in ${totalDurationMs}ms, ${totalTokens} tokens`);

    return {
      documentId,
      questionsGenerated: storedCount.total,
      questionsInPool: storedCount.inPool,
      requestedCount,
      stats: {
        passTimings,
        totalTokens,
        totalDurationMs,
      },
    };
  }
);
