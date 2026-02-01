---
quick: 018
type: execute
description: "Address PR #6 CodeRabbit review items"
files_modified:
  - prisma/schema.prisma
  - src/lib/questions/types.ts
  - src/lib/questions/schemas.ts
  - src/lib/questions/validation.ts
  - src/lib/action-utils.ts
  - src/actions/quiz.ts
  - src/components/quiz/quiz-taker.tsx
  - src/components/quiz/quiz-builder.tsx
  - src/components/questions/types/fill-in-blank.tsx
  - src/app/(dashboard)/documents/[id]/quiz/[quizId]/edit/quiz-settings-form.tsx
autonomous: true
---

<objective>
Address 8 CodeRabbit review items from PR #6:
1. QuestionType as Prisma enum (not String)
2. ActionResult pattern for server actions
3. Request context in error logs
4. Remove unused timeLimit prop
5. Validation constants for magic numbers 1-300
6. Consolidate schemas.ts and validation.ts
7. Remove console.warn in production
8. Document Sentry integration approach (future work)

Purpose: Code quality improvements from PR review
Output: Cleaner types, consistent patterns, better logging
</objective>

<context>
@.planning/STATE.md
@prisma/schema.prisma
@src/lib/questions/types.ts
@src/lib/questions/schemas.ts
@src/lib/questions/validation.ts
@src/actions/quiz.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add QuestionType Prisma enum and ActionResult type</name>
  <files>
    prisma/schema.prisma
    src/lib/action-utils.ts
    src/lib/enums.ts
  </files>
  <action>
1. **Add QuestionType enum to Prisma schema** (after AttemptStatus enum):
```prisma
enum QuestionType {
  multiple_choice
  true_false
  fill_in_blank
  matching
  essay
  short_answer
  show_work
}
```

2. **Update CuratedQuestion and ExtractedQuestion models** to use enum:
- Change `questionType String` to `questionType QuestionType`
- Note: This is a schema change - will need migration

3. **Add ActionResult type to action-utils.ts**:
```typescript
/**
 * Discriminated union for server action results.
 * Use for consistent success/error handling across all server actions.
 *
 * @example
 * ```typescript
 * async function myAction(): Promise<ActionResult<{ id: string }>> {
 *   try {
 *     const result = await doSomething();
 *     return { success: true, data: result };
 *   } catch (error) {
 *     return { success: false, error: 'Operation failed' };
 *   }
 * }
 * ```
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// Convenience type for actions that return no data on success
export type ActionResultVoid =
  | { success: true }
  | { success: false; error: string };
```

4. **Update src/lib/enums.ts** to re-export QuestionType from Prisma and add display labels:
```typescript
import { QuestionType } from '@/generated/prisma/client';
export { QuestionType };

export const QuestionTypeLabel: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True/False',
  fill_in_blank: 'Fill in the Blank',
  matching: 'Matching',
  essay: 'Essay',
  short_answer: 'Short Answer',
  show_work: 'Show Your Work',
};
```

5. **Generate Prisma client** after schema update
  </action>
  <verify>
- `npx prisma validate` passes
- `npx prisma generate` succeeds
- TypeScript compiles: `npx tsc --noEmit`
  </verify>
  <done>
QuestionType is a Prisma enum, ActionResult type exists, enums.ts exports QuestionType with labels
  </done>
</task>

<task type="auto">
  <name>Task 2: Add validation constants and consolidate schemas</name>
  <files>
    src/lib/questions/validation.ts
    src/lib/questions/schemas.ts
    src/actions/quiz.ts
    src/components/quiz/quiz-builder.tsx
    src/app/(dashboard)/documents/[id]/quiz/[quizId]/edit/quiz-settings-form.tsx
  </files>
  <action>
1. **Add validation constants to validation.ts** (at top, after imports):
```typescript
// =============================================================================
// Validation Constants
// =============================================================================

/** Quiz time limit bounds (in minutes) */
export const QUIZ_TIME_LIMIT = {
  MIN: 1,
  MAX: 300,
} as const;

/** Quiz title length bounds */
export const QUIZ_TITLE_LENGTH = {
  MIN: 1,
  MAX: 200,
} as const;

/** Quiz description max length */
export const QUIZ_DESCRIPTION_MAX_LENGTH = 500;
```

2. **Delete schemas.ts** - it duplicates validation.ts:
   - Both have identical Zod schemas for question options and answers
   - validation.ts is more complete (has typed schemas)
   - Update any imports from schemas.ts to use validation.ts instead

3. **Check for schemas.ts imports** and update:
```bash
grep -r "from.*schemas" src/
```
   - If any imports found, update to use validation.ts

4. **Update quiz.ts** to use constants:
```typescript
import { QUIZ_TIME_LIMIT, QUIZ_TITLE_LENGTH, QUIZ_DESCRIPTION_MAX_LENGTH } from '@/lib/questions/validation';

const CreateQuizSchema = z.object({
  documentId: z.string().cuid(),
  title: z.string().min(QUIZ_TITLE_LENGTH.MIN).max(QUIZ_TITLE_LENGTH.MAX),
  description: z.string().max(QUIZ_DESCRIPTION_MAX_LENGTH).optional(),
  questionIds: z.array(z.string().cuid()).min(1),
  timeLimit: z.number().int().min(QUIZ_TIME_LIMIT.MIN).max(QUIZ_TIME_LIMIT.MAX).nullable().optional(),
  shuffleQuestions: z.boolean().optional(),
});

// Same for UpdateQuizSchema
```

5. **Update quiz-builder.tsx** to use constants:
```typescript
import { QUIZ_TIME_LIMIT } from '@/lib/questions/validation';

// In the input element:
<input
  type="number"
  min={QUIZ_TIME_LIMIT.MIN}
  max={QUIZ_TIME_LIMIT.MAX}
  ...
/>
```

6. **Update quiz-settings-form.tsx** to use constants (same pattern as quiz-builder)
  </action>
  <verify>
- `src/lib/questions/schemas.ts` no longer exists
- `npx tsc --noEmit` passes
- grep for "min(1).max(300)" in quiz files shows no hardcoded values
  </verify>
  <done>
Validation constants defined, schemas.ts consolidated into validation.ts, quiz files use constants
  </done>
</task>

<task type="auto">
  <name>Task 3: Cleanup - timeLimit prop, console.warn, error logging context</name>
  <files>
    src/components/quiz/quiz-taker.tsx
    src/components/questions/types/fill-in-blank.tsx
    src/actions/quiz.ts
    src/actions/attempts.ts
  </files>
  <action>
1. **Remove unused timeLimit prop from quiz-taker.tsx**:
   - Remove from QuizTakerProps interface
   - Remove from destructured props (line 158: `timeLimit: _timeLimit`)
   - Add TODO comment for future timer implementation:
```typescript
// TODO(QUIZ-TIMER): Add timeLimit prop when implementing quiz timer
// See: .planning/STATE.md pending_todos
```

2. **Replace console.warn with conditional logging in fill-in-blank.tsx**:
```typescript
// Replace console.warn (line 97-99) with:
if (process.env.NODE_ENV === 'development') {
  console.warn(
    `FillInBlank: Mismatch between [BLANK] markers (${blankCount}) and options.blanks (${options.blanks.length})`
  );
}
```

3. **Add request context to error logs in quiz.ts**:
   - For getQuizWithQuestions error (line 189), add userId context:
```typescript
console.error('[getQuizWithQuestions] Database error:', {
  error,
  quizId: id,
  userId: session?.user?.id
});
```

4. **Add request context to error logs in attempts.ts** (if any console.error exists):
   - Check for console.error calls
   - Add attemptId, questionId, userId context where appropriate

5. **Document Sentry integration as future work** - add comment in quiz.ts near error handling:
```typescript
// TODO(ERROR-TRACKING): Consider Sentry integration for production error tracking
// Pattern: Use @sentry/nextjs with global-error.tsx for App Router
// See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
```
  </action>
  <verify>
- grep for "_timeLimit" in quiz-taker.tsx returns nothing
- grep for "console.warn" in fill-in-blank.tsx shows it's wrapped in NODE_ENV check
- grep for "console.error" in quiz.ts shows context objects
- `npx tsc --noEmit` passes
  </verify>
  <done>
Unused timeLimit prop removed, console.warn production-safe, error logs include context, Sentry TODO documented
  </done>
</task>

</tasks>

<verification>
After all tasks:
1. `npx prisma validate` - schema valid
2. `npx prisma generate` - client generated
3. `npx tsc --noEmit` - TypeScript compiles
4. `npm run lint` - no lint errors
5. Verify no regressions in question bank functionality
</verification>

<success_criteria>
- [ ] QuestionType is a Prisma enum (not String)
- [ ] ActionResult<T> type exists in action-utils.ts
- [ ] Validation constants (QUIZ_TIME_LIMIT, etc.) defined and used
- [ ] schemas.ts deleted, validation.ts is single source
- [ ] timeLimit prop removed from quiz-taker.tsx
- [ ] console.warn wrapped in development check
- [ ] Error logs include request context (userId, etc.)
- [ ] Sentry integration documented as TODO
</success_criteria>

<output>
After completion, create `.planning/quick/018-pr6-coderabbit-fixes/018-SUMMARY.md`
</output>
