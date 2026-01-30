'use client';

/**
 * TeacherPreviewWrapper component
 *
 * Wraps the QuizTaker and handles the preview completion flow.
 * When the quiz is submitted, marks it as previewed so it can be published.
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuizTaker } from '@/components/quiz/quiz-taker';
import { markQuizPreviewed } from '@/actions/attempts';
import type { CuratedQuestion } from '@/generated/prisma/client';

interface TeacherPreviewWrapperProps {
  quizId: string;
  documentId: string;
  questions: CuratedQuestion[];
  timeLimit: number | null;
}

export function TeacherPreviewWrapper({
  quizId,
  documentId,
  questions,
  timeLimit,
}: TeacherPreviewWrapperProps) {
  const router = useRouter();
  const [completionState, setCompletionState] = useState<{
    completed: boolean;
    score: number;
    maxScore: number;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handleComplete = useCallback(async (score: number, maxScore: number) => {
    setCompletionState({ completed: true, score, maxScore });

    // Mark quiz as previewed
    try {
      const result = await markQuizPreviewed(quizId);
      if (result.error) {
        console.error('Failed to mark quiz as previewed:', result.error);
        setPreviewError('Preview could not be recorded. You may need to preview again before publishing.');
      }
    } catch (err) {
      console.error('Failed to mark quiz as previewed:', err);
      setPreviewError('Failed to record preview completion. Please try again.');
    }

    // Refresh page data to reflect the updated status
    router.refresh();
  }, [quizId, router]);

  return (
    <div>
      <QuizTaker
        quizId={quizId}
        questions={questions}
        isPreview={true}
        onComplete={handleComplete}
        timeLimit={timeLimit ?? undefined}
      />

      {/* Preview error warning */}
      {previewError && (
        <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            <strong>Warning:</strong> {previewError}
          </p>
        </div>
      )}

      {/* Show navigation after completion */}
      {completionState?.completed && (
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => router.push(`/documents/${documentId}/quiz/${quizId}`)}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Return to Quiz Settings
          </button>
        </div>
      )}
    </div>
  );
}
