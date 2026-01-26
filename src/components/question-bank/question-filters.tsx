'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useCallback } from 'react';
import type { TeacherDocument } from '@/actions/questions';

interface QuestionFiltersProps {
  documents: TeacherDocument[];
}

const questionTypes = [
  { value: '', label: 'All Types' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'fill_in_blank', label: 'Fill in Blank' },
  { value: 'matching', label: 'Matching' },
  { value: 'essay', label: 'Essay' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'show_work', label: 'Show Work' },
];

const bloomLevels = [
  { value: '', label: 'All Levels' },
  { value: 'understand', label: 'Understand' },
  { value: 'apply', label: 'Apply' },
  { value: 'analyze', label: 'Analyze' },
  { value: 'evaluate', label: 'Evaluate' },
];

export function QuestionFilters({ documents }: QuestionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page'); // Reset to page 1 on filter change
      router.push(`/question-bank?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      // Debounce search input
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        updateFilter('search', value);
      }, 300);
    },
    [updateFilter]
  );

  return (
    <div className="mb-6 flex flex-wrap gap-4">
      {/* Search */}
      <div className="min-w-[200px] flex-1">
        <input
          type="text"
          placeholder="Search questions..."
          defaultValue={searchParams.get('search') || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Document filter */}
      <select
        value={searchParams.get('documentId') || ''}
        onChange={(e) => updateFilter('documentId', e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">All Documents</option>
        {documents.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.fileName} ({doc._count.curatedQuestions})
          </option>
        ))}
      </select>

      {/* Type filter */}
      <select
        value={searchParams.get('questionType') || ''}
        onChange={(e) => updateFilter('questionType', e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {questionTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>

      {/* Bloom's level filter */}
      <select
        value={searchParams.get('bloomLevel') || ''}
        onChange={(e) => updateFilter('bloomLevel', e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {bloomLevels.map((level) => (
          <option key={level.value} value={level.value}>
            {level.label}
          </option>
        ))}
      </select>
    </div>
  );
}
