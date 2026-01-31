# Code Simplification Fixes - PR #2 Review

**Category:** Code Simplification Issues (5 issues)
**Priority:** MEDIUM
**Estimated Effort:** ~30 minutes

---

## Issue 1: Repeated Auth Check Pattern

**Severity:** MEDIUM
**Files Affected:**
- `src/actions/questions.ts` (4 occurrences)
- `src/actions/quiz.ts` (7 occurrences)
- `src/actions/attempts.ts` (5 occurrences)

### Current Verbose Code

Every server action repeats this pattern:

```typescript
export async function someAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }
  // ... rest of function
}
```

### Simplified Solution

Create a shared utility in `src/lib/auth.ts`:

```typescript
// Add to src/lib/auth.ts

export type AuthResult =
  | { authenticated: true; userId: string }
  | { authenticated: false; error: string };

/**
 * Require authentication in server actions.
 * Returns userId if authenticated, or a standardized error result.
 *
 * Usage:
 *   const authResult = await requireAuth();
 *   if (!authResult.authenticated) return { success: false, error: authResult.error };
 *   const userId = authResult.userId;
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { authenticated: false, error: 'Authentication required' };
  }
  return { authenticated: true, userId: session.user.id };
}
```

### Refactored Usage

```typescript
import { requireAuth } from '@/lib/auth';

export async function getQuestions(filters: QuestionFilters = {}): Promise<QuestionsResult> {
  const authResult = await requireAuth();
  if (!authResult.authenticated) {
    return { success: false, error: authResult.error };
  }
  const userId = authResult.userId;

  // ... rest of function using userId instead of session.user.id
}
```

### Why This Is Better
- Single source of truth for auth error messages
- Consistent return type across all actions
- Easier to add additional checks later (e.g., role verification)
- Reduces boilerplate by ~3 lines per action (16 actions = ~48 lines saved)

---

## Issue 2: Verbose updateData Building in questions.ts

**Severity:** MEDIUM
**Files Affected:**
- `src/actions/questions.ts` (lines 225-255)

### Current Verbose Code

```typescript
// Build update data, only including fields that were provided
const updateData: {
  questionText?: string;
  correctAnswer?: string;
  explanation?: string;
  sourceEvidence?: string;
  options?: object;
  imageUrl?: string | null;
  imageAltText?: string | null;
} = {};

if (parsed.data.questionText !== undefined) {
  updateData.questionText = parsed.data.questionText;
}
if (parsed.data.correctAnswer !== undefined) {
  updateData.correctAnswer = parsed.data.correctAnswer;
}
if (parsed.data.explanation !== undefined) {
  updateData.explanation = parsed.data.explanation;
}
if (parsed.data.sourceEvidence !== undefined) {
  updateData.sourceEvidence = parsed.data.sourceEvidence;
}
if (parsed.data.options !== undefined) {
  updateData.options = parsed.data.options as object;
}
if (parsed.data.imageUrl !== undefined) {
  updateData.imageUrl = parsed.data.imageUrl;
}
if (parsed.data.imageAltText !== undefined) {
  updateData.imageAltText = parsed.data.imageAltText;
}
```

### Simplified Solution

```typescript
// Build update data from defined fields only
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

### Why This Is Better
- Reduces 30 lines to 10 lines
- Declarative list of fields makes it easy to add/remove
- Uses standard JavaScript pattern (Object.fromEntries)
- No change in behavior - still filters undefined values

---

## Issue 3: Nested Ternary for Image URL Resolution

**Severity:** MEDIUM
**Files Affected:**
- `src/components/questions/question-renderer.tsx` (lines 324-330)

### Current Verbose Code

```typescript
// Build image URL - if it's a storage key, prepend the public URL
// Guard: if R2 URL not configured and imageUrl is a storage key, return null
const resolvedImageUrl = imageUrl
  ? imageUrl.startsWith('http')
    ? imageUrl
    : process.env.NEXT_PUBLIC_R2_URL
      ? `${process.env.NEXT_PUBLIC_R2_URL}/${imageUrl}`
      : null
  : null;
```

### Simplified Solution

Extract to a helper function for clarity:

```typescript
/**
 * Resolve image URL from storage key or absolute URL.
 * Returns null if imageUrl is a storage key but R2 URL is not configured.
 */
function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;

  const r2BaseUrl = process.env.NEXT_PUBLIC_R2_URL;
  if (!r2BaseUrl) return null;

  return `${r2BaseUrl}/${imageUrl}`;
}

// Usage
const resolvedImageUrl = resolveImageUrl(imageUrl);
```

### Alternative: Could be a shared utility

If this pattern is used elsewhere, move to `src/lib/storage/images.ts`:

```typescript
// src/lib/storage/images.ts - add this export

export function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;

  const r2BaseUrl = process.env.NEXT_PUBLIC_R2_URL;
  if (!r2BaseUrl) return null;

  return `${r2BaseUrl}/${imageUrl}`;
}
```

### Why This Is Better
- Named function documents intent
- Early returns are clearer than nested ternaries
- Easier to test in isolation
- Self-documenting code

---

## Issue 4: Repeated Error Result Pattern

**Severity:** MEDIUM
**Files Affected:**
- `src/actions/questions.ts`
- `src/actions/quiz.ts`
- `src/actions/attempts.ts`

### Current Verbose Code

Pattern appears repeatedly:

```typescript
// In try-catch blocks
} catch (error) {
  return { success: false, error: handlePrismaError(error) };
}

// For validation errors
if (!parsed.success) {
  return { success: false, error: 'Invalid input', details: parsed.error.flatten() };
}

// For not-found errors
if (!question) {
  return { success: false, error: 'Question not found or access denied' };
}
```

### Simplified Solution

Add helper functions to `src/lib/prisma-errors.ts` or create `src/lib/action-results.ts`:

```typescript
// src/lib/action-results.ts

import { handlePrismaError } from './prisma-errors';
import type { z } from 'zod';

export type ActionResult<T = void> =
  | ({ success: true } & T)
  | { success: false; error: string; details?: Record<string, string[]> };

export function fail(error: string): { success: false; error: string } {
  return { success: false, error };
}

export function failWithDetails(
  error: string,
  details: ReturnType<z.ZodError['flatten']>
): { success: false; error: string; details: ReturnType<z.ZodError['flatten']> } {
  return { success: false, error, details };
}

export function failFromPrisma(error: unknown): { success: false; error: string } {
  return { success: false, error: handlePrismaError(error) };
}

export function ok(): { success: true };
export function ok<T>(data: T): { success: true } & T;
export function ok<T>(data?: T) {
  return { success: true, ...data };
}
```

### Refactored Usage

```typescript
import { fail, failFromPrisma, failWithDetails, ok } from '@/lib/action-results';

export async function updateQuestion(questionId: string, data: UpdateQuestionInput) {
  const authResult = await requireAuth();
  if (!authResult.authenticated) return fail(authResult.error);

  const parsed = UpdateQuestionSchema.safeParse(data);
  if (!parsed.success) return failWithDetails('Invalid input', parsed.error.flatten());

  const question = await prisma.curatedQuestion.findFirst({ ... });
  if (!question) return fail('Question not found or access denied');

  try {
    await prisma.curatedQuestion.update({ ... });
    return ok();
  } catch (error) {
    return failFromPrisma(error);
  }
}
```

### Why This Is Better
- Consistent error shape across all actions
- Less boilerplate
- Centralizes error handling patterns
- Type-safe result handling

---

## Issue 5: Switch Cases Could Use Type Grouping in Question Editor

**Severity:** MEDIUM
**Files Affected:**
- `src/components/questions/question-editor.tsx` (lines 169-274, `renderOptionsEditor`)

### Current Verbose Code

```typescript
const renderOptionsEditor = () => {
  switch (question.questionType) {
    case 'multiple_choice': {
      // ... multiple choice specific logic (30 lines)
    }

    case 'true_false':
    case 'true_false_justify': {
      // ... true/false specific logic (30 lines)
    }

    case 'fill_in_blank':
    case 'fill_blank':
    case 'short_answer':
    case 'essay': {
      // These all use a simple textarea for correctAnswer
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Correct Answer
          </label>
          <textarea ... />
        </div>
      );
    }

    default:
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Correct Answer
          </label>
          <input type="text" ... />
        </div>
      );
  }
};
```

### Simplified Solution

Use type grouping constants and simplify the switch:

```typescript
// At top of file or in a constants file
const TEXT_ANSWER_TYPES = ['fill_in_blank', 'fill_blank', 'short_answer', 'essay'] as const;

const renderOptionsEditor = () => {
  const { questionType } = question;

  // Multiple choice - special handling for choices array
  if (questionType === 'multiple_choice') {
    if (!options || options.type !== 'multiple_choice') return null;
    return <MultipleChoiceEditor options={options} onChange={updateMCOption} />;
  }

  // True/false variants
  if (questionType === 'true_false' || questionType === 'true_false_justify') {
    return <TrueFalseEditor value={correctAnswer} onChange={setCorrectAnswer} />;
  }

  // Text-based answer types (all use textarea)
  if (TEXT_ANSWER_TYPES.includes(questionType as typeof TEXT_ANSWER_TYPES[number])) {
    return (
      <TextAnswerEditor
        label="Correct Answer"
        value={correctAnswer}
        onChange={setCorrectAnswer}
        rows={3}
        placeholder="Enter the correct answer..."
      />
    );
  }

  // Default fallback - simple text input
  return (
    <TextInputEditor
      label="Correct Answer"
      value={correctAnswer}
      onChange={setCorrectAnswer}
    />
  );
};
```

### Alternative: Keep Switch but Simplify

If extracting components feels like overkill, at minimum use includes():

```typescript
const renderOptionsEditor = () => {
  switch (question.questionType) {
    case 'multiple_choice':
      // ... multiple choice logic

    case 'true_false':
    case 'true_false_justify':
      // ... true/false logic

    default: {
      // All other types share the same textarea pattern
      const isTextArea = ['fill_in_blank', 'fill_blank', 'short_answer', 'essay']
        .includes(question.questionType);

      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Correct Answer
          </label>
          {isTextArea ? (
            <textarea
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter the correct answer..."
            />
          ) : (
            <input
              type="text"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}
        </div>
      );
    }
  }
};
```

### Why This Is Better
- Explicit grouping of related types
- Reduces duplicate JSX
- Easier to add new question types
- More maintainable - change in one place affects all similar types

---

## Implementation Order

1. **Issue 4 (Error Results)** - Create utility first, used by other fixes
2. **Issue 1 (Auth Check)** - Extend auth.ts, refactor actions
3. **Issue 2 (updateData)** - Quick refactor in questions.ts
4. **Issue 3 (Image URL)** - Add helper to question-renderer.tsx or lib/storage/images.ts
5. **Issue 5 (Type Grouping)** - Refactor question-editor.tsx

## Files to Create/Modify

| File                                              | Action | Lines Changed (est.) |
| ------------------------------------------------- | ------ | -------------------- |
| `src/lib/action-results.ts`                       | CREATE | ~30 lines            |
| `src/lib/auth.ts`                                 | MODIFY | +15 lines            |
| `src/actions/questions.ts`                        | MODIFY | -25 lines            |
| `src/actions/quiz.ts`                             | MODIFY | -30 lines            |
| `src/actions/attempts.ts`                         | MODIFY | -20 lines            |
| `src/components/questions/question-renderer.tsx`  | MODIFY | -5 lines             |
| `src/components/questions/question-editor.tsx`    | MODIFY | -20 lines            |

**Net change:** ~70 lines removed, ~45 lines added = ~25 lines reduction with improved clarity
