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
        result.sort(
          (a, b) => (b.evaluationScore ?? 0) - (a.evaluationScore ?? 0)
        );
        break;
      case 'difficulty':
        result.sort(
          (a, b) =>
            (difficultyOrder[a.difficulty] ?? 2) -
            (difficultyOrder[b.difficulty] ?? 2)
        );
        break;
    }

    return result;
  }, [questions, bloomFilter, typeFilter, sortBy]);

  const selectedCount = selectedIds.size;
  const progressPercent = Math.min((selectedCount / targetCount) * 100, 100);

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
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            Selected {selectedCount} of {targetCount}
          </h2>
          {selectedCount < targetCount && (
            <button
              onClick={handleSelectTopN}
              className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
            >
              Select Top {Math.min(targetCount - selectedCount, filteredQuestions.filter((q) => !selectedIds.has(q.id)).length)}
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${
              selectedCount === targetCount ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {questions.length} questions available (2x your requested count)
        </p>
      </div>

      {/* Filters and controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Bloom's level filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Bloom&apos;s Level:</label>
            <select
              value={bloomFilter}
              onChange={(e) => setBloomFilter(e.target.value as BloomFilter)}
              className="text-sm border rounded px-2 py-1"
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
              className="text-sm border rounded px-2 py-1"
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
              className="text-sm border rounded px-2 py-1"
            >
              <option value="rank">Rank (Recommended)</option>
              <option value="score">Evaluation Score</option>
              <option value="difficulty">Difficulty</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${
                viewMode === 'list'
                  ? 'bg-gray-200 text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="List view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${
                viewMode === 'grid'
                  ? 'bg-gray-200 text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
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
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
            : 'space-y-4'
        }
      >
        {filteredQuestions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            selected={selectedIds.has(question.id)}
            onToggleSelect={() =>
              onSelectionChange(question.id, !selectedIds.has(question.id))
            }
            showDetails={expandedIds.has(question.id)}
            onToggleDetails={() => handleToggleDetails(question.id)}
          />
        ))}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No questions match your filters. Try adjusting the filters above.
        </div>
      )}
    </div>
  );
}

export type { CurationPoolProps };
