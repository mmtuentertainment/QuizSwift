# Quick Task 013: PR #2 Waves 6-7 Fixes

**Type:** quick
**Priority:** HIGH (Wave 6), MEDIUM (Wave 7)
**Estimated context:** ~30%

## Objective

Fix remaining PR #2 issues: Wave 6 (Error Handling) and Wave 7 (React Patterns).

**Purpose:** Address 6 issues to improve error visibility and React best practices.
**Output:** 6 updated files with proper error handling and React patterns.

## Context

- `.planning/quick/010-fix-pr2-47-issues-plan/error-handling-fixes.md` - Full specs
- `.planning/quick/010-fix-pr2-47-issues-plan/react-patterns-fixes.md` - Full specs
- PR #2 progress: 15/47 issues resolved (Waves 1-5 complete)

## Tasks

### Task 1: Question Bank Error Banner (Wave 6)

**File:** `src/app/(dashboard)/question-bank/page.tsx`

**Action:**
1. Add error tracking variables after line 44:
   ```typescript
   const hasDocumentsError = !documentsResult.success;
   const hasQuestionsError = !questionsResult.success;
   const documentsError = !documentsResult.success ? documentsResult.error : null;
   const questionsError = !questionsResult.success ? questionsResult.error : null;
   ```
2. Add error banner JSX between header (line 61) and stats (line 63):
   ```tsx
   {(hasDocumentsError || hasQuestionsError) && (
     <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
       <h3 className="font-medium text-red-800">Error loading data</h3>
       <ul className="mt-2 list-inside list-disc text-sm text-red-700">
         {documentsError && <li>Documents: {documentsError}</li>}
         {questionsError && <li>Questions: {questionsError}</li>}
       </ul>
       <p className="mt-2 text-sm text-red-600">
         Please refresh the page or try again later.
       </p>
     </div>
   )}
   ```

**Verify:** `npm run typecheck && npm run lint`

**Done:** Error banner displays when documents or questions fail to load, with specific error messages.

---

### Task 2: Quiz Taker Failed Save Tracking (Wave 6)

**File:** `src/components/quiz/quiz-taker.tsx`

**Action:**
1. Add state after line 157:
   ```typescript
   const [failedSaveQuestionIds, setFailedSaveQuestionIds] = useState<Set<string>>(new Set());
   ```

2. Update catch block (line 246-249) to track failed question:
   ```typescript
   } catch (err) {
     console.error('Failed to save answer:', err);
     setSaveError('Failed to save your answer. Please check your connection and try again.');
     setFailedSaveQuestionIds(prev => new Set(prev).add(currentQuestion.id));
   }
   ```

3. Update success branch (line 243-244) to clear from failed set:
   ```typescript
   } else {
     setSavedAnswers((prev) => new Map(prev).set(currentQuestion.id, answerData));
     setFailedSaveQuestionIds(prev => {
       const next = new Set(prev);
       next.delete(currentQuestion.id);
       return next;
     });
   }
   ```

4. Update question dots (line 441-455) to show red for failed saves:
   ```tsx
   className={`h-3 w-3 rounded-full transition-all ${
     idx === currentIndex
       ? 'scale-125 bg-blue-600 ring-2 ring-blue-300'
       : failedSaveQuestionIds.has(q.id)
         ? 'bg-red-500 ring-2 ring-red-300 hover:bg-red-400'
         : optimisticAnswers.has(q.id)
           ? 'bg-green-500 hover:bg-green-400'
           : 'bg-gray-300 hover:bg-gray-400'
   }`}
   aria-label={`Go to question ${idx + 1}${
     failedSaveQuestionIds.has(q.id)
       ? ' (save failed)'
       : optimisticAnswers.has(q.id)
         ? ' (answered)'
         : ''
   }`}
   ```

5. Add failed saves warning before submit (after line 503, before unanswered warning):
   ```tsx
   {currentIndex === questions.length - 1 && failedSaveQuestionIds.size > 0 && (
     <div className="rounded-lg border border-red-200 bg-red-50 p-4">
       <p className="text-sm text-red-800">
         <strong>Warning:</strong> {failedSaveQuestionIds.size} answer
         {failedSaveQuestionIds.size > 1 ? 's' : ''} failed to save.
         Please check your connection before submitting.
       </p>
     </div>
   )}
   ```

**Verify:** `npm run typecheck && npm run lint`

**Done:** Failed saves tracked persistently with red dots and warning before submit.

---

### Task 3: Questions fieldErrors Format (Wave 6)

**File:** `src/actions/questions.ts`

**Action:**
1. Update return type at line 190:
   ```typescript
   export async function updateQuestion(
     questionId: string,
     data: UpdateQuestionInput
   ): Promise<{
     success: boolean;
     error?: string;
     fieldErrors?: Record<string, string[] | undefined>;
   }> {
   ```

2. Update validation error return (lines 196-200):
   ```typescript
   const parsed = UpdateQuestionSchema.safeParse(data);
   if (!parsed.success) {
     const fieldErrors = parsed.error.flatten().fieldErrors;
     const firstError = Object.entries(fieldErrors).find(([, errs]) => errs && errs.length > 0);
     const errorSummary = firstError
       ? `${firstError[0]}: ${firstError[1]?.[0]}`
       : 'Validation failed';
     return {
       success: false,
       error: errorSummary,
       fieldErrors,
     };
   }
   ```

**Verify:** `npm run typecheck && npm run lint`

**Done:** Validation errors return fieldErrors in Next.js best practice format with summary.

---

### Task 4: Matching useEffect Stale Closure Fix (Wave 7)

**File:** `src/components/questions/types/matching.tsx`

**Action:**
1. Add useRef to imports (line 3):
   ```typescript
   import { useState, useEffect, useMemo, useRef } from 'react';
   ```

2. Add ref after useState (after line 97):
   ```typescript
   const hasInitialized = useRef(false);
   ```

3. Replace the first useEffect (lines 99-110):
   ```typescript
   // Report initial shuffled state to parent if no existing answer
   useEffect(() => {
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

**Verify:** `npm run typecheck && npm run lint` - no exhaustive-deps warnings

**Done:** useEffect has proper dependencies with ref-based initialization guard.

---

### Task 5: Quiz Taker Primitive Dependency (Wave 7)

**File:** `src/components/quiz/quiz-taker.tsx`

**Action:**
1. Extract primitive before handleAnswer (before line 220):
   ```typescript
   const currentQuestionId = currentQuestion?.id;
   ```

2. Update handleAnswer to use primitive (line 220-256):
   ```typescript
   const handleAnswer = useCallback(async (answerData: RendererAnswerData) => {
     if (!attemptId || !currentQuestionId) return;

     setSaveError(null);
     addOptimisticAnswer({ questionId: currentQuestionId, answer: answerData });

     const libAnswer = toLibAnswerData(answerData);
     if (libAnswer) {
       startTransition(async () => {
         try {
           const result = await submitAnswer(attemptId, currentQuestionId, libAnswer);
           if (result.error) {
             console.error('Failed to save answer:', result.error);
             setSaveError(`Failed to save answer: ${result.error}`);
             setFailedSaveQuestionIds(prev => new Set(prev).add(currentQuestionId));
           } else {
             setSavedAnswers((prev) => new Map(prev).set(currentQuestionId, answerData));
             setFailedSaveQuestionIds(prev => {
               const next = new Set(prev);
               next.delete(currentQuestionId);
               return next;
             });
           }
         } catch (err) {
           console.error('Failed to save answer:', err);
           setSaveError('Failed to save your answer. Please check your connection and try again.');
           setFailedSaveQuestionIds(prev => new Set(prev).add(currentQuestionId));
         }
       });
     } else {
       setSavedAnswers((prev) => new Map(prev).set(currentQuestionId, answerData));
     }
   }, [attemptId, currentQuestionId, addOptimisticAnswer]);
   ```

**Verify:** `npm run typecheck && npm run lint`

**Done:** useCallback depends on primitive currentQuestionId, reducing unnecessary recreations.

---

### Task 6: Image Upload FileReader Cleanup (Wave 7)

**File:** `src/components/questions/image-upload.tsx`

**Action:**
1. Add mount tracking ref after fileInputRef (line 44):
   ```typescript
   const isMountedRef = useRef(true);
   ```

2. Add cleanup effect after the preview sync effect (after line 49):
   ```typescript
   useEffect(() => {
     return () => {
       isMountedRef.current = false;
     };
   }, []);
   ```

3. Update FileReader in handleFileSelect (lines 72-74):
   ```typescript
   const reader = new FileReader();
   reader.onload = (e) => {
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
   ```

**Verify:** `npm run typecheck && npm run lint`

**Done:** FileReader callbacks check mount state before updating, preventing memory leak warnings.

---

## Verification

After all tasks:
```bash
npm run typecheck && npm run lint && npm run build
```

All commands must pass.

## Success Criteria

- [ ] Question bank shows error banner when data fails to load
- [ ] Quiz taker tracks failed saves with red dots and warning
- [ ] updateQuestion returns fieldErrors in Next.js best practice format
- [ ] Matching useEffect has proper dependencies (no eslint-disable needed)
- [ ] Quiz taker handleAnswer uses primitive dependency
- [ ] Image upload FileReader has mount state cleanup
- [ ] All verification commands pass
