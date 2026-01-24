import { generateText, Output } from 'ai';
import { getExtractionModel, Tier } from './providers';
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
} from './schemas';
import {
  buildPass1Prompt,
  buildPass1SystemPrompt,
  buildPass2Prompt,
  buildPass3Prompt,
  buildPass4Prompt,
  buildPass5Prompt,
} from './prompts';

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

/**
 * Run the 5-pass curation pipeline on a document
 *
 * @param documentText - Full text of the document
 * @param requestedCount - Number of questions teacher wants (will generate 2x)
 * @param tier - AI tier (free=Ollama, paid=OpenAI)
 * @param onProgress - Optional callback for progress updates
 */
export async function curateQuestions(
  documentText: string,
  requestedCount: number,
  tier: Tier = 'paid',
  onProgress?: (progress: CurationProgress) => void
): Promise<CurationResult> {
  const model = getExtractionModel(tier);
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
  const pass1Start = Date.now();

  const pass1Result = await generateText({
    model,
    system: buildPass1SystemPrompt(),
    output: Output.object({ schema: ContentAnalysisSchema }),
    prompt: buildPass1Prompt(documentText),
  });

  if (!pass1Result.output) {
    throw new Error('Pass 1 (Content Analysis) failed to produce output');
  }
  const pass1 = pass1Result.output;
  passTimings.pass1 = Date.now() - pass1Start;
  totalTokens += pass1Result.usage?.totalTokens ?? 0;
  reportProgress(1, 'Content Analysis', 'complete', passTimings.pass1);

  // PASS 2: Concept Extraction
  reportProgress(2, 'Concept Extraction', 'running');
  const pass2Start = Date.now();

  const pass2Result = await generateText({
    model,
    output: Output.object({ schema: ConceptExtractionSchema }),
    prompt: buildPass2Prompt(documentText, pass1),
  });

  if (!pass2Result.output) {
    throw new Error('Pass 2 (Concept Extraction) failed to produce output');
  }
  const pass2 = pass2Result.output;
  passTimings.pass2 = Date.now() - pass2Start;
  totalTokens += pass2Result.usage?.totalTokens ?? 0;
  reportProgress(2, 'Concept Extraction', 'complete', passTimings.pass2);

  // PASS 3: Question Generation (2x count)
  reportProgress(3, 'Question Generation', 'running');
  const pass3Start = Date.now();

  const pass3Result = await generateText({
    model,
    output: Output.object({ schema: QuestionGenerationSchema }),
    prompt: buildPass3Prompt(documentText, pass1, pass2, requestedCount),
  });

  if (!pass3Result.output) {
    throw new Error('Pass 3 (Question Generation) failed to produce output');
  }
  const pass3 = pass3Result.output;
  passTimings.pass3 = Date.now() - pass3Start;
  totalTokens += pass3Result.usage?.totalTokens ?? 0;
  reportProgress(3, 'Question Generation', 'complete', passTimings.pass3);

  // PASS 4: Self-Evaluation
  reportProgress(4, 'Self-Evaluation', 'running');
  const pass4Start = Date.now();

  const pass4Result = await generateText({
    model,
    output: Output.object({ schema: QuestionEvaluationSchema }),
    prompt: buildPass4Prompt(pass1, pass3),
  });

  if (!pass4Result.output) {
    throw new Error('Pass 4 (Self-Evaluation) failed to produce output');
  }
  const pass4 = pass4Result.output;
  passTimings.pass4 = Date.now() - pass4Start;
  totalTokens += pass4Result.usage?.totalTokens ?? 0;
  reportProgress(4, 'Self-Evaluation', 'complete', passTimings.pass4);

  // PASS 5: Final Selection
  reportProgress(5, 'Final Selection', 'running');
  const pass5Start = Date.now();

  const pass5Result = await generateText({
    model,
    output: Output.object({ schema: FinalSelectionSchema }),
    prompt: buildPass5Prompt(pass1, pass2, pass3, pass4, requestedCount),
  });

  if (!pass5Result.output) {
    throw new Error('Pass 5 (Final Selection) failed to produce output');
  }
  const pass5 = pass5Result.output;
  passTimings.pass5 = Date.now() - pass5Start;
  totalTokens += pass5Result.usage?.totalTokens ?? 0;
  reportProgress(5, 'Final Selection', 'complete', passTimings.pass5);

  // Combine questions with their evaluations for storage
  const curatedQuestions: StorableCuratedQuestion[] = pass3.questions.map(q => {
    const evaluation = pass4.evaluations.find(e => e.questionId === q.id);
    const ranking = pass5.rankedQuestions.find(r => r.questionId === q.id);
    const isSelected = pass5.selectedForPool.includes(q.id);

    return {
      ...q,
      evaluationScore: evaluation?.overallScore ?? null,
      rank: ranking?.rank ?? null,
      selected: isSelected,
    };
  });

  return {
    contentAnalysis: pass1,
    conceptExtraction: pass2,
    questionGeneration: pass3,
    questionEvaluation: pass4,
    finalSelection: pass5,
    curatedQuestions,
    stats: {
      passTimings,
      totalTokens,
      totalDurationMs: Date.now() - startTime,
    },
  };
}
