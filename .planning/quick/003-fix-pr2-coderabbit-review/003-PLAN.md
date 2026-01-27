---
quick: 003
type: execute
title: Fix CodeRabbit PR #2 Review Issues
wave: 1
autonomous: true
files_modified:
  - .coderabbit.yaml
  - src/actions/attempts.ts
  - src/actions/questions.ts
  - src/actions/quiz.ts
  - src/app/(dashboard)/documents/[id]/curate/curation-client.tsx
  - src/app/(dashboard)/documents/[id]/quiz/[quizId]/preview/actions.tsx
  - src/components/question-bank/question-filters.tsx
  - src/components/questions/question-editor.tsx
  - src/components/question-bank/question-editor.tsx
  - src/components/quiz/quiz-taker.tsx
  - src/components/quiz/quiz-builder.tsx
  - src/components/question-bank/question-list.tsx
  - src/app/(dashboard)/documents/[id]/quiz/page.tsx
  - src/lib/storage/pdf-storage.ts
  - src/app/api/upload/route.ts
---

<objective>
Fix all CodeRabbit review issues from PR #2 to improve code quality, security, and accessibility.

Purpose: Address 19 code review findings spanning configuration, security, navigation, accessibility, component state, and consistency.
Output: Clean, reviewed code ready for merge.
</objective>

<execution_context>
@C:\Users\matth\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\matth\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Configuration and Server Action Security Fixes</name>
  <files>
    - .coderabbit.yaml
    - src/actions/attempts.ts
    - src/actions/questions.ts
    - src/actions/quiz.ts
  </files>
  <action>
**1. .coderabbit.yaml (line 56-59):** Remove invalid `chat` block - `chat.enabled` is not in CodeRabbit schema.

**2. src/actions/attempts.ts (lines 22-52) - startAttempt:**
- Add quiz authorization check: Verify user has access to the quiz before creating attempt
- Replace find-then-create pattern with Prisma `upsert` to prevent race condition:
  ```typescript
  const attempt = await prisma.quizAttempt.upsert({
    where: {
      quizId_userId: { quizId, userId: session.user.id }
    },
    update: {}, // No-op if exists
    create: {
      quizId,
      userId: session.user.id,
      status: 'in_progress',
    },
  });
  ```

**3. src/actions/questions.ts (lines 41-94) - getQuestions:**
- Validate and clamp page/limit inputs to safe ranges:
  ```typescript
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(filters.limit ?? 20)));
  const offset = Math.max(0, (page - 1) * limit);
  ```

**4. src/actions/questions.ts (lines 138-146) - UpdateQuestionSchema:**
- Replace `z.unknown()` with proper schema for options field:
  ```typescript
  const questionOptionsSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('multiple_choice'), choices: z.array(z.object({ id: z.string(), text: z.string(), isCorrect: z.boolean() })) }),
    z.object({ type: z.literal('fill_in_blank'), blanks: z.array(z.object({ id: z.string(), correctAnswers: z.array(z.string()) })) }),
    z.object({ type: z.literal('matching'), pairs: z.array(z.object({ id: z.string(), left: z.string(), right: z.string() })) }),
    z.object({ type: z.literal('true_false') }),
    z.object({ type: z.literal('essay') }),
    z.object({ type: z.literal('short_answer') }),
    z.object({ type: z.literal('show_work') }),
  ]);
  options: questionOptionsSchema.optional(),
  ```

**5. src/actions/questions.ts (lines 156-224) - updateQuestion:**
- Add guard against empty updateData object before calling prisma.update:
  ```typescript
  if (Object.keys(updateData).length === 0) {
    return { success: true }; // Nothing to update
  }
  ```

**6. src/actions/quiz.ts (lines 24-32) - createQuiz:**
- Wrap JSON.parse in try-catch:
  ```typescript
  let questionIds: string[] = [];
  try {
    const rawQuestionIds = formData.get('questionIds');
    questionIds = rawQuestionIds ? JSON.parse(rawQuestionIds as string) : [];
  } catch {
    return { error: 'Invalid question IDs format' };
  }
  ```
  </action>
  <verify>
- `npm run lint` passes with no errors in modified files
- `npm run typecheck` passes
  </verify>
  <done>
- CodeRabbit config valid (no invalid keys)
- startAttempt uses upsert + quiz authorization
- getQuestions validates/clamps pagination inputs
- updateQuestion uses proper options schema and guards empty updates
- createQuiz has JSON.parse try-catch
  </done>
</task>

<task type="auto">
  <name>Task 2: Client Navigation and Component State Fixes</name>
  <files>
    - src/app/(dashboard)/documents/[id]/curate/curation-client.tsx
    - src/app/(dashboard)/documents/[id]/quiz/[quizId]/preview/actions.tsx
    - src/components/question-bank/question-filters.tsx
    - src/components/questions/question-editor.tsx
    - src/components/quiz/quiz-taker.tsx
  </files>
  <action>
**7. curation-client.tsx (lines 121-126):**
- Replace `window.location.href` with Next.js router:
  ```typescript
  import { useRouter } from 'next/navigation';
  // In component:
  const router = useRouter();
  // In onClick:
  router.push(`/documents/${documentId}/quiz/new`);
  ```

**8. preview/actions.tsx (lines 36-44) - handleComplete:**
- Wrap markQuizPreviewed in try-catch, handle errors:
  ```typescript
  const handleComplete = useCallback(async (score: number, maxScore: number) => {
    setCompletionState({ completed: true, score, maxScore });
    try {
      const result = await markQuizPreviewed(quizId);
      if (result.error) {
        console.error('Failed to mark quiz as previewed:', result.error);
      }
    } catch (err) {
      console.error('Failed to mark quiz as previewed:', err);
    }
    router.refresh();
  }, [quizId, router]);
  ```

**9. question-filters.tsx (lines 75-113):**
- Add aria-labels to all three select elements:
  - Document filter: `aria-label="Filter by document"`
  - Type filter: `aria-label="Filter by question type"`
  - Bloom level filter: `aria-label="Filter by Bloom's taxonomy level"`

**10. question-filters.tsx (lines 49-58):**
- Add useEffect cleanup for debounce timeout:
  ```typescript
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
  ```

**11. question-filters.tsx (lines 66-70):**
- Convert search input from uncontrolled to controlled:
  ```typescript
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');
  // In input:
  value={searchValue}
  onChange={(e) => {
    setSearchValue(e.target.value);
    handleSearchChange(e.target.value);
  }}
  ```

**12. src/components/questions/question-editor.tsx (lines 15-58):**
- Add useEffect to reset form state when modal opens or question changes:
  ```typescript
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
  }, [isOpen, question]);
  ```

**13. src/components/questions/question-editor.tsx (lines 60-80) - updateMCOption:**
- Fix mutation bug - create new objects instead of mutating:
  ```typescript
  const updateMCOption = useCallback((index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    if (!options || options.type !== 'multiple_choice') return;

    const mcOptions = options as MultipleChoiceOptions;
    const newChoices = mcOptions.choices.map((choice, i) => {
      if (field === 'isCorrect') {
        return { ...choice, isCorrect: i === index };
      }
      if (i === index && field === 'text') {
        return { ...choice, text: value as string };
      }
      return choice;
    });

    setOptions({ ...options, choices: newChoices } as MultipleChoiceOptions);
    // Update correctAnswer...
  }, [options]);
  ```

**14. src/components/quiz/quiz-taker.tsx (lines 193-204) - handleAnswer:**
- Wrap submitAnswer in try-catch:
  ```typescript
  const handleAnswer = useCallback(async (answerData: RendererAnswerData) => {
    if (!attemptId || !currentQuestion) return;

    setAnswers((prev) => new Map(prev).set(currentQuestion.id, answerData));

    const libAnswer = toLibAnswerData(answerData);
    if (libAnswer) {
      try {
        await submitAnswer(attemptId, currentQuestion.id, libAnswer);
      } catch (err) {
        console.error('Failed to save answer:', err);
        // Optionally show user feedback
      }
    }
  }, [attemptId, currentQuestion]);
  ```
  </action>
  <verify>
- `npm run lint` passes
- `npm run typecheck` passes
  </verify>
  <done>
- curation-client uses router.push instead of window.location.href
- preview/actions handles markQuizPreviewed errors
- question-filters has aria-labels, debounce cleanup, controlled search input
- question-editor resets state on open/question change, no mutations in updateMCOption
- quiz-taker has try-catch around submitAnswer
  </done>
</task>

<task type="auto">
  <name>Task 3: Consistency Fixes and File Rename</name>
  <files>
    - src/components/question-bank/question-editor.tsx
    - src/components/quiz/quiz-builder.tsx
    - src/components/question-bank/question-list.tsx
    - src/app/(dashboard)/documents/[id]/quiz/page.tsx
    - src/lib/storage/blob.ts (rename to pdf-storage.ts)
    - src/app/api/upload/route.ts
  </files>
  <action>
**15-18. Underscore replacement consistency:**

All four files use `.replace('_', ' ')` which only replaces the FIRST underscore. Change to `.replace(/_/g, ' ')` to replace ALL underscores.

- **src/components/question-bank/question-editor.tsx line 68:**
  `{question.questionType.replace(/_/g, ' ')}`

- **src/components/quiz/quiz-builder.tsx line 172:**
  `{question.questionType.replace(/_/g, ' ')}`

- **src/components/question-bank/question-list.tsx lines 72-74:**
  `{question.questionType.replace(/_/g, ' ')}`

- **src/app/(dashboard)/documents/[id]/quiz/page.tsx lines 78-91:**
  `{quiz.status.replace(/_/g, ' ')}`

**19. Rename blob.ts to pdf-storage.ts:**

This eliminates naming confusion that caused CodeRabbit false positive (blob.ts sounds like Vercel Blob but is actually R2 PDF storage).

1. Rename file: `src/lib/storage/blob.ts` -> `src/lib/storage/pdf-storage.ts`

2. Update import in `src/app/api/upload/route.ts`:
   ```typescript
   import { uploadPdf, deletePdf } from '@/lib/storage/pdf-storage';
   ```

Note: The other reference in `.planning/phases/02-content-ai-extraction/02-01-PLAN.md` is documentation and can be left as-is (historical record).
  </action>
  <verify>
- `npm run lint` passes
- `npm run typecheck` passes
- Test: `grep -r "replace('_'" src/` returns no results (all converted to regex)
- File exists: `src/lib/storage/pdf-storage.ts`
- File does not exist: `src/lib/storage/blob.ts`
  </verify>
  <done>
- All 4 files use global regex for underscore replacement
- blob.ts renamed to pdf-storage.ts
- Import in upload/route.ts updated
  </done>
</task>

</tasks>

<verification>
After all tasks complete:
```bash
npm run lint
npm run typecheck
npm run build
```
All should pass with no errors.
</verification>

<success_criteria>
- All 19 CodeRabbit issues addressed
- No TypeScript errors
- No ESLint errors
- Build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/003-fix-pr2-coderabbit-review/003-SUMMARY.md`
</output>
