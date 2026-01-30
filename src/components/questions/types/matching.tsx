'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  type Announcements,
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

  // Build accessible label based on state
  const ariaLabel = showCorrect
    ? isCorrect
      ? `Definition: ${text}. Correctly matched`
      : `Definition: ${text}. Incorrectly matched`
    : `Draggable definition: ${text}. Press Space to grab, arrow keys to move, Space to drop`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="listitem"
      aria-label={ariaLabel}
      aria-grabbed={isDragging}
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

  // Report initial shuffled state to parent if no existing answer
  useEffect(() => {
    if (!answer?.pairs && !readOnly) {
      const initialMatches = options.pairs.map((p, idx) => ({
        leftId: p.id,
        rightId: rightOrder[idx],
      }));
      onAnswer({ type: 'matching', pairs: initialMatches });
    }
    // Only run on mount - intentionally excluding dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync rightOrder when answer prop changes (restoring from saved state or navigating)
  useEffect(() => {
    if (answer?.pairs?.length) {
      setRightOrder(answer.pairs.map((p) => p.rightId));
    } else if (!answer?.pairs && readOnly) {
      // Reset to original order when no answer in readOnly mode
      setRightOrder(options.pairs.map((p) => p.id));
    }
  }, [answer, options.pairs, readOnly]);

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
        onAnswer({ type: 'matching', pairs: matches });

        return newOrder;
      });
    }
  };

  // Check if a match is correct (for showCorrect mode)
  const isMatchCorrect = (leftId: string, rightId: string) => leftId === rightId;

  // Memoize announcements for screen readers
  const announcements: Announcements = useMemo(
    () => ({
      onDragStart({ active }) {
        const item = options.pairs.find((p) => p.id === active.id);
        return `Picked up definition: ${item?.right}. Use arrow keys to reorder.`;
      },
      onDragOver({ active, over }) {
        if (over) {
          const activeItem = options.pairs.find((p) => p.id === active.id);
          const overItem = options.pairs.find((p) => p.id === over.id);
          return `Definition ${activeItem?.right} is over ${overItem?.right}.`;
        }
        return `Definition is not over a droppable area.`;
      },
      onDragEnd({ active, over }) {
        if (over) {
          const activeItem = options.pairs.find((p) => p.id === active.id);
          return `Dropped definition: ${activeItem?.right}. Position updated.`;
        }
        return `Drag cancelled.`;
      },
      onDragCancel({ active }) {
        const item = options.pairs.find((p) => p.id === active.id);
        return `Dragging cancelled. ${item?.right} returned to original position.`;
      },
    }),
    [options.pairs]
  );

  return (
    <div className="matching-question">
      <div className="mb-2 text-sm text-gray-600" id="matching-instructions">
        Drag items on the right to match with items on the left.
        <span className="sr-only">
          {' '}Keyboard users: Press Tab to navigate to items, Space to pick up, arrow keys to move, Space to drop.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left column - fixed terms */}
        <div className="space-y-3" role="list" aria-label="Terms to match">
          <div className="text-sm font-medium text-gray-700">Terms</div>
          {options.pairs.map((pair) => (
            <div
              key={pair.id}
              role="listitem"
              className="rounded border border-gray-300 bg-gray-50 p-3"
            >
              {pair.left}
            </div>
          ))}
        </div>

        {/* Right column - draggable definitions */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Definitions</div>
          {readOnly ? (
            // Read-only: just render in current order
            <div role="list" aria-label="Definitions (read-only)">
              {rightOrder.map((rightId, idx) => {
                const pair = options.pairs.find((p) => p.id === rightId);
                const leftId = options.pairs[idx]?.id;
                return (
                  <div
                    key={rightId}
                    role="listitem"
                    className={`mb-3 rounded border p-3 ${
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
              })}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              accessibility={{
                announcements,
              }}
            >
              <SortableContext items={rightOrder} strategy={verticalListSortingStrategy}>
                <div role="list" aria-label="Definitions to match with terms">
                  {rightOrder.map((rightId, idx) => {
                    const pair = options.pairs.find((p) => p.id === rightId);
                    const leftId = options.pairs[idx]?.id;
                    return (
                      <div key={rightId} className="mb-3">
                        <SortableItem
                          id={rightId}
                          text={pair?.right || ''}
                          isCorrect={showCorrect ? isMatchCorrect(leftId, rightId) : undefined}
                          showCorrect={showCorrect}
                        />
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
