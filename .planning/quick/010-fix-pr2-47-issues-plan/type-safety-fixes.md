# Type Safety Fixes - PR #2 Review Issues

## Overview

This plan addresses 3 HIGH severity type safety issues identified in PR #2 review. All fixes follow the principle of validating untrusted data at the boundary (JSON.parse, database reads) using Zod schemas and type guards.

---

## Issue 1: `as any` cast for canvas state

**File:** `src/components/quiz/quiz-taker.tsx`
**Line:** 114
**Severity:** HIGH

### Current Problematic Code

```typescript
// Lines 107-118 in toRendererAnswerData()
case 'show_work':
  return {
    type: 'show_work',
    data: {
      finalAnswer: (answerData.finalAnswer as string) || '',
      // Restore canvas state - cast through any since JSON loses type info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvasState: answerData.canvasState as any ?? null,
      // canvasImage cannot be restored from JSON (Blob)
      canvasImage: null,
    },
  };
```

### Problem

The `as any` cast bypasses TypeScript's type checking. The canvas state comes from the database (JSON field) and could be malformed or missing required properties.

### Solution

Create a type guard that validates the canvas state structure. Since `TLEditorSnapshot` from tldraw has a complex structure, we validate the minimum required fields to ensure it's loadable.

### Fixed Code

**Step 1: Add validation helper in `src/lib/questions/types.ts`**

Add after line 216 (after `isShowWorkAnswer`):

```typescript
// =============================================================================
// Canvas State Validation (for tldraw TLEditorSnapshot)
// =============================================================================

/**
 * Minimal validation for tldraw canvas state.
 * TLEditorSnapshot requires: { document, session } at minimum.
 * We only validate structure exists - tldraw will handle malformed data gracefully.
 */
export function isValidCanvasState(value: unknown): value is Record<string, unknown> {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  // TLEditorSnapshot has 'document' and 'session' properties
  // We check for 'document' as the minimum required field
  return 'document' in obj && typeof obj.document === 'object' && obj.document !== null;
}
```

**Step 2: Update `src/components/quiz/quiz-taker.tsx` line 107-118**

```typescript
// Add import at top (line ~20, after existing type imports)
import { isValidCanvasState } from '@/lib/questions/types';

// Replace lines 107-118 with:
case 'show_work': {
  // Validate canvas state from database JSON before using
  const rawCanvasState = answerData.canvasState;
  const validatedCanvasState = isValidCanvasState(rawCanvasState) ? rawCanvasState : null;

  return {
    type: 'show_work',
    data: {
      finalAnswer: (answerData.finalAnswer as string) || '',
      canvasState: validatedCanvasState,
      // canvasImage cannot be restored from JSON (Blob)
      canvasImage: null,
    },
  };
}
```

### Verification

1. TypeScript compiles without `as any` or eslint-disable comments
2. `npm run lint` passes
3. Loading a quiz with saved show_work answer still works
4. Loading a quiz with corrupted/missing canvas state doesn't crash (shows empty canvas)

---

## Issue 2: Unsafe JSON.parse cast from FormData

**File:** `src/actions/quiz.ts`
**Line:** 41
**Severity:** HIGH

### Current Problematic Code

```typescript
// Lines 37-45
// Parse questionIds with error handling
let questionIds: string[] = [];
try {
  const rawQuestionIds = formData.get('questionIds');
  questionIds = rawQuestionIds ? JSON.parse(rawQuestionIds as string) : [];
} catch (error) {
  console.error('[createQuiz] Failed to parse questionIds:', error);
  return { error: 'Invalid question IDs format' };
}
```

### Problem

While there's a try-catch for JSON.parse errors, the parsed result is directly assigned to `questionIds: string[]` without validating that the parsed JSON is actually an array of strings. Malicious or malformed input could pass parsing but fail type expectations.

### Solution

Use Zod to validate the parsed JSON structure before using it.

### Fixed Code

**Replace lines 37-45 with:**

```typescript
// Parse and validate questionIds from FormData
let questionIds: string[] = [];
const rawQuestionIds = formData.get('questionIds');
if (rawQuestionIds) {
  const parseResult = z.array(z.string()).safeParse(
    (() => {
      try {
        return JSON.parse(rawQuestionIds as string);
      } catch {
        return null;
      }
    })()
  );

  if (!parseResult.success) {
    console.error('[createQuiz] Invalid questionIds format:', parseResult.error);
    return { error: 'Invalid question IDs format' };
  }
  questionIds = parseResult.data;
}
```

**Alternative cleaner version (recommended):**

```typescript
// Parse and validate questionIds from FormData
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

### Verification

1. `npm run lint` passes
2. Creating a quiz with valid question IDs works
3. Creating a quiz with `questionIds: "not an array"` returns error
4. Creating a quiz with `questionIds: [123, 456]` (numbers not strings) returns error
5. Creating a quiz with `questionIds: ["valid", null]` returns error

---

## Issue 3: Missing Zod validation on database JSON before grading

**File:** `src/actions/attempts.ts`
**Location:** `submitAnswer` function (lines 77-160)
**Severity:** HIGH

### Current Problematic Code

```typescript
// Lines 121-128
// Grade if auto-gradable (validate questionType from database first)
let gradeResult = null;
const questionType = question.questionType;
if (isValidQuestionType(questionType) && isAutoGradable(questionType)) {
  gradeResult = gradeAnswer(
    questionType,
    question.options as QuestionOptions | null,  // <-- UNSAFE CAST
    answerData,
    points
  );
}
```

### Problem

The `question.options` field is a Prisma `Json` type, which TypeScript types as `unknown`. The code casts it directly to `QuestionOptions | null` without validating the structure. Malformed database data could cause runtime errors in grading functions.

### Solution

Create Zod schemas for `QuestionOptions` variants and validate before grading.

### Fixed Code

**Step 1: Create Zod schemas in `src/lib/questions/schemas.ts` (new file)**

```typescript
/**
 * Zod schemas for question options validation
 *
 * Used to validate JSON data from database before type narrowing.
 * These schemas mirror the TypeScript interfaces in types.ts.
 */

import { z } from 'zod';

// Multiple Choice Options Schema
export const MultipleChoiceOptionsSchema = z.object({
  type: z.literal('multiple_choice'),
  choices: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean(),
  })),
});

// True/False Options Schema
export const TrueFalseOptionsSchema = z.object({
  type: z.literal('true_false'),
  correctAnswer: z.boolean(),
  justification: z.string().optional(),
});

// Fill in Blank Options Schema
export const FillInBlankOptionsSchema = z.object({
  type: z.literal('fill_in_blank'),
  blanks: z.array(z.object({
    index: z.number(),
    acceptedAnswers: z.array(z.string()),
    caseSensitive: z.boolean(),
  })),
});

// Matching Options Schema
export const MatchingOptionsSchema = z.object({
  type: z.literal('matching'),
  pairs: z.array(z.object({
    id: z.string(),
    left: z.string(),
    right: z.string(),
  })),
});

// Essay Options Schema
export const EssayOptionsSchema = z.object({
  type: z.literal('essay'),
  minWords: z.number().optional(),
  maxWords: z.number().optional(),
  rubric: z.string().optional(),
  guidelines: z.string().optional(),
});

// Show Work Options Schema
export const ShowWorkOptionsSchema = z.object({
  type: z.literal('show_work'),
  workingSteps: z.array(z.string()),
});

// Union schema for all question options
export const QuestionOptionsSchema = z.discriminatedUnion('type', [
  MultipleChoiceOptionsSchema,
  TrueFalseOptionsSchema,
  FillInBlankOptionsSchema,
  MatchingOptionsSchema,
  EssayOptionsSchema,
  ShowWorkOptionsSchema,
]);

/**
 * Safely parse question options from database JSON.
 * Returns null if validation fails (graceful degradation).
 */
export function parseQuestionOptions(data: unknown) {
  const result = QuestionOptionsSchema.safeParse(data);
  return result.success ? result.data : null;
}

// =============================================================================
// Answer Data Schemas (for validating student responses)
// =============================================================================

export const MCAnswerSchema = z.object({
  type: z.literal('multiple_choice'),
  selectedChoiceId: z.string(),
});

export const TFAnswerSchema = z.object({
  type: z.literal('true_false'),
  answer: z.boolean(),
});

export const FillBlankAnswerSchema = z.object({
  type: z.literal('fill_in_blank'),
  blanks: z.array(z.string()),
});

export const MatchingAnswerSchema = z.object({
  type: z.literal('matching'),
  pairs: z.array(z.object({
    leftId: z.string(),
    rightId: z.string(),
  })),
});

export const EssayAnswerSchema = z.object({
  type: z.union([z.literal('essay'), z.literal('short_answer')]),
  text: z.string(),
  wordCount: z.number(),
});

export const ShowWorkAnswerSchema = z.object({
  type: z.literal('show_work'),
  finalAnswer: z.string(),
  canvasState: z.unknown(),
});

export const AnswerDataSchema = z.discriminatedUnion('type', [
  MCAnswerSchema,
  TFAnswerSchema,
  FillBlankAnswerSchema,
  MatchingAnswerSchema,
  EssayAnswerSchema,
  ShowWorkAnswerSchema,
]);

/**
 * Safely parse answer data from database JSON.
 * Returns null if validation fails.
 */
export function parseAnswerData(data: unknown) {
  const result = AnswerDataSchema.safeParse(data);
  return result.success ? result.data : null;
}
```

**Step 2: Update `src/actions/attempts.ts`**

Add import at top:
```typescript
import { parseQuestionOptions } from '@/lib/questions/schemas';
```

Replace lines 118-128 with:
```typescript
// Grade if auto-gradable
let gradeResult = null;
const questionType = question.questionType;

// Validate question options from database JSON before grading
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

### Verification

1. `npm run lint` passes
2. TypeScript compiles without errors
3. Submitting answers for valid questions grades correctly
4. A question with malformed options in database doesn't crash (graceful null handling)
5. Unit test: mock question with `options: { invalid: true }` - should skip grading, not throw

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/lib/questions/types.ts` | Add `isValidCanvasState()` type guard |
| `src/lib/questions/schemas.ts` | NEW FILE - Zod schemas for validation |
| `src/components/quiz/quiz-taker.tsx` | Replace `as any` with validated canvas state |
| `src/actions/quiz.ts` | Validate JSON.parse result with Zod |
| `src/actions/attempts.ts` | Validate database options before grading |

## Testing Checklist

- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes (no eslint-disable needed)
- [ ] `npm test` passes
- [ ] Manual: Create quiz, take quiz, submit answers - all work
- [ ] Manual: show_work questions save/restore canvas correctly
- [ ] Edge case: Corrupted canvas state in DB doesn't crash UI
- [ ] Edge case: Malformed question options doesn't crash grading

## Estimated Effort

~30 minutes Claude execution time:
- 10 min: Create schemas.ts with all Zod schemas
- 10 min: Update attempts.ts with validation
- 5 min: Update quiz.ts JSON.parse validation
- 5 min: Update quiz-taker.tsx canvas state validation
