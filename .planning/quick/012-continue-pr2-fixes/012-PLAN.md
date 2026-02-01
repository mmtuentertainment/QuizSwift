# Quick Task 012: PR #2 Fixes - Waves 3-5

**Source:** `.planning/quick/010-fix-pr2-47-issues-plan/PLAN.md`
**Prerequisites:** Quick-011 completed Waves 1-2 (security + indexes)
**Scope:** 8 tasks from Waves 3-5 (Performance, Type Safety, Accessibility)

---

## Objective

Fix 8 high-priority issues from PR #2 review covering:
- Wave 3: Performance (N+1 query fixes)
- Wave 4: Type safety (remove `as any`, add Zod validation)
- Wave 5: Accessibility (ARIA labels, progressbar role, label associations)

**Purpose:** Address remaining HIGH priority issues before merge
**Output:** Cleaner, safer, more accessible codebase

---

## Tasks

### Task 1: Fix N+1 Query in submitAnswer()

**Files:** `src/actions/attempts.ts`
**Lines:** 88-100

**Action:**
Replace nested over-fetch with two targeted queries:
1. Query 1: Verify attempt ownership and status (select only needed fields)
2. Query 2: Get specific quiz question with curated question

Current code fetches entire quiz with all questions, then filters to one.

**Current (over-fetching):**
```typescript
const attempt = await prisma.quizAttempt.findUnique({
  where: { id: attemptId },
  include: {
    quiz: {
      include: {
        questions: {
          where: { questionId },
          include: { question: true },
        },
      },
    },
  },
});
```

**Fixed (targeted queries):**
```typescript
// Query 1: Verify attempt ownership and status
const attempt = await prisma.quizAttempt.findUnique({
  where: { id: attemptId },
  select: {
    id: true,
    userId: true,
    status: true,
    quizId: true,
  },
});

if (!attempt || attempt.userId !== session.user.id) {
  return { error: 'Attempt not found' };
}

if (attempt.status !== AttemptStatus.in_progress) {
  return { error: 'Attempt already submitted' };
}

// Query 2: Get the specific quiz question with its curated question
const quizQuestion = await prisma.quizQuestion.findFirst({
  where: {
    quizId: attempt.quizId,
    questionId: questionId,
  },
  include: {
    question: true,
  },
});

if (!quizQuestion) {
  return { error: 'Question not in quiz' };
}
```

**Verify:** `npm run build` passes, answer submission works
**Done:** O(1) queries instead of O(quiz_size)

---

### Task 2: Batch Question Updates in Curate Route

**Files:** `src/app/api/documents/[id]/curate/route.ts`
**Lines:** 109-115

**Action:**
Replace N individual updates with 2 batched updateMany operations.

**Current (N queries):**
```typescript
for (const { questionId, selected } of body.selections) {
  await prisma.curatedQuestion.update({
    where: { id: questionId },
    data: { teacherSelected: selected },
  });
}
```

**Fixed (2 queries):**
```typescript
// Group by selection value
const toSelect = body.selections
  .filter((s) => s.selected)
  .map((s) => s.questionId);
const toDeselect = body.selections
  .filter((s) => !s.selected)
  .map((s) => s.questionId);

// Batch update selected questions
if (toSelect.length > 0) {
  await prisma.curatedQuestion.updateMany({
    where: {
      id: { in: toSelect },
      documentId: id,
    },
    data: { teacherSelected: true },
  });
}

// Batch update deselected questions
if (toDeselect.length > 0) {
  await prisma.curatedQuestion.updateMany({
    where: {
      id: { in: toDeselect },
      documentId: id,
    },
    data: { teacherSelected: false },
  });
}
```

**Verify:** PATCH /api/documents/[id]/curate works, `npm run build` passes
**Done:** 2 queries instead of N queries for batch selection updates

---

### Task 3: Create Zod Schemas for Question Options Validation

**Files:** `src/lib/questions/schemas.ts` (NEW FILE)

**Action:**
Create Zod schemas matching the QuestionOptions TypeScript types for runtime validation of database JSON.

**Content:**
- `MultipleChoiceOptionsSchema`
- `TrueFalseOptionsSchema`
- `FillInBlankOptionsSchema`
- `MatchingOptionsSchema`
- `EssayOptionsSchema`
- `ShowWorkOptionsSchema`
- `QuestionOptionsSchema` (discriminated union)
- `parseQuestionOptions()` helper function

See `type-safety-fixes.md` for full schema definitions.

**Verify:** `npm run typecheck`, schemas import correctly
**Done:** Type-safe validation available for database JSON

---

### Task 4: Add Type Safety to submitAnswer() Grading

**Files:** `src/actions/attempts.ts`
**Lines:** 118-128

**Action:**
1. Import `parseQuestionOptions` from schemas
2. Validate `question.options` before passing to gradeAnswer
3. Skip auto-grading with warning if options invalid (graceful degradation)

**Current (unsafe cast):**
```typescript
gradeResult = gradeAnswer(
  questionType,
  question.options as QuestionOptions | null,
  answerData,
  points
);
```

**Fixed (validated):**
```typescript
const validatedOptions = parseQuestionOptions(question.options);

if (isValidQuestionType(questionType) && isAutoGradable(questionType)) {
  if (!validatedOptions) {
    console.warn(`[submitAnswer] Invalid options for question ${questionId}, skipping auto-grade`);
  } else {
    gradeResult = gradeAnswer(
      questionType,
      validatedOptions,
      answerData,
      points
    );
  }
}
```

**Verify:** `npm run typecheck`, `npm run test:run`
**Done:** Database JSON validated before use in grading

---

### Task 5: Add isValidCanvasState Type Guard + Fix quiz-taker.tsx

**Files:**
- `src/lib/questions/types.ts` (add type guard)
- `src/components/quiz/quiz-taker.tsx` (remove `as any`)

**Action:**
1. Add `isValidCanvasState()` type guard to types.ts:
```typescript
export function isValidCanvasState(value: unknown): value is Record<string, unknown> {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return 'document' in obj && typeof obj.document === 'object' && obj.document !== null;
}
```

2. Update quiz-taker.tsx to use type guard instead of `as any`:
```typescript
case 'show_work': {
  const rawCanvasState = answerData.canvasState;
  const validatedCanvasState = isValidCanvasState(rawCanvasState) ? rawCanvasState : null;
  return {
    type: 'show_work',
    data: {
      finalAnswer: (answerData.finalAnswer as string) || '',
      canvasState: validatedCanvasState,
      canvasImage: null,
    },
  };
}
```

**Verify:** `npm run lint` passes (no eslint-disable needed), `npm run typecheck`
**Done:** Canvas state validated, `as any` removed

---

### Task 6: Add Zod Validation to createQuiz FormData

**Files:** `src/actions/quiz.ts`
**Lines:** 37-45

**Action:**
Replace unsafe JSON.parse assignment with Zod validation.

**Current:**
```typescript
questionIds = rawQuestionIds ? JSON.parse(rawQuestionIds as string) : [];
```

**Fixed:**
```typescript
const rawQuestionIds = formData.get('questionIds');
let parsedIds: unknown;
try {
  parsedIds = rawQuestionIds ? JSON.parse(rawQuestionIds as string) : [];
} catch {
  return { error: 'Invalid question IDs format: malformed JSON' };
}

const questionIdsResult = z.array(z.string()).safeParse(parsedIds);
if (!questionIdsResult.success) {
  console.error('[createQuiz] Invalid questionIds:', questionIdsResult.error.flatten());
  return { error: 'Invalid question IDs format: expected array of strings' };
}
const questionIds = questionIdsResult.data;
```

**Verify:** `npm run typecheck`, quiz creation works
**Done:** FormData JSON validated with Zod

---

### Task 7: Add ARIA Labels to Matching Component

**Files:** `src/components/questions/types/matching.tsx`

**Action:**
1. Add `role="listitem"` and `aria-label` to SortableItem
2. Add `aria-grabbed={isDragging}` state
3. Add `role="list"` and `aria-label` to container
4. Add DndContext announcements for screen readers
5. Add keyboard instructions in sr-only span

See `accessibility-fixes.md` for detailed code changes.

**Verify:** Screen reader announces drag operations, keyboard navigation works
**Done:** Matching component accessible to screen reader users

---

### Task 8: Add Progress Bar ARIA + Form Label Associations

**Files:**
- `src/components/quiz/quiz-taker.tsx` (progress bar)
- `src/components/quiz/quiz-builder.tsx` (form labels)

**Action:**

1. Add progressbar role to quiz progress indicator:
```tsx
<div
  role="progressbar"
  aria-valuenow={currentIndex + 1}
  aria-valuemin={1}
  aria-valuemax={questions.length}
  aria-label={`Quiz progress: Question ${currentIndex + 1} of ${questions.length}`}
  className="h-2 overflow-hidden rounded-full bg-gray-200"
>
```

2. Add loading spinner accessibility:
```tsx
<div role="status" aria-label="Loading quiz" ... />
<p aria-live="polite">Loading quiz...</p>
```

3. Fix form label associations in quiz-builder.tsx:
- Add `id="quiz-title"` + `htmlFor="quiz-title"`
- Add `id="quiz-description"` + `htmlFor="quiz-description"`
- Add `id="quiz-time-limit"` + `htmlFor="quiz-time-limit"`
- Add `aria-label` to question selection checkboxes

**Verify:** Screen reader announces progress, labels are programmatically associated
**Done:** Forms and progress accessible

---

## Verification

After completing all tasks:

```bash
# Type checking
npm run typecheck

# Linting (no eslint-disable comments for as any)
npm run lint

# Build
npm run build

# Tests
npm run test:run
```

---

## Success Criteria

- [ ] submitAnswer() uses 2 targeted queries instead of nested include
- [ ] curate PATCH uses batched updateMany instead of loop
- [ ] QuestionOptions Zod schemas exist and export correctly
- [ ] Database JSON validated before grading
- [ ] Canvas state uses type guard (no `as any`)
- [ ] FormData JSON validated with Zod
- [ ] Matching component has ARIA labels and announcements
- [ ] Progress bar has progressbar role
- [ ] Form inputs have proper label associations
- [ ] All type checks pass
- [ ] All tests pass
- [ ] Build succeeds
