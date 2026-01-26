'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MatchingOptions, MatchingAnswer } from '@/lib/questions/types';

interface MatchingProps {
  options: MatchingOptions;
  answer: MatchingAnswer | null;
  onAnswer: (answer: MatchingAnswer) => void;
  readOnly?: boolean;
  showCorrect?: boolean;
}

// SortableItem component for right-side items
function SortableItem({
  id,
  text,
  isCorrect,
  showCorrect,
}: {
  id: string;
  text: string;
  isCorrect?: boolean;
  showCorrect?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab rounded border p-3 shadow-sm active:cursor-grabbing ${
        showCorrect
          ? isCorrect
            ? 'border-green-500 bg-green-50'
            : 'border-red-500 bg-red-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {text}
    </div>
  );
}

export function Matching({
  options,
  answer,
  onAnswer,
  readOnly = false,
  showCorrect = false,
}: MatchingProps) {
  // Initialize right order: use answer if provided, else shuffle
  const [rightOrder, setRightOrder] = useState<string[]>(() => {
    if (answer?.pairs) {
      return answer.pairs.map((p) => p.rightId);
    }
    // Shuffle on initial render for quiz-taking
    return [...options.pairs.map((p) => p.id)].sort(() => Math.random() - 0.5);
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly) return;

    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRightOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Report matches based on position alignment
        const matches = options.pairs.map((p, idx) => ({
          leftId: p.id,
          rightId: newOrder[idx],
        }));
        onAnswer({ pairs: matches });

        return newOrder;
      });
    }
  };

  // Check if a match is correct (for showCorrect mode)
  const isMatchCorrect = (leftId: string, rightId: string) => leftId === rightId;

  return (
    <div className="matching-question">
      <div className="mb-2 text-sm text-gray-600">
        Drag items on the right to match with items on the left
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left column - fixed terms */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Terms</div>
          {options.pairs.map((pair) => (
            <div key={pair.id} className="rounded border border-gray-300 bg-gray-50 p-3">
              {pair.left}
            </div>
          ))}
        </div>

        {/* Right column - draggable definitions */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Definitions</div>
          {readOnly ? (
            // Read-only: just render in current order
            rightOrder.map((rightId, idx) => {
              const pair = options.pairs.find((p) => p.id === rightId);
              const leftId = options.pairs[idx]?.id;
              return (
                <div
                  key={rightId}
                  className={`rounded border p-3 ${
                    showCorrect
                      ? isMatchCorrect(leftId, rightId)
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {pair?.right}
                </div>
              );
            })
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={rightOrder} strategy={verticalListSortingStrategy}>
                {rightOrder.map((rightId, idx) => {
                  const pair = options.pairs.find((p) => p.id === rightId);
                  const leftId = options.pairs[idx]?.id;
                  return (
                    <SortableItem
                      key={rightId}
                      id={rightId}
                      text={pair?.right || ''}
                      isCorrect={showCorrect ? isMatchCorrect(leftId, rightId) : undefined}
                      showCorrect={showCorrect}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
