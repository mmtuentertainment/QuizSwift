'use client';

/**
 * QuizTaker component for taking quizzes
 *
 * Features:
 * - Sequential question navigation with prev/next
 * - Progress bar and question dots
 * - Answer persistence across navigation
 * - Auto-save answers to server
 * - Submit quiz with score calculation
 *
 * Used by both teacher preview and student quiz modes.
 */

import { useState, useEffect, useCallback } from 'react';
import { QuestionRenderer, type AnswerData as RendererAnswerData } from '@/components/questions';
import { startAttempt, submitAnswer, completeAttempt, getAttemptWithAnswers } from '@/actions/attempts';
import type { CuratedQuestion } from '@/generated/prisma/client';
import type { QuestionOptions, AnswerData as LibAnswerData } from '@/lib/questions/types';

interface QuizTakerProps {
  quizId: string;
  questions: CuratedQuestion[];
  isPreview?: boolean;
  onComplete?: (score: number, maxScore: number) => void;
  // Note: timeLimit will be implemented in Phase 4
  timeLimit?: number | null;
}

/**
 * Convert renderer answer format to library format for grading
 */
function toLibAnswerData(answer: RendererAnswerData): LibAnswerData | null {
  switch (answer.type) {
    case 'multiple_choice':
      return answer.selectedId
        ? { selectedChoiceId: answer.selectedId }
        : null;
    case 'true_false':
      return answer.selectedAnswer !== null
        ? { answer: answer.selectedAnswer }
        : null;
    case 'fill_in_blank':
      return { blanks: answer.answers };
    case 'matching':
      return { pairs: answer.pairs };
    case 'essay':
    case 'short_answer':
      return answer.text
        ? { text: answer.text, wordCount: answer.text.split(/\s+/).filter(Boolean).length }
        : null;
    case 'show_work':
      return {
        finalAnswer: answer.data?.finalAnswer || '',
        canvasState: answer.data?.canvasState || {},
      };
    default:
      return null;
  }
}

/**
 * Convert library answer format back to renderer format for display
 */
function toRendererAnswerData(
  questionType: string,
  answerData: Record<string, unknown>
): RendererAnswerData | null {
  switch (questionType) {
    case 'multiple_choice':
      return {
        type: 'multiple_choice',
        selectedId: (answerData.selectedChoiceId as string) || null,
      };
    case 'true_false':
    case 'true_false_justify':
      return {
        type: 'true_false',
        selectedAnswer: answerData.answer as boolean | null ?? null,
      };
    case 'fill_in_blank':
    case 'fill_blank':
      return {
        type: 'fill_in_blank',
        answers: (answerData.blanks as string[]) || [],
      };
    case 'matching':
      return {
        type: 'matching',
        pairs: (answerData.pairs as Array<{ leftId: string; rightId: string }>) || [],
      };
    case 'essay':
    case 'short_answer':
      return {
        type: questionType as 'essay' | 'short_answer',
        text: (answerData.text as string) || '',
      };
    case 'show_work':
      return {
        type: 'show_work',
        data: {
          finalAnswer: (answerData.finalAnswer as string) || '',
          // Restore canvas state - cast through any since JSON loses type info
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          canvasState: answerData.canvasState as any ?? null,
          // canvasImage cannot be restored from JSON (Blob)
          canvasImage: null,
        },
      };
    default:
      return null;
  }
}

export function QuizTaker({
  quizId,
  questions,
  isPreview = false,
  onComplete,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  timeLimit: _timeLimit,
}: QuizTakerProps) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, RendererAnswerData>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState<{ earned: number; max: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize attempt and load existing answers
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        // First check for existing attempt with answers
        const existing = await getAttemptWithAnswers(quizId);

        if (existing.error) {
          setError(existing.error);
          return;
        }

        if (existing.attempt) {
          setAttemptId(existing.attempt.id);

          // Check if already completed
          if (existing.attempt.status === 'submitted') {
            setIsComplete(true);
            setScore({
              earned: existing.attempt.score ?? 0,
              max: existing.attempt.maxScore ?? 0,
            });
            return;
          }

          // Restore saved answers
          const restoredAnswers = new Map<string, RendererAnswerData>();
          for (const ans of existing.answers) {
            const question = questions.find((q) => q.id === ans.questionId);
            if (question && ans.answerData) {
              const rendererAnswer = toRendererAnswerData(
                question.questionType,
                ans.answerData as Record<string, unknown>
              );
              if (rendererAnswer) {
                restoredAnswers.set(ans.questionId, rendererAnswer);
              }
            }
          }
          setAnswers(restoredAnswers);
        } else {
          // Create new attempt
          const result = await startAttempt(quizId);
          if (result.error) {
            setError(result.error);
          } else if (result.attemptId) {
            setAttemptId(result.attemptId);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [quizId, questions]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) ?? null : null;

  const handleAnswer = useCallback(async (answerData: RendererAnswerData) => {
    if (!attemptId || !currentQuestion) return;

    // Update local state immediately
    setAnswers((prev) => new Map(prev).set(currentQuestion.id, answerData));

    // Convert to library format and submit to server
    const libAnswer = toLibAnswerData(answerData);
    if (libAnswer) {
      await submitAnswer(attemptId, currentQuestion.id, libAnswer);
    }
  }, [attemptId, currentQuestion]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, questions.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleJumpToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  }, [questions.length]);

  const handleSubmitQuiz = useCallback(async () => {
    if (!attemptId) return;

    setIsSubmitting(true);
    try {
      const result = await completeAttempt(attemptId);

      if (result.error) {
        setError(result.error);
      } else {
        setIsComplete(true);
        setScore({ earned: result.score ?? 0, max: result.maxScore ?? 0 });
        if (onComplete) {
          onComplete(result.score ?? 0, result.maxScore ?? 0);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [attemptId, onComplete]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  // Waiting for attempt
  if (!attemptId) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="text-gray-600">Starting quiz...</p>
        </div>
      </div>
    );
  }

  // Completion state
  if (isComplete && score) {
    const percentage = score.max > 0 ? (score.earned / score.max) * 100 : 0;

    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <div className="mb-4 text-4xl">
          {percentage >= 70 ? '🎉' : percentage >= 50 ? '📊' : '📚'}
        </div>
        <h2 className="text-2xl font-bold text-green-800">Quiz Complete!</h2>
        <div className="mt-4 space-y-2">
          <p className="text-3xl font-bold text-green-700">
            {score.earned.toFixed(1)} / {score.max.toFixed(1)}
          </p>
          <p className="text-xl text-green-600">
            {percentage.toFixed(0)}%
          </p>
        </div>
        {isPreview && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="font-medium text-blue-800">
              Preview Complete
            </p>
            <p className="mt-1 text-sm text-blue-700">
              You have completed the preview. The quiz can now be published.
            </p>
          </div>
        )}
      </div>
    );
  }

  // No questions edge case
  if (questions.length === 0 || !currentQuestion) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
        <p className="text-yellow-800">No questions in this quiz.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span className="font-medium">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span>
          {answers.size} of {questions.length} answered
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {/* Question metadata */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
            {currentQuestion.questionType.replace(/_/g, ' ')}
          </span>
          <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
            {currentQuestion.bloomLevel}
          </span>
          <span className="rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
            {currentQuestion.difficulty}
          </span>
        </div>

        {/* Question content */}
        <QuestionRenderer
          questionText={currentQuestion.questionText}
          questionType={currentQuestion.questionType}
          options={currentQuestion.options as QuestionOptions | null}
          answer={currentAnswer}
          onAnswer={handleAnswer}
        />
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>&larr;</span>
          <span>Previous</span>
        </button>

        {/* Question dots */}
        <div className="flex gap-1">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => handleJumpToQuestion(idx)}
              className={`h-3 w-3 rounded-full transition-all ${
                idx === currentIndex
                  ? 'scale-125 bg-blue-600 ring-2 ring-blue-300'
                  : answers.has(q.id)
                    ? 'bg-green-500 hover:bg-green-400'
                    : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to question ${idx + 1}${answers.has(q.id) ? ' (answered)' : ''}`}
              title={`Question ${idx + 1}${answers.has(q.id) ? ' (answered)' : ''}`}
            />
          ))}
        </div>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            <span>Next</span>
            <span>&rarr;</span>
          </button>
        ) : (
          <button
            onClick={handleSubmitQuiz}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>Submit Quiz</span>
                <span>✓</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Unanswered warning on last question */}
      {currentIndex === questions.length - 1 && answers.size < questions.length && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> You have {questions.length - answers.size} unanswered question
            {questions.length - answers.size > 1 ? 's' : ''}.
            You can still submit, but unanswered questions will be marked incorrect.
          </p>
        </div>
      )}
    </div>
  );
}
