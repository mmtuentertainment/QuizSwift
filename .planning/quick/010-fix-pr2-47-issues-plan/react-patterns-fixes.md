# React Patterns Fixes - PR #2 Review

**Issues:** 5 react pattern issues
**Priority:** HIGH (1), MEDIUM (4)

---

## Issue 1: Potential Stale Closure in Matching useEffect (HIGH)

**File:** `src/components/questions/types/matching.tsx`
**Lines:** 89-99

### Current Problematic Pattern

```tsx
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
```

### Problem Analysis

This effect runs only on mount (empty dependency array) but references:
- `answer?.pairs` - could be stale if answer changes before mount
- `readOnly` - could be stale
- `options.pairs` - could be stale
- `rightOrder` - correctly captured from initial useState
- `onAnswer` - callback that could be stale

The comment says "only run on mount" which is intentional, but the pattern of calling `onAnswer` with values captured at mount time is problematic if `onAnswer` itself has closed over parent state that expects synchronization.

### Fixed Code

```tsx
// Track if we've initialized to avoid double-reporting
const hasInitialized = useRef(false);

// Report initial shuffled state to parent if no existing answer
useEffect(() => {
  // Only initialize once, and only if no existing answer
  if (hasInitialized.current) return;
  if (answer?.pairs || readOnly) return;

  hasInitialized.current = true;

  const initialMatches = options.pairs.map((p, idx) => ({
    leftId: p.id,
    rightId: rightOrder[idx],
  }));
  onAnswer({ type: 'matching', pairs: initialMatches });
}, [answer?.pairs, readOnly, options.pairs, rightOrder, onAnswer]);
```

### Why This Is Correct

1. **Ref tracks initialization:** Using `hasInitialized` ref ensures we only report once, preventing repeated calls if dependencies change.
2. **Proper dependencies:** All values used inside the effect are in the dependency array, satisfying `exhaustive-deps`.
3. **Same behavior:** Still only initializes once (first run where conditions are met), but React can properly track dependencies.
4. **No stale closures:** If `onAnswer` changes (parent re-renders), the effect sees the latest callback.

### Additional Import Required

Add `useRef` to the import:
```tsx
import { useState, useEffect, useRef } from 'react';
```

---

## Issue 2: useCallback Dependency Includes Object Reference (MEDIUM)

**File:** `src/components/quiz/quiz-taker.tsx`
**Lines:** 212-248

### Current Problematic Pattern

```tsx
const handleAnswer = useCallback(async (answerData: RendererAnswerData) => {
  if (!attemptId || !currentQuestion) return;
  // ... uses currentQuestion.id
}, [attemptId, currentQuestion, addOptimisticAnswer]);
```

### Problem Analysis

The dependency `currentQuestion` is an object reference. When the parent component re-renders, even if `currentQuestion` has the same content, it may be a new object reference, causing unnecessary re-creation of `handleAnswer`. Inside the callback, only `currentQuestion.id` is used.

### Fixed Code

```tsx
const currentQuestionId = currentQuestion?.id;

const handleAnswer = useCallback(async (answerData: RendererAnswerData) => {
  if (!attemptId || !currentQuestionId) return;

  // Clear any previous save error
  setSaveError(null);

  // Show optimistic update immediately
  addOptimisticAnswer({ questionId: currentQuestionId, answer: answerData });

  // Convert to library format and submit to server
  const libAnswer = toLibAnswerData(answerData);
  if (libAnswer) {
    startTransition(async () => {
      try {
        const result = await submitAnswer(attemptId, currentQuestionId, libAnswer);
        if (result.error) {
          console.error('Failed to save answer:', result.error);
          setSaveError(`Failed to save answer: ${result.error}`);
        } else {
          setSavedAnswers((prev) => new Map(prev).set(currentQuestionId, answerData));
        }
      } catch (err) {
        console.error('Failed to save answer:', err);
        setSaveError('Failed to save your answer. Please check your connection and try again.');
      }
    });
  } else {
    setSavedAnswers((prev) => new Map(prev).set(currentQuestionId, answerData));
  }
}, [attemptId, currentQuestionId, addOptimisticAnswer]);
```

### Why This Is Correct

1. **Primitive dependency:** `currentQuestionId` is a string (primitive), which has stable identity when the value is the same.
2. **Reduced re-renders:** `handleAnswer` only recreates when the actual question ID changes, not when the question object reference changes.
3. **Passed to child:** `handleAnswer` is passed to `QuestionRenderer`, so reducing unnecessary recreations prevents unnecessary child re-renders.

---

## Issue 3: Missing FileReader Cleanup (MEDIUM)

**File:** `src/components/questions/image-upload.tsx`
**Lines:** 72-74

### Current Problematic Pattern

```tsx
// Show preview immediately for better UX
const reader = new FileReader();
reader.onload = (e) => setPreview(e.target?.result as string);
reader.readAsDataURL(file);
```

### Problem Analysis

The FileReader:
1. Is created inside `handleFileSelect` callback
2. Has no cleanup if component unmounts before `onload` fires
3. Could call `setPreview` on an unmounted component, causing memory leak warnings

However, since this is inside a `useCallback`, not a `useEffect`, the standard cleanup pattern doesn't directly apply. The fix involves tracking mount state.

### Fixed Code

```tsx
// Add ref to track mount state at component level
const isMountedRef = useRef(true);

// Add cleanup effect
useEffect(() => {
  return () => {
    isMountedRef.current = false;
  };
}, []);

// Update handleFileSelect
const handleFileSelect = useCallback(
  async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadProgress(0);

    // Client-side type validation
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Please select a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Client-side size validation
    if (file.size > MAX_IMAGE_SIZE) {
      setError(`Image must be smaller than ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
      return;
    }

    // Show preview immediately for better UX
    const reader = new FileReader();
    reader.onload = (e) => {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setPreview(e.target?.result as string);
      }
    };
    reader.onerror = () => {
      if (isMountedRef.current) {
        setError('Failed to read file');
      }
    };
    reader.readAsDataURL(file);

    // ... rest of upload logic unchanged
  },
  [currentImageUrl, onUpload]
);
```

### Why This Is Correct

1. **Mount tracking:** `isMountedRef` tracks whether the component is still mounted.
2. **Safe state updates:** `setPreview` and `setError` only called if mounted.
3. **Error handling:** Added `onerror` handler for completeness.
4. **No memory leaks:** FileReader callback is a no-op if component unmounted.

### Alternative: AbortController Pattern

For the fetch calls, consider also adding AbortController:

```tsx
const abortControllerRef = useRef<AbortController | null>(null);

useEffect(() => {
  return () => {
    abortControllerRef.current?.abort();
  };
}, []);

// In handleFileSelect:
abortControllerRef.current?.abort();
abortControllerRef.current = new AbortController();

const response = await fetch('/api/upload/image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... }),
  signal: abortControllerRef.current.signal,
});
```

---

## Issue 4: useOptimistic Revert Behavior Misunderstood in Comments (MEDIUM)

**File:** `src/components/quiz/quiz-taker.tsx`
**Lines:** 136-144 and 225-242

### Current Pattern with Inaccurate Comments

```tsx
// Optimistic answers with auto-revert on failure (React 19 pattern)
const [optimisticAnswers, addOptimisticAnswer] = useOptimistic(
  savedAnswers,
  (state, update: { questionId: string; answer: RendererAnswerData }) => {
    const next = new Map(state);
    next.set(update.questionId, update.answer);
    return next;
  }
);
```

And in handleAnswer:
```tsx
// Use startTransition for the async server operation
// On success: update savedAnswers (optimistic becomes real)
// On failure: transition ends without updating savedAnswers (auto-reverts)
startTransition(async () => {
  try {
    const result = await submitAnswer(attemptId, currentQuestion.id, libAnswer);
    if (result.error) {
      console.error('Failed to save answer:', result.error);
      setSaveError(`Failed to save answer: ${result.error}`);
      // Don't update savedAnswers - optimistic will revert
    } else {
      // Success: update saved answers so optimistic becomes permanent
      setSavedAnswers((prev) => new Map(prev).set(currentQuestion.id, answerData));
    }
  } catch (err) {
    // Don't update savedAnswers - optimistic will revert
  }
});
```

### Problem Analysis

The comments suggest `useOptimistic` auto-reverts on failure, but this understanding is subtly incorrect:

1. `useOptimistic` returns to base state when the transition completes (success or failure)
2. The "revert" happens because `savedAnswers` wasn't updated, not because of error detection
3. If `savedAnswers` IS updated (success case), optimistic value = saved value, so no visible change
4. The pattern is correct, but comments could confuse future maintainers

### Fixed Comments

```tsx
/**
 * Optimistic UI Pattern with useOptimistic (React 19)
 *
 * How it works:
 * 1. `optimisticAnswers` shows pending updates immediately
 * 2. When startTransition completes, `optimisticAnswers` reverts to `savedAnswers`
 * 3. On success: we update `savedAnswers` to match, so the UI stays consistent
 * 4. On failure: we DON'T update `savedAnswers`, so revert shows previous state
 *
 * The "auto-revert" is actually "revert to base state" - we control what
 * that base state is by updating (or not updating) savedAnswers.
 */
const [optimisticAnswers, addOptimisticAnswer] = useOptimistic(
  savedAnswers,
  (state, update: { questionId: string; answer: RendererAnswerData }) => {
    const next = new Map(state);
    next.set(update.questionId, update.answer);
    return next;
  }
);
```

And in handleAnswer:
```tsx
startTransition(async () => {
  try {
    const result = await submitAnswer(attemptId, currentQuestionId, libAnswer);
    if (result.error) {
      console.error('Failed to save answer:', result.error);
      setSaveError(`Failed to save answer: ${result.error}`);
      // Transition ends -> optimisticAnswers reverts to savedAnswers (unchanged)
      // User sees their answer disappear, indicating save failed
    } else {
      // Update savedAnswers so when transition ends, optimistic = saved
      // User sees no change (answer persists) - success!
      setSavedAnswers((prev) => new Map(prev).set(currentQuestionId, answerData));
    }
  } catch (err) {
    console.error('Failed to save answer:', err);
    setSaveError('Failed to save your answer. Please check your connection and try again.');
    // Transition ends -> reverts to savedAnswers (unchanged) -> shows previous answer
  }
});
```

### Why This Is Correct

1. **Accurate mental model:** Comments now correctly describe the mechanism.
2. **Future-proof:** Maintainers understand WHY it works, not just that it does.
3. **No code change needed:** The implementation is correct, only comments needed updating.

---

## Issue 5: State Reset During Render Pattern in Question Editor (MEDIUM)

**File:** `src/components/questions/question-editor.tsx`
**Lines:** 60-83

### Current Pattern

```tsx
// Local state for form fields
const [questionText, setQuestionText] = useState(question.questionText);
const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer);
const [explanation, setExplanation] = useState(question.explanation);
const [sourceEvidence, setSourceEvidence] = useState(question.sourceEvidence);
const [options, setOptions] = useState<QuestionOptions | null>(question.options);
const [imageUrl, setImageUrl] = useState<string | null>(question.imageUrl ?? null);
const [imageAltText, setImageAltText] = useState<string | null>(question.imageAltText ?? null);

// Reset form state when modal opens or question identity changes
useEffect(() => {
  if (isOpen) {
    setQuestionText(question.questionText);
    setCorrectAnswer(question.correctAnswer);
    setExplanation(question.explanation);
    setSourceEvidence(question.sourceEvidence);
    setOptions(question.options);
    setImageUrl(question.imageUrl ?? null);
    setImageAltText(question.imageAltText ?? null);
    setError(null);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reset only on question.id change
}, [isOpen, question.id]);
```

### Problem Analysis

1. **useState initializers are ignored on re-render:** The initial values (`question.questionText`, etc.) only matter on first mount.
2. **useEffect sync pattern:** This is actually the CORRECT pattern for syncing derived state when props change.
3. **The eslint-disable is justified:** We intentionally only reset on `question.id` change, not on every field change.

**However, there's a subtle issue:** If `isOpen` toggles false->true while `question.id` stays the same, the form resets. This could discard user edits if they:
1. Edit the form
2. Close modal without saving
3. Reopen modal for same question

### Analysis of Intent

Looking at the code, this appears INTENTIONAL - closing and reopening the modal should reset unsaved changes. The current pattern is:
- Modal opens -> form initializes from `question` prop
- User edits -> local state diverges from prop
- User closes without saving -> edits lost (intentional)
- User reopens -> form re-initializes (correct behavior)

### Recommended: No Code Change, Document Intent

The current pattern is correct for this use case. Add documentation:

```tsx
/**
 * Form State Management Pattern
 *
 * We use local state for form fields, synced from props via useEffect.
 * This is intentional:
 *
 * 1. Initial render: useState initializes from question prop
 * 2. User edits: local state diverges (controlled inputs)
 * 3. Save: server action updates, parent receives callback, modal closes
 * 4. Cancel/close: local state discarded (desired UX - no unsaved draft)
 * 5. Reopen: useEffect resets from current question prop
 *
 * The effect depends on [isOpen, question.id] because:
 * - isOpen: reset form when modal opens (discard any stale local state)
 * - question.id: reset when editing a DIFFERENT question
 * - NOT question.* fields: don't reset while user is editing
 */
// Local state for form fields
const [questionText, setQuestionText] = useState(question.questionText);
// ... etc
```

### Alternative: Key-based Reset (Optional Enhancement)

If you want to make the reset behavior more explicit and React-idiomatic:

```tsx
// Parent component:
<QuestionEditor
  key={`${question.id}-${isOpen}`}  // Forces remount on open
  question={question}
  isOpen={isOpen}
  onClose={onClose}
  onSave={onSave}
/>
```

Then remove the useEffect sync entirely - each open creates a fresh component instance. However, this has tradeoffs (loses any component-level caching, forces full remount).

**Recommendation:** Keep current pattern, add documentation comment.

---

## Summary of Changes

| Issue | File | Change Type | Priority |
|-------|------|-------------|----------|
| 1 | matching.tsx | Add ref + proper deps | HIGH |
| 2 | quiz-taker.tsx | Extract primitive dep | MEDIUM |
| 3 | image-upload.tsx | Add mount tracking | MEDIUM |
| 4 | quiz-taker.tsx | Update comments only | MEDIUM |
| 5 | question-editor.tsx | Add documentation | MEDIUM |

## Verification

After applying fixes:

1. **ESLint:** Run `npm run lint` - no `react-hooks/exhaustive-deps` warnings should remain
2. **Type check:** Run `npm run typecheck` - should pass
3. **Functional test:**
   - Matching question: Navigate away and back, initial state should report correctly
   - Quiz taker: Answer questions, ensure optimistic updates work
   - Image upload: Start upload, navigate away, no console warnings
   - Question editor: Open/close modal, verify form resets correctly
