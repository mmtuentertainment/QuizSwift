# Accessibility Fixes Plan - PR #2

**Issues:** 4 accessibility issues
**Priority:** HIGH (3), MEDIUM (1)
**WCAG References:** 4.1.2, 1.3.1, 2.1.1

---

## Issue 1: Matching Component Lacks ARIA Labels for Drag-and-Drop

**Severity:** HIGH
**File:** `src/components/questions/types/matching.tsx`
**WCAG:** 4.1.2 (Name, Role, Value), 2.1.1 (Keyboard)

### Problem

The `SortableItem` component renders draggable items without accessible names. Screen reader users cannot understand what items they're manipulating or their purpose in the matching exercise.

### Current Code (Lines 53-69)

```tsx
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
```

### Fixed Code

```tsx
return (
  <div
    ref={setNodeRef}
    style={style}
    {...attributes}
    {...listeners}
    role="listitem"
    aria-label={`Draggable definition: ${text}. ${
      showCorrect
        ? isCorrect
          ? 'Correctly matched'
          : 'Incorrectly matched'
        : 'Press Space to grab, arrow keys to move, Space to drop'
    }`}
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
```

### Additional Changes Required

**Update SortableItem props (Lines 32-42):**

```tsx
function SortableItem({
  id,
  text,
  index,
  totalItems,
  isCorrect,
  showCorrect,
}: {
  id: string;
  text: string;
  index: number;
  totalItems: number;
  isCorrect?: boolean;
  showCorrect?: boolean;
}) {
```

**Update DndContext wrapper (Lines 184-204):**

```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
  accessibility={{
    announcements: {
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
    },
  }}
>
```

**Add list container role (Lines 160-162):**

```tsx
<div
  className="space-y-3"
  role="list"
  aria-label="Definitions to match with terms"
>
```

**Update instructions text (Lines 145-147):**

```tsx
<div className="mb-2 text-sm text-gray-600" id="matching-instructions">
  Drag items on the right to match with items on the left.
  <span className="sr-only">
    Keyboard users: Press Tab to navigate to items, Space to pick up, arrow keys to move, Space to drop.
  </span>
</div>
```

---

## Issue 2: Quiz Progress Bar Missing Progressbar Role/Attributes

**Severity:** HIGH
**File:** `src/components/quiz/quiz-taker.tsx`
**WCAG:** 4.1.2 (Name, Role, Value), 1.3.1 (Info and Relationships)

### Problem

The progress bar is purely visual. Screen reader users have no way to understand quiz progress.

### Current Code (Lines 375-381)

```tsx
{/* Progress bar */}
<div className="h-2 overflow-hidden rounded-full bg-gray-200">
  <div
    className="h-full bg-blue-500 transition-all duration-300"
    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
  />
</div>
```

### Fixed Code

```tsx
{/* Progress bar */}
<div
  role="progressbar"
  aria-valuenow={currentIndex + 1}
  aria-valuemin={1}
  aria-valuemax={questions.length}
  aria-label={`Quiz progress: Question ${currentIndex + 1} of ${questions.length}`}
  className="h-2 overflow-hidden rounded-full bg-gray-200"
>
  <div
    className="h-full bg-blue-500 transition-all duration-300"
    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
    aria-hidden="true"
  />
</div>
```

### Additional Enhancement: Loading Spinner Accessibility (Lines 292-298)

**Current:**
```tsx
<div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
<p className="text-gray-600">Loading quiz...</p>
```

**Fixed:**
```tsx
<div
  className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"
  role="status"
  aria-label="Loading quiz"
/>
<p className="text-gray-600" aria-live="polite">Loading quiz...</p>
```

---

## Issue 3: Form Inputs Missing Proper Label Associations

**Severity:** HIGH
**File:** `src/components/quiz/quiz-builder.tsx`
**WCAG:** 1.3.1 (Info and Relationships), 4.1.2 (Name, Role, Value)

### Problem

Several form inputs lack explicit `id` attributes and proper `htmlFor` associations on labels.

### Current Code - Title Input (Lines 80-91)

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700">
    Title *
  </label>
  <input
    type="text"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
    placeholder="Chapter 5 Quiz"
    required
  />
</div>
```

### Fixed Code - Title Input

```tsx
<div>
  <label
    htmlFor="quiz-title"
    className="block text-sm font-medium text-gray-700"
  >
    Title *
  </label>
  <input
    id="quiz-title"
    type="text"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
    placeholder="Chapter 5 Quiz"
    required
    aria-required="true"
  />
</div>
```

### Current Code - Description Textarea (Lines 94-105)

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700">
    Description
  </label>
  <textarea
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
    rows={2}
    placeholder="Optional description..."
  />
</div>
```

### Fixed Code - Description Textarea

```tsx
<div>
  <label
    htmlFor="quiz-description"
    className="block text-sm font-medium text-gray-700"
  >
    Description
  </label>
  <textarea
    id="quiz-description"
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
    rows={2}
    placeholder="Optional description..."
  />
</div>
```

### Current Code - Time Limit Input (Lines 108-123)

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700">
    Time Limit (minutes)
  </label>
  <input
    type="number"
    value={timeLimit ?? ''}
    onChange={(e) =>
      setTimeLimit(e.target.value ? parseInt(e.target.value) : null)
    }
    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
    min={1}
    max={300}
    placeholder="No limit"
  />
</div>
```

### Fixed Code - Time Limit Input

```tsx
<div>
  <label
    htmlFor="quiz-time-limit"
    className="block text-sm font-medium text-gray-700"
  >
    Time Limit (minutes)
  </label>
  <input
    id="quiz-time-limit"
    type="number"
    value={timeLimit ?? ''}
    onChange={(e) =>
      setTimeLimit(e.target.value ? parseInt(e.target.value) : null)
    }
    className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
    min={1}
    max={300}
    placeholder="No limit"
    aria-describedby="time-limit-hint"
  />
  <span id="time-limit-hint" className="sr-only">
    Leave empty for no time limit
  </span>
</div>
```

### Current Code - Question Selection Checkboxes (Lines 160-166)

```tsx
<label className="flex cursor-pointer items-start gap-3">
  <input
    type="checkbox"
    checked={selectedIds.has(question.id)}
    onChange={() => toggleQuestion(question.id)}
    className="mt-1 h-4 w-4"
  />
```

### Fixed Code - Question Selection Checkboxes

```tsx
<label className="flex cursor-pointer items-start gap-3">
  <input
    type="checkbox"
    checked={selectedIds.has(question.id)}
    onChange={() => toggleQuestion(question.id)}
    className="mt-1 h-4 w-4"
    aria-label={`Select question ${idx + 1}: ${question.questionText.slice(0, 50)}...`}
  />
```

---

## Issue 4: Modal Focus Trap Missing in Question Editors

**Severity:** MEDIUM
**Files:**
- `src/components/questions/question-editor.tsx`
- `src/components/question-bank/question-editor.tsx`

**WCAG:** 2.1.1 (Keyboard), 2.4.3 (Focus Order)

### Problem

Both modal editors have `role="dialog"` and `aria-modal="true"` but lack focus trapping. Users can Tab out of the modal into the background content.

### Solution: Create Shared Focus Trap Hook

**New file:** `src/hooks/use-focus-trap.ts`

```tsx
import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to trap focus within a modal container.
 * WCAG 2.1.1: All functionality must be operable via keyboard.
 *
 * @param isActive - Whether the focus trap should be active
 * @returns ref to attach to the container element
 */
export function useFocusTrap<T extends HTMLElement>(isActive: boolean) {
  const containerRef = useRef<T>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    );
  }, []);

  useEffect(() => {
    if (!isActive) return;

    // Store the currently focused element to restore later
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // Focus the first focusable element in the modal
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab from first element -> go to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      // Tab from last element -> go to first
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to the previously focused element
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isActive, getFocusableElements]);

  return containerRef;
}
```

### Update: `src/components/questions/question-editor.tsx`

**Import the hook (Line 15):**

```tsx
import { useState, useTransition, useCallback, useEffect } from 'react';
import { useFocusTrap } from '@/hooks/use-focus-trap';
```

**Replace modalRef usage (Line 50-57):**

Current:
```tsx
const modalRef = useRef<HTMLDivElement>(null);

// Focus modal when opened for keyboard event handling
useEffect(() => {
  if (isOpen && modalRef.current) {
    modalRef.current.focus();
  }
}, [isOpen]);
```

Fixed:
```tsx
const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
```

**Update modal container (Lines 276-286):**

Current:
```tsx
<div
  ref={modalRef}
  tabIndex={-1}
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  onClick={onClose}
  onKeyDown={handleKeyDown}
  role="dialog"
  aria-modal="true"
  aria-labelledby="question-editor-title"
>
```

Fixed:
```tsx
<div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  onClick={onClose}
  onKeyDown={handleKeyDown}
  aria-hidden="true"
>
  <div
    ref={modalRef}
    role="dialog"
    aria-modal="true"
    aria-labelledby="question-editor-title"
    className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
    onClick={(e) => e.stopPropagation()}
  >
```

### Update: `src/components/question-bank/question-editor.tsx`

**Import the hook (Line 3):**

```tsx
import { useState, useTransition } from 'react';
import { useFocusTrap } from '@/hooks/use-focus-trap';
```

**Add the hook after existing state (Line 24):**

```tsx
const [isPending, startTransition] = useTransition();
const [error, setError] = useState<string | null>(null);
const modalRef = useFocusTrap<HTMLDivElement>(true); // Modal is always open when rendered
```

**Update modal structure (Lines 73-79):**

Current:
```tsx
return (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    role="dialog"
    aria-modal="true"
    aria-labelledby="question-editor-title"
  >
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
```

Fixed:
```tsx
return (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onClick={onClose}
    aria-hidden="true"
  >
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-editor-title"
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
```

---

## Summary of Changes

| File | Changes | WCAG |
|------|---------|------|
| `src/components/questions/types/matching.tsx` | Add ARIA labels, announcements, list roles | 4.1.2, 2.1.1 |
| `src/components/quiz/quiz-taker.tsx` | Add progressbar role/attributes, loading states | 4.1.2, 1.3.1 |
| `src/components/quiz/quiz-builder.tsx` | Add id/htmlFor associations, aria-labels | 1.3.1, 4.1.2 |
| `src/hooks/use-focus-trap.ts` | NEW FILE - reusable focus trap hook | 2.1.1 |
| `src/components/questions/question-editor.tsx` | Integrate focus trap | 2.1.1, 2.4.3 |
| `src/components/question-bank/question-editor.tsx` | Integrate focus trap | 2.1.1, 2.4.3 |

## Verification Checklist

- [ ] Screen reader announces drag-and-drop instructions in matching component
- [ ] Progress bar announces current question position
- [ ] All form inputs have programmatically associated labels
- [ ] Tab key cycles within modal without escaping to background
- [ ] ESC key still closes modals
- [ ] Focus returns to trigger element when modal closes
- [ ] Keyboard-only navigation works for all interactive elements
