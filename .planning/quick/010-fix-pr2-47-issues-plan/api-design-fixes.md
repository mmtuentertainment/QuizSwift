# API Design Fixes Plan

**PR #2 Review Issues:** 3 issues (all MEDIUM severity)
**Estimated Effort:** 45-60 minutes

---

## Issue 1: Inconsistent Result Type Patterns

### Current State

The codebase already has `ActionResult<T>`, `ok()`, and `err()` helpers in `src/lib/prisma-errors.ts` but they are NOT being used. Instead, actions return ad-hoc shapes:

| File | Function | Current Return | Issue |
|------|----------|----------------|-------|
| `attempts.ts` | `startAttempt` | `{ attemptId }` or `{ error }` | Missing `success` flag on success path |
| `attempts.ts` | `submitAnswer` | `{ success, gradeResult }` or `{ error }` | Error path missing `success: false` |
| `attempts.ts` | `completeAttempt` | `{ success, score, maxScore }` or `{ error }` | Error path missing `success: false` |
| `attempts.ts` | `markQuizPreviewed` | `{ success }` or `{ error }` | Error path missing `success: false` |
| `attempts.ts` | `getAttemptWithAnswers` | `{ attempt, answers }` or `{ error }` | Missing `success` flag entirely |
| `quiz.ts` | `createQuiz` | `{ error }` only (redirects on success) | Acceptable (redirect pattern) |
| `questions.ts` | All functions | Mostly correct with typed results | Good examples to follow |

### Existing Infrastructure (src/lib/prisma-errors.ts)

```typescript
// Already exists but unused in attempts.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function err(error: string): ActionResult<never> {
  return { success: false, error };
}
```

### Solution

**Option A (Recommended): Extend ActionResult with helper types**

Create specific result types for complex returns, using the existing `ActionResult<T>` pattern:

```typescript
// src/lib/action-utils.ts (NEW FILE)
import { z } from 'zod';

// Re-export from prisma-errors for convenience
export { ActionResult, ok, err } from './prisma-errors';

// CUID validation schema (for ID parameters)
export const cuidSchema = z.string().cuid();

// Validate CUID and return ActionResult
export function validateCuid(id: string, label = 'ID'): { valid: true } | { valid: false; error: string } {
  const result = cuidSchema.safeParse(id);
  if (!result.success) {
    return { valid: false, error: `Invalid ${label} format` };
  }
  return { valid: true };
}
```

**Migrate attempts.ts:**

```typescript
// BEFORE
export async function startAttempt(quizId: string) {
  // ...
  return { attemptId: attempt.id };  // Missing success flag
  // ...
  return { error: handlePrismaError(error) };  // Missing success: false
}

// AFTER
import { ok, err, type ActionResult } from '@/lib/action-utils';

export type StartAttemptResult = ActionResult<{ attemptId: string }>;

export async function startAttempt(quizId: string): Promise<StartAttemptResult> {
  // ...
  return ok({ attemptId: attempt.id });
  // ...
  return err(handlePrismaError(error));
}
```

### Files to Modify

1. **Create `src/lib/action-utils.ts`** - Central utilities for server actions
2. **Update `src/actions/attempts.ts`** - All 5 functions need migration
3. **Update `src/actions/quiz.ts`** - `createQuiz` is acceptable (redirect), others already mostly correct
4. **Update callers** - Components using these actions need to handle new shape

### Migration Table for attempts.ts

| Function | Current | New Return Type |
|----------|---------|-----------------|
| `startAttempt` | `{ attemptId }` / `{ error }` | `ActionResult<{ attemptId: string }>` |
| `submitAnswer` | `{ success, gradeResult }` / `{ error }` | `ActionResult<{ gradeResult: GradeResult \| null }>` |
| `completeAttempt` | `{ success, score, maxScore }` / `{ error }` | `ActionResult<{ score: number; maxScore: number }>` |
| `markQuizPreviewed` | `{ success }` / `{ error }` | `ActionResult<void>` |
| `getAttemptWithAnswers` | `{ attempt, answers }` / `{ error }` | `ActionResult<{ attempt: ...; answers: ... }>` |

---

## Issue 2: Missing CUID Validation on ID Parameters

### Current State

Functions accept `string` IDs directly without validating they're valid CUIDs:

```typescript
// attempts.ts - NO validation
export async function startAttempt(quizId: string) { ... }
export async function submitAnswer(attemptId: string, questionId: string, ...) { ... }
export async function completeAttempt(attemptId: string) { ... }
export async function markQuizPreviewed(quizId: string) { ... }
export async function getAttemptWithAnswers(quizId: string) { ... }

// quiz.ts - createQuiz validates via Zod, others don't
const CreateQuizSchema = z.object({
  documentId: z.string().cuid(),  // GOOD
  questionIds: z.array(z.string().cuid()).min(1),  // GOOD
});

export async function getQuizzesForDocument(documentId: string) { ... }  // NO validation
export async function getQuizWithQuestions(quizId: string) { ... }  // NO validation
export async function updateQuizSettings(quizId: string, ...) { ... }  // NO validation
export async function publishQuiz(quizId: string) { ... }  // NO validation
export async function unpublishQuiz(quizId: string) { ... }  // NO validation
export async function archiveQuiz(quizId: string) { ... }  // NO validation

// questions.ts - NO validation on questionId
export async function updateQuestion(questionId: string, ...) { ... }
export async function getQuestionForEdit(questionId: string) { ... }
```

### Solution

Add CUID validation at the start of each function:

```typescript
// Using helper from action-utils.ts
import { validateCuid, ok, err } from '@/lib/action-utils';

export async function startAttempt(quizId: string): Promise<StartAttemptResult> {
  const idCheck = validateCuid(quizId, 'quizId');
  if (!idCheck.valid) return err(idCheck.error);

  // ... rest of function
}
```

**Alternative: Schema-based validation**

For functions with multiple ID params, use a Zod schema:

```typescript
const SubmitAnswerSchema = z.object({
  attemptId: z.string().cuid(),
  questionId: z.string().cuid(),
});

export async function submitAnswer(
  attemptId: string,
  questionId: string,
  answerData: AnswerData
): Promise<SubmitAnswerResult> {
  const parsed = SubmitAnswerSchema.safeParse({ attemptId, questionId });
  if (!parsed.success) {
    return err('Invalid ID format');
  }
  // ... rest of function
}
```

### Files to Modify

1. **`src/lib/action-utils.ts`** - Add `validateCuid` helper (or `cuidSchema`)
2. **`src/actions/attempts.ts`** - All 5 functions
3. **`src/actions/quiz.ts`** - 6 functions (not createQuiz - already validated)
4. **`src/actions/questions.ts`** - 2 functions (updateQuestion, getQuestionForEdit)

### Validation Points Summary

| File | Function | IDs to Validate |
|------|----------|-----------------|
| attempts.ts | startAttempt | `quizId` |
| attempts.ts | submitAnswer | `attemptId`, `questionId` |
| attempts.ts | completeAttempt | `attemptId` |
| attempts.ts | markQuizPreviewed | `quizId` |
| attempts.ts | getAttemptWithAnswers | `quizId` |
| quiz.ts | getQuizzesForDocument | `documentId` |
| quiz.ts | getQuizWithQuestions | `quizId` |
| quiz.ts | updateQuizSettings | `quizId` |
| quiz.ts | publishQuiz | `quizId` |
| quiz.ts | unpublishQuiz | `quizId` |
| quiz.ts | archiveQuiz | `quizId` |
| questions.ts | updateQuestion | `questionId` |
| questions.ts | getQuestionForEdit | `questionId` |

---

## Issue 3: submitAnswer Lacks Zod Validation on answerData

### Current State

```typescript
// src/actions/attempts.ts:77-80
export async function submitAnswer(
  attemptId: string,
  questionId: string,
  answerData: AnswerData  // TypeScript type only, no runtime validation
) {
```

`AnswerData` is a TypeScript union type. At runtime, the function trusts the caller sent valid data. A malicious or buggy client could send:
- Missing `type` field
- Wrong structure for the type
- Extra fields that shouldn't exist

### Existing Schemas (src/lib/questions/validation.ts)

Individual answer schemas already exist but NO discriminated union:

```typescript
export const mcAnswerSchema = z.object({
  selectedChoiceId: z.string().min(1),
});

export const tfAnswerSchema = z.object({
  answer: z.boolean(),
});

export const fillBlankAnswerSchema = z.object({
  blanks: z.array(z.string()),
});

export const matchingAnswerSchema = z.object({
  pairs: z.array(z.object({
    leftId: z.string().min(1),
    rightId: z.string().min(1),
  })),
});

export const essayAnswerSchema = z.object({
  text: z.string(),
  wordCount: z.number().int().min(0),
});

export const showWorkAnswerSchema = z.object({
  finalAnswer: z.string(),
  canvasState: z.record(z.unknown()),
});
```

**Missing:**
- `type` discriminator on each schema
- Combined `answerDataSchema` discriminated union

### Solution

**Step 1: Add discriminated union to validation.ts**

```typescript
// src/lib/questions/validation.ts - ADD these schemas

// Add type discriminator to each schema
export const mcAnswerSchemaWithType = z.object({
  type: z.literal('multiple_choice'),
  selectedChoiceId: z.string().min(1),
});

export const tfAnswerSchemaWithType = z.object({
  type: z.literal('true_false'),
  answer: z.boolean(),
});

export const fillBlankAnswerSchemaWithType = z.object({
  type: z.literal('fill_in_blank'),
  blanks: z.array(z.string()),
});

export const matchingAnswerSchemaWithType = z.object({
  type: z.literal('matching'),
  pairs: z.array(z.object({
    leftId: z.string().min(1),
    rightId: z.string().min(1),
  })),
});

export const essayAnswerSchemaWithType = z.object({
  type: z.union([z.literal('essay'), z.literal('short_answer')]),
  text: z.string(),
  wordCount: z.number().int().min(0),
});

export const showWorkAnswerSchemaWithType = z.object({
  type: z.literal('show_work'),
  finalAnswer: z.string(),
  canvasState: z.unknown(),  // More permissive for tldraw state
});

// Discriminated union for runtime validation
export const answerDataSchema = z.discriminatedUnion('type', [
  mcAnswerSchemaWithType,
  tfAnswerSchemaWithType,
  fillBlankAnswerSchemaWithType,
  matchingAnswerSchemaWithType,
  // Note: essay has union type, so we need workaround
  z.object({
    type: z.literal('essay'),
    text: z.string(),
    wordCount: z.number().int().min(0),
  }),
  z.object({
    type: z.literal('short_answer'),
    text: z.string(),
    wordCount: z.number().int().min(0),
  }),
  showWorkAnswerSchemaWithType,
]);
```

**Step 2: Use in submitAnswer**

```typescript
// src/actions/attempts.ts
import { answerDataSchema } from '@/lib/questions/validation';

export async function submitAnswer(
  attemptId: string,
  questionId: string,
  answerData: unknown  // Change to unknown, validate at runtime
): Promise<SubmitAnswerResult> {
  // ID validation
  const idCheck = SubmitAnswerIdsSchema.safeParse({ attemptId, questionId });
  if (!idCheck.success) return err('Invalid ID format');

  // Answer validation
  const answerCheck = answerDataSchema.safeParse(answerData);
  if (!answerCheck.success) {
    return err('Invalid answer format');
  }
  const validatedAnswer = answerCheck.data;

  // ... rest of function using validatedAnswer
}
```

### Files to Modify

1. **`src/lib/questions/validation.ts`** - Add typed answer schemas + discriminated union
2. **`src/actions/attempts.ts`** - Use `answerDataSchema` in `submitAnswer`

---

## Implementation Order

### Task 1: Create action-utils.ts and Extend validation.ts (15 min)

**Files:**
- Create `src/lib/action-utils.ts`
- Modify `src/lib/questions/validation.ts`

**action-utils.ts:**
```typescript
/**
 * Shared utilities for server actions
 */
import { z } from 'zod';

// Re-export result helpers from prisma-errors
export { ActionResult, ok, err } from './prisma-errors';

// CUID validation
export const cuidSchema = z.string().cuid();

/**
 * Validate a CUID string and return typed result
 */
export function validateCuid(
  id: string,
  label = 'ID'
): { valid: true } | { valid: false; error: string } {
  const result = cuidSchema.safeParse(id);
  if (!result.success) {
    return { valid: false, error: `Invalid ${label} format` };
  }
  return { valid: true };
}

/**
 * Create a multi-CUID validation schema
 */
export function cuidParamsSchema<T extends Record<string, true>>(
  params: T
): z.ZodObject<{ [K in keyof T]: z.ZodString }> {
  const shape = {} as { [K in keyof T]: z.ZodString };
  for (const key of Object.keys(params) as (keyof T)[]) {
    shape[key] = z.string().cuid();
  }
  return z.object(shape);
}
```

**validation.ts additions:**
```typescript
// Add after existing schemas

// =============================================================================
// Answer Data Schemas with Type Discriminators
// =============================================================================

export const mcAnswerSchemaTyped = z.object({
  type: z.literal('multiple_choice'),
  selectedChoiceId: z.string().min(1),
});

export const tfAnswerSchemaTyped = z.object({
  type: z.literal('true_false'),
  answer: z.boolean(),
});

export const fillBlankAnswerSchemaTyped = z.object({
  type: z.literal('fill_in_blank'),
  blanks: z.array(z.string()),
});

export const matchingAnswerSchemaTyped = z.object({
  type: z.literal('matching'),
  pairs: z.array(z.object({
    leftId: z.string().min(1),
    rightId: z.string().min(1),
  })),
});

export const essayAnswerSchemaTyped = z.object({
  type: z.literal('essay'),
  text: z.string(),
  wordCount: z.number().int().min(0),
});

export const shortAnswerSchemaTyped = z.object({
  type: z.literal('short_answer'),
  text: z.string(),
  wordCount: z.number().int().min(0),
});

export const showWorkAnswerSchemaTyped = z.object({
  type: z.literal('show_work'),
  finalAnswer: z.string(),
  canvasState: z.unknown(),
});

/**
 * Discriminated union for validating answer data at runtime.
 * Covers all question types in the AnswerData union.
 */
export const answerDataSchema = z.discriminatedUnion('type', [
  mcAnswerSchemaTyped,
  tfAnswerSchemaTyped,
  fillBlankAnswerSchemaTyped,
  matchingAnswerSchemaTyped,
  essayAnswerSchemaTyped,
  shortAnswerSchemaTyped,
  showWorkAnswerSchemaTyped,
]);

export type AnswerDataSchema = z.infer<typeof answerDataSchema>;
```

**Verify:** `npx tsc --noEmit`

---

### Task 2: Migrate attempts.ts (20 min)

**File:** `src/actions/attempts.ts`

**Changes:**
1. Import new utilities
2. Add result types
3. Add CUID validation to all 5 functions
4. Add answerData validation to submitAnswer
5. Use ok/err helpers consistently

**Detailed changes:**

```typescript
// Top of file - new imports
import { z } from 'zod';
import { ok, err, type ActionResult, cuidSchema } from '@/lib/action-utils';
import { answerDataSchema } from '@/lib/questions/validation';

// Remove: import type { AnswerData, ... } from '@/lib/questions/types';
// (answerData param becomes unknown, validated at runtime)

// Add result types after imports
export type StartAttemptResult = ActionResult<{ attemptId: string }>;
export type SubmitAnswerResult = ActionResult<{ gradeResult: GradeResult | null }>;
export type CompleteAttemptResult = ActionResult<{ score: number; maxScore: number }>;
export type MarkQuizPreviewedResult = ActionResult<void>;
export type GetAttemptWithAnswersResult = ActionResult<{
  attempt: { id: string; status: AttemptStatus; score: number | null; maxScore: number | null } | null;
  answers: Array<{
    questionId: string;
    answerData: unknown;
    isCorrect: boolean | null;
    pointsEarned: number | null;
    feedback: string | null;
  }>;
}>;

// Validation schemas
const SubmitAnswerIdsSchema = z.object({
  attemptId: cuidSchema,
  questionId: cuidSchema,
});
```

**Each function update pattern:**

```typescript
// startAttempt
export async function startAttempt(quizId: string): Promise<StartAttemptResult> {
  const idCheck = cuidSchema.safeParse(quizId);
  if (!idCheck.success) return err('Invalid quiz ID format');

  const session = await auth();
  if (!session?.user?.id) return err('Unauthorized');

  // ... existing logic ...

  return ok({ attemptId: attempt.id });
  // In catch: return err(handlePrismaError(error));
}

// submitAnswer - most complex
export async function submitAnswer(
  attemptId: string,
  questionId: string,
  answerData: unknown  // Changed from AnswerData
): Promise<SubmitAnswerResult> {
  // Validate IDs
  const idsCheck = SubmitAnswerIdsSchema.safeParse({ attemptId, questionId });
  if (!idsCheck.success) return err('Invalid ID format');

  // Validate answerData
  const answerCheck = answerDataSchema.safeParse(answerData);
  if (!answerCheck.success) return err('Invalid answer format');
  const validatedAnswer = answerCheck.data;

  const session = await auth();
  if (!session?.user?.id) return err('Unauthorized');

  // ... rest uses validatedAnswer instead of answerData ...

  return ok({ gradeResult });
  // In catch: return err(handlePrismaError(error));
}
```

**Verify:**
- `npx tsc --noEmit`
- `npm test -- --grep attempts` (if tests exist)

---

### Task 3: Update quiz.ts and questions.ts (15 min)

**Files:**
- `src/actions/quiz.ts`
- `src/actions/questions.ts`

**quiz.ts changes:**

```typescript
import { cuidSchema } from '@/lib/action-utils';

// Add CUID validation to:
// - getQuizzesForDocument(documentId)
// - getQuizWithQuestions(quizId)
// - updateQuizSettings(quizId, ...)
// - publishQuiz(quizId)
// - unpublishQuiz(quizId)
// - archiveQuiz(quizId)

// Example:
export async function getQuizzesForDocument(documentId: string): Promise<GetQuizzesResult> {
  const idCheck = cuidSchema.safeParse(documentId);
  if (!idCheck.success) return { success: false, error: 'Invalid document ID format' };

  // ... rest unchanged
}
```

**questions.ts changes:**

```typescript
import { cuidSchema } from '@/lib/action-utils';

// Add CUID validation to:
// - updateQuestion(questionId, data)
// - getQuestionForEdit(questionId)

export async function updateQuestion(
  questionId: string,
  data: UpdateQuestionInput
): Promise<{ success: boolean; error?: string; details?: ReturnType<z.ZodError['flatten']> }> {
  const idCheck = cuidSchema.safeParse(questionId);
  if (!idCheck.success) return { success: false, error: 'Invalid question ID format' };

  // ... rest unchanged
}
```

**Verify:**
- `npx tsc --noEmit`
- `npm test`

---

### Task 4: Update Callers (10 min)

Components calling these actions need to handle the new result shape.

**Primary caller:** `src/components/quiz/quiz-taker.tsx`

Check how it handles results from:
- `startAttempt`
- `submitAnswer`
- `completeAttempt`
- `getAttemptWithAnswers`

**Current pattern (likely):**
```typescript
const result = await startAttempt(quizId);
if ('error' in result) {
  setError(result.error);
} else {
  setAttemptId(result.attemptId);
}
```

**New pattern:**
```typescript
const result = await startAttempt(quizId);
if (!result.success) {
  setError(result.error);
} else {
  setAttemptId(result.data.attemptId);
}
```

**Files to check:**
- `src/components/quiz/quiz-taker.tsx`
- Any other components importing from `@/actions/attempts`

**Verify:**
- `npm run build` (catches unused/missing props)
- Manual test of quiz flow

---

## Summary

| Issue | Fix | Files | Est. Time |
|-------|-----|-------|-----------|
| Inconsistent result types | Use `ok()`/`err()` helpers with `ActionResult<T>` | action-utils.ts, attempts.ts | 20 min |
| Missing CUID validation | Add `cuidSchema.safeParse()` to all ID params | action-utils.ts, attempts.ts, quiz.ts, questions.ts | 15 min |
| submitAnswer lacks Zod | Add `answerDataSchema` discriminated union | validation.ts, attempts.ts | 15 min |

**Total estimated time:** 45-60 minutes

**Verification commands:**
```bash
npx tsc --noEmit
npm test
npm run build
```
