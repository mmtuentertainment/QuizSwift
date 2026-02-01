---
id: quick-020
type: execute
scope: fix
files_modified:
  - src/lib/ai/embed.ts
  - src/actions/attempts.ts
  - src/lib/questions/__tests__/types.test.ts
  - src/lib/ai/schemas/question-generation.ts
  - src/lib/prisma-errors.ts
autonomous: true
---

<objective>
Fix all PR #6 review findings from 5-agent review

Purpose: Address code quality issues, misleading comments, missing tests, and type duplication identified in PR #6 review
Output: Clean code with improved error tracking, accurate comments, test coverage, and DRY type definitions
</objective>

<context>
@.planning/STATE.md
@src/lib/ai/embed.ts
@src/actions/attempts.ts
@src/lib/questions/types.ts
@src/lib/ai/schemas/question-generation.ts
@src/lib/action-utils.ts
@src/lib/prisma-errors.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix silent failure and logging issues</name>
  <files>
    - src/lib/ai/embed.ts
    - src/actions/attempts.ts
  </files>
  <action>
    1. In `src/lib/ai/embed.ts` (lines 55-58):
       - Currently pushes empty embedding array `[]` on failure with only console.error
       - Add failure tracking: return a result object that indicates which texts failed
       - Change function signature to return `{ embeddings: number[][], failedIndexes: number[] }`
       - Track which batch items failed in the catch block
       - Log with more context: include batch index range and text preview (first 50 chars)

    2. In `src/actions/attempts.ts` (lines 149-150):
       - Add more logging context when option validation fails
       - Include questionId, questionType, and a preview of the options structure
       - Format: `[submitAnswer] Invalid options for question ${questionId} (type: ${questionType}): ${JSON.stringify(question.options).slice(0, 100)}`
  </action>
  <verify>
    - TypeScript compiles: `npx tsc --noEmit`
    - Grep for enhanced logging: `grep -n "failedIndexes\|type:" src/lib/ai/embed.ts src/actions/attempts.ts`
  </verify>
  <done>
    - embedBatch returns structured result with failure tracking
    - submitAnswer logs questionType in warning message
  </done>
</task>

<task type="auto">
  <name>Task 2: Add type function tests</name>
  <files>
    - src/lib/questions/__tests__/types.test.ts (new file)
  </files>
  <action>
    Create `src/lib/questions/__tests__/types.test.ts` with tests for:

    1. `normalizeQuestionType()`:
       - Returns 'fill_in_blank' for 'fill_blank' input
       - Returns 'true_false' for 'true_false_justify' input
       - Returns input unchanged for canonical types (multiple_choice, essay, etc.)
       - Returns input unchanged for unrecognized types

    2. `isValidQuestionType()`:
       - Returns true for all QUESTION_TYPES values
       - Returns false for invalid strings ('invalid', '', 'MULTIPLE_CHOICE')

    3. `isValidCanonicalQuestionType()`:
       - Returns true for all CANONICAL_QUESTION_TYPES values
       - Returns false for legacy aliases ('fill_blank', 'true_false_justify')
       - Returns false for invalid strings

    Follow existing test patterns in __tests__/validation.test.ts (vitest, describe/it/expect)
  </action>
  <verify>
    - Run tests: `npm test -- src/lib/questions/__tests__/types.test.ts`
    - All tests pass
  </verify>
  <done>
    - types.test.ts exists with 10+ test cases covering all three functions
    - All tests pass
  </done>
</task>

<task type="auto">
  <name>Task 3: Fix misleading comment and add cross-reference</name>
  <files>
    - src/actions/attempts.ts
    - src/lib/ai/schemas/question-generation.ts
  </files>
  <action>
    1. In `src/actions/attempts.ts` (lines 288-291):
       - CRITICAL: Comment says "quiz can now be published" but code sets `preview_required`
       - Fix comment to accurately describe the workflow:
         ```typescript
         // Mark as preview_required if still in draft (teacher must complete preview to unlock publish)
         status: quiz.status === QuizStatus.draft ? QuizStatus.preview_required : quiz.status,
         ```
       - The status transition is: draft -> preview_required (after teacherPreviewedAt is set)
       - Only AFTER preview_required can teacher publish

    2. In `src/lib/ai/schemas/question-generation.ts`:
       - Add JSDoc comment to QuestionType z.enum explaining the 7 canonical types
       - Cross-reference QUESTION_TYPES (9 types including legacy aliases) in types.ts
       - Format:
         ```typescript
         /**
          * Canonical question types for AI generation (7 types).
          *
          * Note: This differs from QUESTION_TYPES in src/lib/questions/types.ts which
          * includes 9 types (7 canonical + 2 legacy aliases: fill_blank, true_false_justify).
          * AI should only generate canonical types; legacy aliases exist for backward compatibility.
          *
          * @see src/lib/questions/types.ts - QUESTION_TYPES and CANONICAL_QUESTION_TYPES
          */
         ```
  </action>
  <verify>
    - Grep for corrected comment: `grep -A2 "preview_required" src/actions/attempts.ts`
    - Grep for cross-reference: `grep -A5 "Canonical question types" src/lib/ai/schemas/question-generation.ts`
  </verify>
  <done>
    - attempts.ts comment accurately describes draft -> preview_required transition
    - question-generation.ts has JSDoc explaining 7 vs 9 types with cross-reference
  </done>
</task>

<task type="auto">
  <name>Task 4: Remove duplicate ActionResult type</name>
  <files>
    - src/lib/prisma-errors.ts
  </files>
  <action>
    1. In `src/lib/prisma-errors.ts`:
       - Remove the duplicate `ActionResult<T>` type definition (lines 28-31)
       - Add re-export from action-utils.ts: `export { ActionResult } from './action-utils';`
       - Keep the `ok()` and `err()` helper functions (they depend on ActionResult)
       - Update the JSDoc comment to note that ActionResult is re-exported

    2. Verify no circular dependency:
       - action-utils.ts does NOT import from prisma-errors.ts (confirmed in read)
       - prisma-errors.ts can safely import from action-utils.ts
  </action>
  <verify>
    - TypeScript compiles: `npx tsc --noEmit`
    - Grep for duplicate: `grep -n "type ActionResult" src/lib/prisma-errors.ts src/lib/action-utils.ts`
    - Should show only action-utils.ts has the definition
  </verify>
  <done>
    - ActionResult defined only in action-utils.ts
    - prisma-errors.ts re-exports ActionResult from action-utils.ts
    - ok() and err() functions still work
  </done>
</task>

</tasks>

<verification>
All tasks complete when:
- `npx tsc --noEmit` passes
- `npm test -- src/lib/questions/__tests__/types.test.ts` passes
- No duplicate ActionResult definitions
- Comments accurately describe code behavior
- Embedding failures are tracked (not silently swallowed)
</verification>

<success_criteria>
- 8 issues from PR #6 5-agent review addressed
- Code compiles without TypeScript errors
- New tests pass
- No regressions in existing functionality
</success_criteria>

<output>
After completion, create `.planning/quick/020-fix-pr6-review-findings/020-SUMMARY.md`
</output>
