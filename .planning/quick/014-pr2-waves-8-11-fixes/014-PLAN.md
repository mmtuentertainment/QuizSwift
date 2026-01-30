# Quick Task 014: PR #2 Remaining Fixes (Waves 8-11)

**Source:** `.planning/quick/010-fix-pr2-47-issues-plan/PLAN.md`
**Created:** 2026-01-30
**Scope:** 26 remaining issues across Code Quality, API Design, Documentation, and Test Coverage

---

## Overview

Completes PR #2 fixes with waves 8-11:
- **Wave 8:** Code Quality & Simplification (8 issues)
- **Wave 9:** API Design (3 issues)
- **Wave 10:** Documentation (4 issues)
- **Wave 11:** Test Coverage (2 issues)

**Total:** 17 distinct changes across 4 categories

---

## Wave 8: Code Quality & Simplification

### Task 8.1: Standardize String Method Usage

**File:** `src/components/question-bank/question-list.tsx`
**Issue:** Mixed `.replaceAll('_', ' ')` vs `.replace(/_/g, ' ')` usage

**Action:**
- Line ~73: Change `.replaceAll('_', ' ')` to `.replace(/_/g, ' ')` to match codebase majority

**Verify:** `npm run typecheck`

---

### Task 8.2: Rename BasicQuestionEditor to Disambiguate

**Files:**
- `src/components/question-bank/question-editor.tsx`
- `src/components/question-bank/index.ts`
- `src/components/question-bank/question-list.tsx`

**Issue:** Two components named `QuestionEditor` cause import confusion

**Action:**
1. In `question-editor.tsx`: Rename function to `BasicQuestionEditor`
2. In `index.ts`: Update export to `BasicQuestionEditor`
3. In `question-list.tsx`: Update import/usage

**Verify:** `npm run typecheck && npm run build`

---

### Task 8.3: Add resolveImageUrl Helper Function

**File:** `src/lib/storage/images.ts`

**Issue:** Nested ternary in `question-renderer.tsx` for image URL resolution

**Action:**
Add exported helper function:

```typescript
/**
 * Resolve image URL from storage key or absolute URL.
 * Returns null if imageUrl is a storage key but R2 URL is not configured.
 */
export function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;

  const r2BaseUrl = process.env.NEXT_PUBLIC_R2_URL;
  if (!r2BaseUrl) return null;

  return `${r2BaseUrl}/${imageUrl}`;
}
```

**Verify:** `npm run typecheck`

---

### Task 8.4: Use resolveImageUrl in QuestionRenderer

**File:** `src/components/questions/question-renderer.tsx`

**Issue:** Complex nested ternary at lines 324-330

**Action:**
1. Import `resolveImageUrl` from `@/lib/storage/images`
2. Replace nested ternary with: `const resolvedImageUrl = resolveImageUrl(imageUrl);`

**Verify:** `npm run typecheck`

---

### Task 8.5: Simplify updateData Building in questions.ts

**File:** `src/actions/questions.ts`

**Issue:** Verbose conditional field assignment (lines ~225-255)

**Action:**
Replace verbose if-statements with declarative pattern:

```typescript
const updateFields = [
  'questionText',
  'correctAnswer',
  'explanation',
  'sourceEvidence',
  'options',
  'imageUrl',
  'imageAltText',
] as const;

const updateData = Object.fromEntries(
  updateFields
    .filter((key) => parsed.data[key] !== undefined)
    .map((key) => [key, parsed.data[key]])
);
```

**Verify:** `npm run typecheck && npm run test:run`

---

## Wave 9: API Design

### Task 9.1: Create action-utils.ts with CUID Validation

**File:** `src/lib/action-utils.ts` (NEW)

**Issue:** Missing CUID validation on ID parameters across server actions

**Action:**
Create shared utility file:

```typescript
/**
 * Shared utilities for server actions
 */
import { z } from 'zod';

// Re-export result helpers from prisma-errors
export { type ActionResult, ok, err } from './prisma-errors';

// CUID validation schema
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
```

**Verify:** `npm run typecheck`

---

### Task 9.2: Add CUID Validation to Server Actions

**Files:**
- `src/actions/attempts.ts` (5 functions)
- `src/actions/quiz.ts` (6 functions)
- `src/actions/questions.ts` (2 functions)

**Issue:** Functions accept string IDs without CUID validation

**Action:**
Add CUID validation at start of each function that takes ID parameters:

```typescript
import { cuidSchema } from '@/lib/action-utils';

export async function startAttempt(quizId: string) {
  const idCheck = cuidSchema.safeParse(quizId);
  if (!idCheck.success) return { error: 'Invalid quiz ID format' };
  // ... rest
}
```

Functions to update:
- `attempts.ts`: startAttempt, submitAnswer, completeAttempt, markQuizPreviewed, getAttemptWithAnswers
- `quiz.ts`: getQuizzesForDocument, getQuizWithQuestions, updateQuizSettings, publishQuiz, unpublishQuiz, archiveQuiz
- `questions.ts`: updateQuestion, getQuestionForEdit

**Verify:** `npm run typecheck && npm run test:run`

---

### Task 9.3: Add answerDataSchema for submitAnswer Validation

**File:** `src/lib/questions/validation.ts`

**Issue:** submitAnswer lacks Zod validation on answerData parameter

**Action:**
Add discriminated union schema:

```typescript
// Typed answer schemas for runtime validation
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

Then update `src/actions/attempts.ts` submitAnswer to validate:

```typescript
import { answerDataSchema } from '@/lib/questions/validation';

export async function submitAnswer(
  attemptId: string,
  questionId: string,
  answerData: unknown  // Change from typed to unknown
) {
  // Validate answerData
  const answerCheck = answerDataSchema.safeParse(answerData);
  if (!answerCheck.success) return { error: 'Invalid answer format' };
  const validatedAnswer = answerCheck.data;
  // ... rest uses validatedAnswer
}
```

**Verify:** `npm run typecheck && npm run test:run`

---

## Wave 10: Documentation

### Task 10.1: Clarify CANONICAL vs QUESTION_TYPES

**File:** `src/lib/questions/types.ts`

**Issue:** Confusing terminology between CANONICAL_QUESTION_TYPES and QUESTION_TYPES

**Action:**
Update JSDoc comments:

```typescript
/**
 * Canonical question types - the preferred, normalized forms.
 *
 * Use these for:
 * - New code and features
 * - Type definitions and interfaces
 * - Validation after normalization
 *
 * For accepting user/database input that may contain legacy aliases,
 * use QUESTION_TYPES instead, then normalize with normalizeQuestionType().
 *
 * @see QUESTION_TYPES - includes legacy aliases for backward compatibility
 * @see normalizeQuestionType - converts legacy aliases to canonical forms
 */
export const CANONICAL_QUESTION_TYPES = [...]

/**
 * All valid question type strings, including legacy aliases.
 *
 * Use this when:
 * - Validating raw input from database/API (may contain legacy aliases)
 * - Checking if a string is any valid question type
 *
 * After validation, normalize to canonical form:
 * ```typescript
 * if (isValidQuestionType(rawType)) {
 *   const canonical = normalizeQuestionType(rawType);
 * }
 * ```
 *
 * @see CANONICAL_QUESTION_TYPES - canonical forms only (preferred for new code)
 */
export const QUESTION_TYPES = [...]
```

**Verify:** `npm run typecheck`

---

### Task 10.2: Add JSDoc to Type Guard Functions

**File:** `src/lib/questions/types.ts`

**Issue:** Type guards lack documentation explaining purpose and usage

**Action:**
Add JSDoc with examples to all type guard functions (isMultipleChoiceOptions, isTrueFalseOptions, isFillInBlankOptions, isMatchingOptions, isEssayOptions, isShowWorkOptions, isMCAnswer, isTFAnswer, isFillBlankAnswer, isMatchingAnswer, isEssayAnswer, isShowWorkAnswer):

```typescript
/**
 * Type guard for multiple choice question options.
 * Use to narrow QuestionOptions to MultipleChoiceOptions for type-safe access to choices.
 *
 * @example
 * ```typescript
 * if (isMultipleChoiceOptions(options)) {
 *   options.choices.forEach(c => console.log(c.text)); // Type-safe
 * }
 * ```
 */
export function isMultipleChoiceOptions(options: QuestionOptions): options is MultipleChoiceOptions {
  return options.type === 'multiple_choice';
}
```

(Similar pattern for all 12 type guards)

**Verify:** `npm run typecheck`

---

### Task 10.3: Document Dual Type System (RendererAnswerData vs LibAnswerData)

**Files:**
- `src/components/questions/question-renderer.tsx`
- `src/lib/questions/types.ts`
- `src/components/quiz/quiz-taker.tsx`

**Issue:** Relationship between UI and library answer data types is not documented

**Action:**
1. In `question-renderer.tsx`: Add comprehensive JSDoc explaining dual type system architecture
2. In `types.ts`: Add section header explaining library/storage layer
3. In `quiz-taker.tsx`: Add JSDoc to toLibAnswerData and toRendererAnswerData functions

**Verify:** `npm run typecheck`

---

### Task 10.4: Replace Phase 4 References with Tracked TODOs

**Files:**
- `src/lib/questions/types.ts` (line ~255)
- `src/components/quiz/quiz-taker.tsx` (line ~27)

**Issue:** Stale "Phase 4" references without tracking

**Action:**
1. Replace vague Phase 4 comments with specific TODO items
2. Update `.planning/STATE.md` pending_todos section with tracking entries:
   - Legacy type removal
   - Quiz timer implementation

**Verify:** `grep -r "Phase 4" src/` returns only documented TODOs

---

## Wave 11: Test Coverage

### Task 11.1: Add Empty Array Edge Case Tests to Grading

**File:** `src/lib/questions/__tests__/grading.test.ts`

**Issue:** Missing tests for empty arrays in fill_in_blank and matching types

**Action:**
Add new describe block with edge case tests:

```typescript
describe('gradeAnswer - empty array edge cases', () => {
  describe('fill_in_blank with empty blanks array', () => {
    it('returns 0 points when options.blanks is empty', () => {...});
    it('handles student providing answers when no blanks expected', () => {...});
    it('handles student providing empty blanks when blanks expected', () => {...});
  });

  describe('matching with empty pairs array', () => {
    it('returns 0 points when options.pairs is empty', () => {...});
    it('handles student providing matches when no pairs expected', () => {...});
    it('handles student providing empty pairs when matches expected', () => {...});
  });

  describe('partial answers edge cases', () => {
    it('handles fill_in_blank with fewer answers than blanks', () => {...});
    it('handles matching with fewer pairs than expected', () => {...});
  });
});
```

**Verify:** `npm run test:run -- src/lib/questions/__tests__/grading.test.ts`

---

### Task 11.2: Create Server Action Test Suite

**Files to create:**
- `src/actions/__tests__/setup.ts`
- `src/actions/__tests__/quiz.test.ts`
- `src/actions/__tests__/attempts.test.ts`
- `src/actions/__tests__/questions.test.ts`

**Issue:** No tests for server actions - critical paths untested

**Action:**
1. Create shared mock setup file with auth, prisma, next/cache, next/navigation mocks
2. Create quiz.test.ts with tests for:
   - publishQuiz CONT-06 workflow (critical)
   - createQuiz authorization
   - updateQuizSettings ownership
3. Create attempts.test.ts with tests for:
   - submitAnswer grading integration
   - completeAttempt score calculation
   - markQuizPreviewed CONT-06
4. Create questions.test.ts with tests for:
   - updateQuestion CONT-07 editing
   - getQuestions pagination/filtering

**Verify:** `npm run test:run`

---

## Execution Order

1. **Wave 8 Tasks 8.1-8.5** - Code quality improvements
2. **Wave 9 Tasks 9.1-9.3** - API design validation
3. **Wave 10 Tasks 10.1-10.4** - Documentation
4. **Wave 11 Tasks 11.1-11.2** - Test coverage

---

## Verification Checkpoints

After each wave:
```bash
npm run typecheck && npm run lint && npm run build && npm run test:run
```

Final verification:
```bash
npm run typecheck    # No errors
npm run lint         # No errors
npm run build        # Successful
npm run test:run     # All tests pass
```

---

## Success Criteria

- [ ] All string methods use consistent `.replace(/_/g, ' ')` pattern
- [ ] BasicQuestionEditor renamed to disambiguate from QuestionEditor
- [ ] resolveImageUrl helper extracted and used
- [ ] updateData building simplified with declarative pattern
- [ ] action-utils.ts created with CUID validation
- [ ] All server actions validate ID parameters
- [ ] answerDataSchema added for submitAnswer validation
- [ ] CANONICAL vs QUESTION_TYPES documented clearly
- [ ] All type guards have JSDoc with examples
- [ ] Dual type system documented
- [ ] Phase 4 references replaced with tracked TODOs
- [ ] Grading edge case tests added
- [ ] Server action test suites created
- [ ] All verification checks pass
