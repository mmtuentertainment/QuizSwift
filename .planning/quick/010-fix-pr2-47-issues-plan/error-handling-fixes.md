# Error Handling Fixes - PR #2 Review Issues

**Category:** Error Handling
**Issues:** 6
**Priority:** CRITICAL (2), HIGH (4)

---

## Issue 1: CRITICAL - Silenced database errors in quiz.ts

**File:** `src/actions/quiz.ts`
**Lines:** 172-175

### Current Problematic Code

```typescript
} catch {
  // Database error - treat as not found to avoid leaking error details
  return { success: false, error: 'not_found' };
}
```

### Problem

ALL database errors are silenced and returned as `'not_found'`. This:
- Masks actual database connectivity issues
- Makes debugging impossible
- Returns incorrect error type (user thinks quiz doesn't exist when DB is down)
- Violates Next.js best practice: "Return early with meaningful error messages"

### Fixed Code

```typescript
} catch (error) {
  // Log full error for debugging, return appropriate error type
  console.error('[getQuizWithQuestions] Database error:', error);

  // Return 'database_error' to distinguish from genuine not_found
  return { success: false, error: 'database_error' };
}
```

Also update the type definition at line 150-152:

```typescript
export type GetQuizWithQuestionsResult =
  | { success: true; quiz: QuizWithQuestions }
  | { success: false; error: 'unauthenticated' | 'not_found' | 'access_denied' | 'database_error' };
```

### Verification Steps

1. Temporarily break DB connection (invalid DATABASE_URL)
2. Call `getQuizWithQuestions('valid-id')`
3. Confirm response is `{ success: false, error: 'database_error' }` not `'not_found'`
4. Check console shows logged error details
5. Restore DATABASE_URL

---

## Issue 2: CRITICAL - Empty catch block in image upload route

**File:** `src/app/api/upload/image/route.ts`
**Lines:** 35-36

### Current Problematic Code

```typescript
try {
  body = await request.json();
} catch {
  return NextResponse.json(
    { error: 'Invalid JSON in request body' },
    { status: 400 }
  );
}
```

### Problem

This was ALREADY FIXED in a previous commit. The current code is correct:
- Returns 400 with descriptive message `'Invalid JSON in request body'`
- Does NOT have an empty catch block

**STATUS: NO FIX NEEDED** - Code is already correct.

### Verification Steps

1. `curl -X POST http://localhost:3000/api/upload/image -H "Content-Type: application/json" -d "not-json"`
2. Confirm response: `{ "error": "Invalid JSON in request body" }` with status 400

---

## Issue 3: HIGH - Silent fallback to empty arrays on question bank page

**File:** `src/app/(dashboard)/question-bank/page.tsx`
**Lines:** 46-51

### Current Problematic Code

```typescript
// Extract data with fallbacks for error cases
const documents = documentsResult.success ? documentsResult.documents : [];
const questions = questionsResult.success ? questionsResult.questions : [];
const total = questionsResult.success ? questionsResult.total : 0;
const page = questionsResult.success ? questionsResult.page : 1;
const totalPages = questionsResult.success ? questionsResult.totalPages : 1;
```

### Problem

Errors are silently swallowed. User sees empty state with no indication that data failed to load. They might think they have no questions when actually the database query failed.

### Fixed Code

```typescript
// Check for errors and display them to user
const hasDocumentsError = !documentsResult.success;
const hasQuestionsError = !questionsResult.success;

// Extract data with fallbacks for error cases
const documents = documentsResult.success ? documentsResult.documents : [];
const questions = questionsResult.success ? questionsResult.questions : [];
const total = questionsResult.success ? questionsResult.total : 0;
const page = questionsResult.success ? questionsResult.page : 1;
const totalPages = questionsResult.success ? questionsResult.totalPages : 1;

// Get error messages for display
const documentsError = !documentsResult.success ? documentsResult.error : null;
const questionsError = !questionsResult.success ? questionsResult.error : null;
```

Then add error banner in JSX after the header section (before stats):

```tsx
{/* Error banners */}
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

### Verification Steps

1. Temporarily modify `getQuestions` to always return error
2. Load `/question-bank`
3. Confirm red error banner appears with specific error message
4. Revert `getQuestions`

---

## Issue 4: HIGH - Failed answer saves not persistently tracked

**File:** `src/components/quiz/quiz-taker.tsx`
**Lines:** 238-242 (in handleAnswer callback)

### Current Problematic Code

```typescript
} catch (err) {
  console.error('Failed to save answer:', err);
  setSaveError('Failed to save your answer. Please check your connection and try again.');
  // Don't update savedAnswers - optimistic will revert
}
```

### Problem

When answer save fails:
1. Error shown temporarily (dismissable)
2. User can dismiss and continue
3. No persistent record of which answers failed to save
4. On submit, user might lose work without knowing

### Fixed Code

Add state to track failed saves persistently:

```typescript
// Add new state after line 149:
const [failedSaveQuestionIds, setFailedSaveQuestionIds] = useState<Set<string>>(new Set());
```

Update the catch block:

```typescript
} catch (err) {
  console.error('Failed to save answer:', err);
  setSaveError('Failed to save your answer. Please check your connection and try again.');
  // Track which question failed to save
  setFailedSaveQuestionIds(prev => new Set(prev).add(currentQuestion.id));
  // Don't update savedAnswers - optimistic will revert
}
```

Clear on successful save (in the success branch around line 234-236):

```typescript
} else {
  // Success: update saved answers so optimistic becomes permanent
  setSavedAnswers((prev) => new Map(prev).set(currentQuestion.id, answerData));
  // Clear from failed set if it was there
  setFailedSaveQuestionIds(prev => {
    const next = new Set(prev);
    next.delete(currentQuestion.id);
    return next;
  });
}
```

Add warning before submit (modify the unanswered warning section around line 483):

```tsx
{/* Failed saves warning on last question */}
{currentIndex === questions.length - 1 && failedSaveQuestionIds.size > 0 && (
  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
    <p className="text-sm text-red-800">
      <strong>Warning:</strong> {failedSaveQuestionIds.size} answer
      {failedSaveQuestionIds.size > 1 ? 's' : ''} failed to save.
      Please check your connection before submitting.
      Affected questions:{' '}
      {Array.from(failedSaveQuestionIds).map((id, idx) => {
        const qIndex = questions.findIndex(q => q.id === id);
        return qIndex >= 0 ? (idx > 0 ? ', ' : '') + (qIndex + 1) : '';
      }).join('')}
    </p>
  </div>
)}
```

Add visual indicator on question dots (modify around line 425-432):

```tsx
<button
  key={q.id}
  onClick={() => handleJumpToQuestion(idx)}
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
  title={`Question ${idx + 1}${
    failedSaveQuestionIds.has(q.id)
      ? ' (save failed)'
      : optimisticAnswers.has(q.id)
        ? ' (answered)'
        : ''
  }`}
/>
```

### Verification Steps

1. Mock `submitAnswer` to fail for specific question
2. Answer that question
3. Confirm question dot turns red
4. Navigate away and back - dot should still be red
5. Navigate to last question - warning banner shows affected questions
6. Fix mock, re-answer question, confirm dot turns green

---

## Issue 5: HIGH - Generic "Database operation failed" without context

**File:** `src/lib/prisma-errors.ts`
**Lines:** 14-24

### Current Problematic Code

```typescript
export function handlePrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('[Prisma Error]:', error);
    if (error.code === 'P2002') return 'A record with this information already exists.';
    if (error.code === 'P2003') return 'Cannot complete operation due to related records.';
    if (error.code === 'P2025') return 'Record not found.';
  } else {
    console.error('[Prisma Error]:', error);
  }
  return 'Database operation failed. Please try again.';
}
```

### Problem

- Generic fallback message gives no context about what failed
- Cannot correlate console log with user-facing error
- Missing common error codes (P2000, P2001, P2014, P2028)

### Fixed Code

```typescript
/**
 * Handle Prisma errors and return user-friendly messages.
 * Logs the full error for debugging while returning safe messages to users.
 *
 * @param error - The caught error
 * @param context - Optional context string for logging (e.g., 'createQuiz', 'updateQuestion')
 */
export function handlePrismaError(error: unknown, context?: string): string {
  const logPrefix = context ? `[Prisma Error - ${context}]` : '[Prisma Error]';

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`${logPrefix}:`, {
      code: error.code,
      meta: error.meta,
      message: error.message,
    });

    switch (error.code) {
      case 'P2000':
        return 'The provided value is too long for this field.';
      case 'P2001':
        return 'The requested record does not exist.';
      case 'P2002':
        return 'A record with this information already exists.';
      case 'P2003':
        return 'Cannot complete operation due to related records.';
      case 'P2014':
        return 'The change would violate a required relation.';
      case 'P2025':
        return 'Record not found.';
      case 'P2028':
        return 'Database transaction failed. Please try again.';
      default:
        // Log unhandled codes for future handling
        console.warn(`${logPrefix}: Unhandled Prisma error code ${error.code}`);
        return `Database error (${error.code}). Please try again.`;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error(`${logPrefix} Validation:`, error.message);
    return 'Invalid data format. Please check your input.';
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error(`${logPrefix} Initialization:`, error.message);
    return 'Database connection failed. Please try again later.';
  }

  // Unknown error type
  console.error(`${logPrefix} Unknown:`, error);
  return 'Database operation failed. Please try again.';
}
```

Update all call sites to include context (optional but recommended):

```typescript
// In src/actions/quiz.ts:
return { error: handlePrismaError(error, 'createQuiz') };
return { success: false, error: handlePrismaError(error, 'getQuizzesForDocument') };
return { success: false, error: handlePrismaError(error, 'updateQuizSettings') };
// etc.

// In src/actions/questions.ts:
return { success: false, error: handlePrismaError(error, 'getQuestions') };
return { success: false, error: handlePrismaError(error, 'getTeacherDocuments') };
return { success: false, error: handlePrismaError(error, 'updateQuestion') };
// etc.
```

### Verification Steps

1. Check console output format includes context, code, and meta
2. Trigger P2002 (duplicate): confirm user sees "already exists"
3. Trigger P2025 (not found): confirm user sees "not found"
4. Trigger unknown code: confirm user sees code in message
5. Trigger connection error: confirm user sees "connection failed"

---

## Issue 6: HIGH - Question update errors missing Zod validation details

**File:** `src/actions/questions.ts`
**Lines:** 196-200

### Current Problematic Code

```typescript
// Validate input with Zod
const parsed = UpdateQuestionSchema.safeParse(data);
if (!parsed.success) {
  return { success: false, error: 'Invalid input', details: parsed.error.flatten() };
}
```

### Problem

While `details` is included, the pattern doesn't follow Next.js best practice:
- `error: 'Invalid input'` is too generic
- Best practice is `{ errors: validatedFields.error.flatten().fieldErrors }`
- Field-specific errors should be in standardized `fieldErrors` format

### Fixed Code

Update the return type at line 190:

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

Update the validation error return:

```typescript
// Validate input with Zod
const parsed = UpdateQuestionSchema.safeParse(data);
if (!parsed.success) {
  const fieldErrors = parsed.error.flatten().fieldErrors;
  // Build a summary error message from first field error
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

This provides:
1. `error` - Human-readable summary for toast/alert
2. `fieldErrors` - Per-field errors for inline form validation

Consumer can then do:

```typescript
const result = await updateQuestion(id, data);
if (!result.success) {
  if (result.fieldErrors?.questionText) {
    setQuestionTextError(result.fieldErrors.questionText[0]);
  }
  toast.error(result.error); // Shows summary
}
```

### Verification Steps

1. Call `updateQuestion` with empty `questionText`
2. Confirm response has:
   - `error: "questionText: Question text cannot be empty"`
   - `fieldErrors: { questionText: ["Question text cannot be empty"] }`
3. Call with text > 5000 chars
4. Confirm appropriate field error about max length

---

## Summary of Changes

| File | Line(s) | Change |
|------|---------|--------|
| `src/actions/quiz.ts` | 150-152, 172-175 | Add 'database_error' type, log errors properly |
| `src/app/api/upload/image/route.ts` | N/A | Already fixed - no changes needed |
| `src/app/(dashboard)/question-bank/page.tsx` | 46-52, 53+ | Add error tracking and display error banners |
| `src/components/quiz/quiz-taker.tsx` | 149, 238-242, 425-432, 483+ | Track failed saves persistently, show visual indicators |
| `src/lib/prisma-errors.ts` | 14-24 | Add context param, more error codes, better logging |
| `src/actions/questions.ts` | 190, 196-200 | Return fieldErrors in Next.js best practice format |

## Testing Checklist

- [ ] Quiz.ts: Database error returns 'database_error' not 'not_found'
- [ ] Question bank: Error banner shows when data fails to load
- [ ] Quiz taker: Failed saves show red dots and warning before submit
- [ ] Prisma errors: Context appears in console logs
- [ ] Prisma errors: Unhandled codes show code number to user
- [ ] Question update: Field errors returned in fieldErrors format
