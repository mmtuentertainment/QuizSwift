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

      {/* Progress indicator - always visible when questions selected */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Selection Progress
          </span>
          <span className={`text-sm font-bold ${
            selectedIds.size === targetCount ? 'text-green-600' :
            selectedIds.size >= Math.floor(targetCount * 0.8) ? 'text-yellow-600' :
            'text-gray-600'
          }`}>
            {selectedIds.size} / {targetCount}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              selectedIds.size === targetCount ? 'bg-green-500' :
              selectedIds.size >= Math.floor(targetCount * 0.8) ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, (selectedIds.size / targetCount) * 100)}%` }}
          />
        </div>
      </div>

      {selectedIds.size === targetCount && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            ✓ You&apos;ve selected all {targetCount} questions!
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
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            Select {targetCount - selectedIds.size} more question
            {targetCount - selectedIds.size > 1 ? 's' : ''} to continue.
          </p>
          <p className="text-yellow-600 text-sm mt-1">
            You must select exactly {targetCount} questions to proceed.
          </p>
        </div>
      )}

      {selectedIds.size > targetCount && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">
            ⚠ You&apos;ve selected {selectedIds.size - targetCount} too many questions.
          </p>
          <p className="text-red-600 text-sm mt-1">
            Please deselect {selectedIds.size - targetCount} question
            {selectedIds.size - targetCount > 1 ? 's' : ''} to continue.
          </p>
        </div>
      )}
    </div>
  );
}
