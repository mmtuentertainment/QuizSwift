'use client';

import { useState, useCallback } from 'react';
import { CurationPool } from '@/components/curation';
import type { CuratedQuestion } from '@/generated/prisma/client';

interface CurationClientProps {
  documentId: string;
  questions: CuratedQuestion[];
  targetCount: number;
  contentAnalysis: object | null;
}

export function CurationClient({
  documentId,
  questions,
  targetCount,
}: CurationClientProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(questions.filter((q) => q.teacherSelected).map((q) => q.id));
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectionChange = useCallback(
    async (questionId: string, selected: boolean) => {
      // Optimistic update
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (selected) {
          next.add(questionId);
        } else {
          next.delete(questionId);
        }
        return next;
      });
      setError(null);

      // Persist to server
      setSaving(true);
      try {
        const response = await fetch(`/api/documents/${documentId}/curate`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selections: [{ questionId, selected }],
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save selection');
        }
      } catch (err) {
        console.error('Failed to save selection:', err);
        setError('Failed to save selection. Please try again.');
        // Revert on error
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (selected) {
            next.delete(questionId);
          } else {
            next.add(questionId);
          }
          return next;
        });
      } finally {
        setSaving(false);
      }
    },
    [documentId]
  );

  return (
    <div>
      {saving && (
        <div className="fixed top-4 right-4 bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm z-50">
          Saving...
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <CurationPool
        questions={questions}
        targetCount={targetCount}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
      />

      {selectedIds.size === targetCount && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            You&apos;ve selected all {targetCount} questions!
          </p>
          <button
            className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={() => {
              // Navigate to document page (quiz setup in future phase)
              window.location.href = `/documents/${documentId}`;
            }}
          >
            Continue to Quiz Setup
          </button>
        </div>
      )}

      {selectedIds.size > 0 && selectedIds.size < targetCount && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            Select {targetCount - selectedIds.size} more question
            {targetCount - selectedIds.size > 1 ? 's' : ''} to continue.
          </p>
        </div>
      )}
    </div>
  );
}
