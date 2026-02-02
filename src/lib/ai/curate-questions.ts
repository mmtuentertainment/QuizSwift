import { generateText, Output } from 'ai';
import { getExtractionModel, ensureOllamaAvailable } from './providers';
import {
  ContentAnalysisSchema,
  ConceptExtractionSchema,
  QuestionGenerationSchema,
  QuestionEvaluationSchema,
  FinalSelectionSchema,
  type ContentAnalysis,
  type ConceptExtraction,
  type QuestionGeneration,
  type QuestionEvaluation,
  type FinalSelection,
  type StorableCuratedQuestion,
  type CuratedQuestion,
} from './schemas';
import {
  buildPass1Prompt,
  buildPass1SystemPrompt,
  buildPass2Prompt,
  buildPass3Prompt,
  buildPass4Prompt,
  buildPass5Prompt,
} from './prompts';

// Re-export types for use in Inngest steps
export type {
  ContentAnalysis,
  ConceptExtraction,
  QuestionGeneration,
  QuestionEvaluation,
  FinalSelection,
  StorableCuratedQuestion,
};

export interface CurationResult {
  contentAnalysis: ContentAnalysis;
  conceptExtraction: ConceptExtraction;
  questionGeneration: QuestionGeneration;
  questionEvaluation: QuestionEvaluation;
  finalSelection: FinalSelection;
  curatedQuestions: StorableCuratedQuestion[];
  stats: {
    passTimings: Record<string, number>;
    totalTokens: number;
    totalDurationMs: number;
  };
}

export interface CurationProgress {
  pass: number;
  passName: string;
  status: 'running' | 'complete' | 'failed';
  durationMs?: number;
}

export interface PassResult<T> {
  output: T;
  durationMs: number;
  tokens: number;
}

/**
 * Anti-patterns that indicate a True/False question is actually a comparison/preference question.
 * Duplicated from schemas for runtime validation without Zod overhead.
 */
const TRUE_FALSE_ANTI_PATTERNS = [
  'which is better',
  'which one',
  'compare',
  'prefer',
  'would you rather',
  'what is your',
  'which do you',
  'opinion',
  'favorite',
];

/**
 * Validates question format matches its declared type.
 *
 * @param question - The question to validate
 * @returns Validation result with reason if invalid
 */
export function validateQuestionFormat(question: CuratedQuestion): {
  valid: boolean;
  reason?: string;
} {
  // Fill-in-blank: must have blank marker
  if (question.questionType === 'fill_in_blank') {
    const hasMarker =
      question.questionText.includes('___') || question.questionText.includes('[BLANK]');
    if (!hasMarker) {
      return {
        valid: false,
        reason: 'Fill-in-blank question missing ___ or [BLANK] marker',
      };
    }
  }

  // True/False: answer must be True or False
  if (question.questionType === 'true_false') {
    const normalized = question.correctAnswer.trim().toLowerCase();
    if (normalized !== 'true' && normalized !== 'false') {
      return {
        valid: false,
        reason: `True/False answer must be "True" or "False", got "${question.correctAnswer}"`,
      };
    }

    // True/False: must not be comparison/preference question
    const lowerText = question.questionText.toLowerCase();
    const matchedPattern = TRUE_FALSE_ANTI_PATTERNS.find((pattern) =>
      lowerText.includes(pattern)
    );
    if (matchedPattern) {
      return {
        valid: false,
        reason: `True/False question contains anti-pattern "${matchedPattern}" - should be different type`,
      };
    }
  }

  return { valid: true };
}

/**
 * Filters questions to only those with valid format.
 * Logs rejected questions for debugging.
 *
 * @param questions - Array of questions to filter
 * @returns Array of valid questions
 */
export function filterValidQuestions(questions: CuratedQuestion[]): CuratedQuestion[] {
  const validQuestions: CuratedQuestion[] = [];
  const rejectedCount = { fill_in_blank: 0, true_false: 0 };

  for (const question of questions) {
    const result = validateQuestionFormat(question);
    if (result.valid) {
      validQuestions.push(question);
    } else {
      console.warn(
        `[Pass 3 Filter] Rejected question ${question.id} (${question.questionType}): ${result.reason}`
      );
      if (question.questionType === 'fill_in_blank') rejectedCount.fill_in_blank++;
      if (question.questionType === 'true_false') rejectedCount.true_false++;
    }
  }

  const totalRejected = questions.length - validQuestions.length;
  if (totalRejected > 0) {
    console.warn(
      `[Pass 3 Filter] Filtered ${totalRejected} malformed questions: ` +
        `${rejectedCount.fill_in_blank} fill_in_blank, ${rejectedCount.true_false} true_false`
    );
  }

  return validQuestions;
}

/**
 * Individual pass functions for Inngest step.run checkpointing
 * Each pass can timeout independently and be retried without rerunning previous passes
 */

export async function runPass1ContentAnalysis(
  documentText: string
): Promise<PassResult<ContentAnalysis>> {
  // Verify Ollama is available before starting (fail fast with helpful error)
  await ensureOllamaAvailable();
  const model = getExtractionModel();
  const start = Date.now();

  const result = await generateText({
    model,
    system: buildPass1SystemPrompt(),
    output: Output.object({ schema: ContentAnalysisSchema }),
    prompt: buildPass1Prompt(documentText),
  });

  if (!result.output) {
    throw new Error('Pass 1 (Content Analysis) failed to produce output');
  }

  return {
    output: result.output,
    durationMs: Date.now() - start,
    tokens: result.usage?.totalTokens ?? 0,
  };
}

export async function runPass2ConceptExtraction(
  documentText: string,
  pass1: ContentAnalysis
): Promise<PassResult<ConceptExtraction>> {
  const model = getExtractionModel();
  const start = Date.now();

  const result = await generateText({
    model,
    output: Output.object({ schema: ConceptExtractionSchema }),
    prompt: buildPass2Prompt(documentText, pass1),
  });

  if (!result.output) {
    throw new Error('Pass 2 (Concept Extraction) failed to produce output');
  }

  return {
    output: result.output,
    durationMs: Date.now() - start,
    tokens: result.usage?.totalTokens ?? 0,
  };
}

export async function runPass3QuestionGeneration(
  documentText: string,
  pass1: ContentAnalysis,
  pass2: ConceptExtraction,
  requestedCount: number
): Promise<PassResult<QuestionGeneration>> {
  const model = getExtractionModel();
  const start = Date.now();

  const result = await generateText({
    model,
    output: Output.object({ schema: QuestionGenerationSchema }),
    prompt: buildPass3Prompt(documentText, pass1, pass2, requestedCount),
  });

  if (!result.output) {
    throw new Error('Pass 3 (Question Generation) failed to produce output');
  }

  // Filter malformed questions before returning
  const originalCount = result.output.questions.length;
  const validQuestions = filterValidQuestions(result.output.questions);

  // Recalculate type distribution after filtering
  const typeDistribution = {
    multiple_choice: 0,
    short_answer: 0,
    true_false: 0,
    show_work: 0,
    matching: 0,
    fill_in_blank: 0,
    essay: 0,
  };

  for (const q of validQuestions) {
    if (q.questionType in typeDistribution) {
      typeDistribution[q.questionType as keyof typeof typeDistribution]++;
    }
  }

  const filteredCount = originalCount - validQuestions.length;
  if (filteredCount > 0) {
    console.warn(
      `[Pass 3] Filtered ${filteredCount}/${originalCount} malformed questions before Pass 4`
    );
  }

  return {
    output: {
      ...result.output,
      questions: validQuestions,
      typeDistribution,
    },
    durationMs: Date.now() - start,
    tokens: result.usage?.totalTokens ?? 0,
  };
}

export async function runPass4Evaluation(
  pass1: ContentAnalysis,
  pass3: QuestionGeneration
): Promise<PassResult<QuestionEvaluation>> {
  const model = getExtractionModel();
  const start = Date.now();

  const result = await generateText({
    model,
    output: Output.object({ schema: QuestionEvaluationSchema }),
    prompt: buildPass4Prompt(pass1, pass3),
  });

  if (!result.output) {
    throw new Error('Pass 4 (Self-Evaluation) failed to produce output');
  }

  return {
    output: result.output,
    durationMs: Date.now() - start,
    tokens: result.usage?.totalTokens ?? 0,
  };
}

export async function runPass5FinalSelection(
  pass1: ContentAnalysis,
  pass2: ConceptExtraction,
  pass3: QuestionGeneration,
  pass4: QuestionEvaluation,
  requestedCount: number
): Promise<PassResult<FinalSelection>> {
  const model = getExtractionModel();
  const start = Date.now();

  const result = await generateText({
    model,
    output: Output.object({ schema: FinalSelectionSchema }),
    prompt: buildPass5Prompt(pass1, pass2, pass3, pass4, requestedCount),
  });

  if (!result.output) {
    throw new Error('Pass 5 (Final Selection) failed to produce output');
  }

  return {
    output: result.output,
    durationMs: Date.now() - start,
    tokens: result.usage?.totalTokens ?? 0,
  };
}

/**
 * Combine pass results into final curated questions
 */
export function buildCuratedQuestions(
  pass2: ConceptExtraction,
  pass3: QuestionGeneration,
  pass4: QuestionEvaluation,
  pass5: FinalSelection
): StorableCuratedQuestion[] {
  return pass3.questions.map((q) => {
    const evaluation = pass4.evaluations.find((e) => e.questionId === q.id);
    const ranking = pass5.rankedQuestions.find((r) => r.questionId === q.id);
    const isSelected = pass5.selectedForPool.includes(q.id);

    return {
      ...q,
      evaluationScore: evaluation?.overallScore ?? null,
      rank: ranking?.rank ?? null,
      selected: isSelected,
    };
  });
}

/**
 * Run the 5-pass curation pipeline on a document
 *
 * NOTE: For Inngest usage, prefer the individual runPassX functions
 * to enable checkpointing between passes. This function is kept for
 * direct/testing usage.
 *
 * @param documentText - Full text of the document
 * @param requestedCount - Number of questions teacher wants (will generate 2x)
 * @param onProgress - Optional callback for progress updates
 */
export async function curateQuestions(
  documentText: string,
  requestedCount: number,
  onProgress?: (progress: CurationProgress) => void
): Promise<CurationResult> {
  const startTime = Date.now();
  const passTimings: Record<string, number> = {};
  let totalTokens = 0;

  const reportProgress = (
    pass: number,
    passName: string,
    status: CurationProgress['status'],
    durationMs?: number
  ) => {
    if (onProgress) {
      onProgress({ pass, passName, status, durationMs });
    }
  };

  // PASS 1: Content Analysis
  reportProgress(1, 'Content Analysis', 'running');
  const pass1Result = await runPass1ContentAnalysis(documentText);
  passTimings.pass1 = pass1Result.durationMs;
  totalTokens += pass1Result.tokens;
  reportProgress(1, 'Content Analysis', 'complete', passTimings.pass1);

  // PASS 2: Concept Extraction
  reportProgress(2, 'Concept Extraction', 'running');
  const pass2Result = await runPass2ConceptExtraction(documentText, pass1Result.output);
  passTimings.pass2 = pass2Result.durationMs;
  totalTokens += pass2Result.tokens;
  reportProgress(2, 'Concept Extraction', 'complete', passTimings.pass2);

  // PASS 3: Question Generation (2x count)
  reportProgress(3, 'Question Generation', 'running');
  const pass3Result = await runPass3QuestionGeneration(
    documentText,
    pass1Result.output,
    pass2Result.output,
    requestedCount
  );
  passTimings.pass3 = pass3Result.durationMs;
  totalTokens += pass3Result.tokens;
  reportProgress(3, 'Question Generation', 'complete', passTimings.pass3);

  // PASS 4: Self-Evaluation
  reportProgress(4, 'Self-Evaluation', 'running');
  const pass4Result = await runPass4Evaluation(pass1Result.output, pass3Result.output);
  passTimings.pass4 = pass4Result.durationMs;
  totalTokens += pass4Result.tokens;
  reportProgress(4, 'Self-Evaluation', 'complete', passTimings.pass4);

  // PASS 5: Final Selection
  reportProgress(5, 'Final Selection', 'running');
  const pass5Result = await runPass5FinalSelection(
    pass1Result.output,
    pass2Result.output,
    pass3Result.output,
    pass4Result.output,
    requestedCount
  );
  passTimings.pass5 = pass5Result.durationMs;
  totalTokens += pass5Result.tokens;
  reportProgress(5, 'Final Selection', 'complete', passTimings.pass5);

  // Combine questions with their evaluations for storage
  const curatedQuestions = buildCuratedQuestions(
    pass2Result.output,
    pass3Result.output,
    pass4Result.output,
    pass5Result.output
  );

  return {
    contentAnalysis: pass1Result.output,
    conceptExtraction: pass2Result.output,
    questionGeneration: pass3Result.output,
    questionEvaluation: pass4Result.output,
    finalSelection: pass5Result.output,
    curatedQuestions,
    stats: {
      passTimings,
      totalTokens,
      totalDurationMs: Date.now() - startTime,
    },
  };
}
