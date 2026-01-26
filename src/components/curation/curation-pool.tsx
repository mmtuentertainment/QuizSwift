'use client';

import { useState, useMemo } from 'react';
import type { CuratedQuestion } from '@/generated/prisma/client';
import { QuestionCard } from './question-card';

interface CurationPoolProps {
  questions: CuratedQuestion[];
  targetCount: number;
  selectedIds: Set<string>;
  onSelectionChange: (questionId: string, selected: boolean) => void;
}

type BloomFilter = 'all' | 'understand' | 'apply' | 'analyze' | 'evaluate';
type TypeFilter = 'all' | string;
type SortOption = 'rank' | 'score' | 'difficulty';
type ViewMode = 'list' | 'grid';

const difficultyOrder: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export function CurationPool({
  questions,
  targetCount,
  selectedIds,
  onSelectionChange,
}: CurationPoolProps) {
  const [bloomFilter, setBloomFilter] = useState<BloomFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('rank');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Get unique question types for filter dropdown
  const questionTypes = useMemo(() => {
    const types = new Set(questions.map((q) => q.questionType));
    return Array.from(types).sort();
  }, [questions]);

  // Filter and sort questions
  const filteredQuestions = useMemo(() => {
    let result = [...questions];

    // Apply bloom filter
    if (bloomFilter !== 'all') {
      result = result.filter((q) => q.bloomLevel === bloomFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter((q) => q.questionType === typeFilter);
    }

    // Sort
    switch (sortBy) {
      case 'rank':
        result.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
        break;
      case 'score':
        result.sort((a, b) => (b.evaluationScore ?? 0) - (a.evaluationScore ?? 0));
        break;
      case 'difficulty':
        result.sort(
          (a, b) => (difficultyOrder[a.difficulty] ?? 2) - (difficultyOrder[b.difficulty] ?? 2)
        );
        break;
    }

    return result;
  }, [questions, bloomFilter, typeFilter, sortBy]);

  const selectedCount = selectedIds.size;
  const progressPercent = Math.min((selectedCount / targetCount) * 100, 100);

  // Calculate Bloom's distribution for selected questions
  const bloomDistribution = useMemo(() => {
    const selected = questions.filter((q) => selectedIds.has(q.id));
    const counts: Record<string, number> = {
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
    };
    selected.forEach((q) => {
      if (counts[q.bloomLevel] !== undefined) {
        counts[q.bloomLevel]++;
      }
    });
    return counts;
  }, [questions, selectedIds]);

  // Check if distribution is imbalanced (>60% in one level or 0% in any level when >5 selected)
  const distributionWarning = useMemo(() => {
    if (selectedCount < 5) return null;

    const total = selectedCount;
    const levels = Object.entries(bloomDistribution);
    const highestPercent = Math.max(...levels.map(([, c]) => (c / total) * 100));
    const emptyLevels = levels.filter(([, c]) => c === 0).map(([level]) => level);

    if (highestPercent > 60) {
      const dominant = levels.find(([, c]) => (c / total) * 100 === highestPercent)?.[0];
      return `${Math.round(highestPercent)}% of questions are "${dominant}" level. Consider diversifying for better assessment coverage.`;
    }

    if (emptyLevels.length > 0 && selectedCount >= 10) {
      return `No questions selected at ${emptyLevels.join(', ')} level(s). Consider adding variety.`;
    }

    return null;
  }, [bloomDistribution, selectedCount]);

  const handleSelectTopN = () => {
    // Get top N questions by rank that aren't already selected
    const topQuestions = filteredQuestions
      .filter((q) => !selectedIds.has(q.id))
      .slice(0, targetCount - selectedCount);

    topQuestions.forEach((q) => {
      onSelectionChange(q.id, true);
    });
  };

  const handleToggleDetails = (questionId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Selected {selectedCount} of {targetCount}
          </h2>
          {selectedCount < targetCount && (
            <button
              onClick={handleSelectTopN}
              className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 transition-colors hover:bg-blue-200"
            >
              Select Top{' '}
              {Math.min(
                targetCount - selectedCount,
                filteredQuestions.filter((q) => !selectedIds.has(q.id)).length
              )}
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-2.5 w-full rounded-full bg-gray-200">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${
              selectedCount === targetCount ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {questions.length} questions available (2x your requested count)
        </p>

        {/* Bloom's distribution mini-chart */}
        {selectedCount > 0 && (
          <div className="mt-3 border-t pt-3">
            <div className="mb-1 text-xs text-gray-500">Bloom&apos;s Distribution:</div>
            <div className="flex h-4 gap-1">
              {Object.entries(bloomDistribution).map(([level, count]) => (
                <div
                  key={level}
                  className="flex flex-1 items-center justify-center rounded text-center text-xs text-white"
                  style={{
                    backgroundColor:
                      level === 'understand'
                        ? '#3b82f6'
                        : level === 'apply'
                          ? '#10b981'
                          : level === 'analyze'
                            ? '#f59e0b'
                            : '#ef4444',
                    opacity: count > 0 ? 1 : 0.3,
                  }}
                  title={`${level}: ${count} (${selectedCount > 0 ? Math.round((count / selectedCount) * 100) : 0}%)`}
                >
                  {count > 0 && count}
                </div>
              ))}
            </div>
            <div className="mt-0.5 flex gap-1 text-xs text-gray-400">
              <span className="flex-1 text-center">Understand</span>
              <span className="flex-1 text-center">Apply</span>
              <span className="flex-1 text-center">Analyze</span>
              <span className="flex-1 text-center">Evaluate</span>
            </div>
          </div>
        )}

        {/* Distribution warning */}
        {distributionWarning && (
          <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-700">
            <span className="font-medium">Balance tip:</span> {distributionWarning}
          </div>
        )}
      </div>

      {/* Filters and controls */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex flex-wrap items-center gap-4">
          {/* Bloom's level filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Bloom&apos;s Level:</label>
            <select
              value={bloomFilter}
              onChange={(e) => setBloomFilter(e.target.value as BloomFilter)}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="all">All Levels</option>
              <option value="understand">Understand</option>
              <option value="apply">Apply</option>
              <option value="analyze">Analyze</option>
              <option value="evaluate">Evaluate</option>
            </select>
          </div>

          {/* Question type filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="all">All Types</option>
              {questionTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="rank">Rank (Recommended)</option>
              <option value="score">Evaluation Score</option>
              <option value="difficulty">Difficulty</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setViewMode('list')}
              className={`rounded p-1.5 ${
                viewMode === 'list'
                  ? 'bg-gray-200 text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="List view"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded p-1.5 ${
                viewMode === 'grid'
                  ? 'bg-gray-200 text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Grid view"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter summary */}
        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredQuestions.length} of {questions.length} questions
          {bloomFilter !== 'all' && ` (${bloomFilter})`}
          {typeFilter !== 'all' && ` (${typeFilter.replace('_', ' ')})`}
        </div>
      </div>

      {/* Questions grid/list */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-4 md:grid-cols-2' : 'space-y-4'}>
        {filteredQuestions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            selected={selectedIds.has(question.id)}
            onToggleSelect={() => onSelectionChange(question.id, !selectedIds.has(question.id))}
            showDetails={expandedIds.has(question.id)}
            onToggleDetails={() => handleToggleDetails(question.id)}
          />
        ))}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No questions match your filters. Try adjusting the filters above.
        </div>
      )}
    </div>
  );
}

export type { CurationPoolProps };
