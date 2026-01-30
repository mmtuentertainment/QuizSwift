---
type: quick-execute
plan: 006
title: Fix PR Review Action Items (Bottom-Up Stacked PRs)
wave: 1
autonomous: true
files_modified:
  - src/lib/questions/grading.ts
  - src/components/questions/types/matching.tsx
  - prisma/migrations/20260127_convert_status_to_enums/migration.sql
  - src/components/quiz/quiz-taker.tsx
  - src/components/questions/question-renderer.tsx
  - src/lib/questions/types.ts
---

<objective>
Fix all 6 action items from PR review team across stacked PRs #2, #4, #5.

Strategy: Fix bottom-up (PR #2 -> PR #5 -> PR #4), rebasing upward to propagate fixes without conflicts.

Output: All three PRs updated with fixes, no merge conflicts.
</objective>

<context>
@.planning/quick/006-fix-pr-review-action-items

PR Stack (bottom to top):
- main
  - PR #2 (feat/phase-3-question-bank) - Phase 3 Question Bank
    - PR #5 (feat/phase-3.1-prisma-enums) - Prisma Enums
      - PR #4 (feat/phase-3.2-questiontype-clean) - QuestionType Centralization
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix PR #2 Issues (feat/phase-3-question-bank)</name>
  <files>
    src/lib/questions/grading.ts
    src/components/questions/types/matching.tsx
  </files>
  <action>
Checkout feat/phase-3-question-bank branch.

**Issue 1: Matching grading logic flaw (grading.ts:159-165)**

Current flawed logic:
```typescript
for (const expectedPair of options.pairs) {
  const studentRightId = studentMatches.get(expectedPair.id);
  // BUG: Compares studentRightId === expectedPair.id
  // This only works if left ID and right ID happen to be the same
  if (studentRightId === expectedPair.id) {
    correctCount++;
  }
}
```

The matching data model uses the same `id` for both left and right sides of a pair.
When `options.pairs[i].id = "pair-1"`, the correct matching is when the student
places the right side of "pair-1" next to the left side of "pair-1".

The grading iterates over expected pairs (using pair.id as leftId), then checks
if student's rightId for that leftId equals the same pair.id. This is actually
CORRECT because:
- options.pairs[i].id is used as both the identifier for the left item
- The right item in position i also uses the same id as its identifier
- Correct matching = student places rightId equal to the leftId for each row

However, the code comment is misleading. Update the comment to clarify:
```typescript
// Matching is correct when student's rightId equals the pair.id (which is the leftId)
// because each pair's id serves as identifier for both its left and right items
```

Wait - re-reading the matching.tsx component:
- Left side: renders options.pairs in order, each pair.id is the leftId
- Right side: rightOrder array contains rightIds (which are also pair.id values)
- Answer format: { leftId: pair.id (from position), rightId: rightOrder[position] }

So if pairs are ["A", "B", "C"] and student drags to order ["B", "C", "A"]:
- answer.pairs = [{leftId: "A", rightId: "B"}, {leftId: "B", rightId: "C"}, {leftId: "C", rightId: "A"}]
- Correct when leftId === rightId for each pair

The grading logic IS correct. The issue is the comment is confusing. Clarify the comment.

**Issue 2: Dual useEffect state sync (matching.tsx:89-116)**

Two useEffects both sync rightOrder when answer changes:
1. Lines 89-93: Syncs when answer.pairs exists
2. Lines 109-116: Also syncs based on answer.pairs

Consolidate into a single effect:
```typescript
// Sync rightOrder when answer prop changes (restoring from saved state or navigating)
useEffect(() => {
  if (answer?.pairs?.length) {
    setRightOrder(answer.pairs.map((p) => p.rightId));
  } else if (!answer?.pairs && readOnly) {
    // Reset to original order when no answer in readOnly mode
    setRightOrder(options.pairs.map((p) => p.id));
  }
}, [answer, options.pairs, readOnly]);
```

Delete the duplicate effect at lines 89-93.

Commit: `fix(03): correct matching grading comment and consolidate useEffect`
Push to origin/feat/phase-3-question-bank.
  </action>
  <verify>
- `git diff HEAD~1` shows comment clarification in grading.ts
- `git diff HEAD~1` shows single consolidated useEffect in matching.tsx
- `npm run lint` passes
- `npm run build` succeeds
  </verify>
  <done>
- Matching grading comment clarified
- Dual useEffect consolidated into one
- PR #2 branch updated
  </done>
</task>

<task type="auto">
  <name>Task 2: Rebase PR #5 and Fix Issues (feat/phase-3.1-prisma-enums)</name>
  <files>
    prisma/migrations/20260127_convert_status_to_enums/migration.sql
    src/components/quiz/quiz-taker.tsx
  </files>
  <action>
Checkout feat/phase-3.1-prisma-enums branch.
Rebase onto updated feat/phase-3-question-bank: `git rebase feat/phase-3-question-bank`

**Issue 3: Migration missing preflight validation (migration.sql)**

Add DO $$ block at the start to validate all existing values before ALTER TABLE:
```sql
-- Preflight validation: Ensure all existing values are valid enum options
-- Abort migration if any invalid values found (prevents database corruption)
DO $$
DECLARE
  invalid_quiz_status INTEGER;
  invalid_show_results INTEGER;
  invalid_attempt_status INTEGER;
BEGIN
  -- Check Quiz.status values
  SELECT COUNT(*) INTO invalid_quiz_status
  FROM "Quiz"
  WHERE "status" NOT IN ('draft', 'preview_required', 'published', 'archived');

  IF invalid_quiz_status > 0 THEN
    RAISE EXCEPTION 'Found % Quiz records with invalid status values. Fix before migration.', invalid_quiz_status;
  END IF;

  -- Check Quiz.showResults values
  SELECT COUNT(*) INTO invalid_show_results
  FROM "Quiz"
  WHERE "showResults" NOT IN ('after_submit', 'after_due', 'manual');

  IF invalid_show_results > 0 THEN
    RAISE EXCEPTION 'Found % Quiz records with invalid showResults values. Fix before migration.', invalid_show_results;
  END IF;

  -- Check QuizAttempt.status values
  SELECT COUNT(*) INTO invalid_attempt_status
  FROM "QuizAttempt"
  WHERE "status" NOT IN ('in_progress', 'submitted', 'graded');

  IF invalid_attempt_status > 0 THEN
    RAISE EXCEPTION 'Found % QuizAttempt records with invalid status values. Fix before migration.', invalid_attempt_status;
  END IF;

  RAISE NOTICE 'Preflight validation passed: all status values are valid enum options';
END $$;

-- (rest of migration follows)
```

**Issue 4: Unused AttemptStatusValue import (quiz-taker.tsx:22)**

The import `import type { AttemptStatusValue } from '@/lib/enums';` is not used.

Option A: Remove unused import.
Option B: Use it for type safety on the status check at line 171.

Choose Option B - use it for type safety:
```typescript
// Line 171 currently:
if (existing.attempt.status === 'submitted') {

// Change to use the type (add const assertion):
const SUBMITTED: AttemptStatusValue = 'submitted';
if (existing.attempt.status === SUBMITTED) {
```

Actually simpler: just use the import in a type annotation or remove it.
Since the status comparison is against a string literal and Prisma already types it,
removing the unused import is cleaner. Remove line 22.

Commit: `fix(03.1): add migration preflight validation, remove unused import`
Push with force-with-lease: `git push --force-with-lease`
  </action>
  <verify>
- `git log --oneline -5` shows rebase succeeded (PR #2 commits present)
- migration.sql starts with DO $$ preflight validation block
- quiz-taker.tsx no longer imports AttemptStatusValue
- `npm run lint` passes
- `npm run build` succeeds
  </verify>
  <done>
- PR #5 rebased on updated PR #2
- Migration has preflight validation
- Unused import removed
- PR #5 branch force-pushed
  </done>
</task>

<task type="auto">
  <name>Task 3: Rebase PR #4 and Fix Issues (feat/phase-3.2-questiontype-clean)</name>
  <files>
    src/components/questions/question-renderer.tsx
    src/lib/questions/types.ts
  </files>
  <action>
Checkout feat/phase-3.2-questiontype-clean branch.
Rebase onto updated feat/phase-3.1-prisma-enums: `git rebase feat/phase-3.1-prisma-enums`

**Issue 5: Duplicate QuestionType definition (question-renderer.tsx:42-51)**

Current local definition:
```typescript
export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'true_false_justify'
  | 'fill_in_blank'
  | 'fill_blank'
  | 'essay'
  | 'short_answer'
  | 'show_work'
  | 'matching';
```

Replace with import from centralized types.ts:
1. Add import: `import { type CanonicalQuestionType, normalizeQuestionType } from '@/lib/questions/types';`
2. Remove local QuestionType definition (lines 42-51)
3. Update QuestionRendererProps.questionType to: `questionType: string`
   (Keep as string since it may receive legacy types that need normalization)
4. At start of renderQuestionInput(), normalize: `const normalizedType = normalizeQuestionType(questionType);`
5. Use normalizedType in switch statement

**Issue 6: Missing isValidQuestionType type guard (types.ts)**

Add after normalizeQuestionType function:
```typescript
/**
 * Type guard to check if a string is a valid canonical question type.
 * Use for runtime validation of untrusted input.
 */
export function isValidQuestionType(type: string): type is CanonicalQuestionType {
  return (CANONICAL_QUESTION_TYPES as readonly string[]).includes(type);
}
```

Commit: `fix(03.2): use centralized QuestionType, add isValidQuestionType guard`
Push with force-with-lease: `git push --force-with-lease`
  </action>
  <verify>
- `git log --oneline -10` shows full stack (PR #2 + PR #5 commits present)
- question-renderer.tsx imports from types.ts, no local QuestionType
- types.ts exports isValidQuestionType function
- `npm run lint` passes
- `npm run build` succeeds
  </verify>
  <done>
- PR #4 rebased on updated PR #5
- QuestionType centralized from types.ts
- isValidQuestionType type guard added
- PR #4 branch force-pushed
  </done>
</task>

<task type="auto">
  <name>Task 4: Verify Stack Integrity</name>
  <files>None (verification only)</files>
  <action>
Verify all three PRs are correctly stacked and updated:

1. Check PR #2 (feat/phase-3-question-bank):
   - `git log feat/phase-3-question-bank --oneline -3`
   - Should show fix commit at top

2. Check PR #5 (feat/phase-3.1-prisma-enums):
   - `git log feat/phase-3.1-prisma-enums --oneline -5`
   - Should show PR #5 commits on top of PR #2 commits

3. Check PR #4 (feat/phase-3.2-questiontype-clean):
   - `git log feat/phase-3.2-questiontype-clean --oneline -7`
   - Should show PR #4 commits on top of PR #5 commits

4. Verify no merge conflicts in GitHub:
   - `gh pr view 2 --json mergeable`
   - `gh pr view 5 --json mergeable`
   - `gh pr view 4 --json mergeable`

5. Return to original branch:
   - `git checkout feat/phase-3.1-prisma-enums-clean` (or main)
  </action>
  <verify>
- All three PRs show correct commit history
- GitHub reports all PRs as mergeable
- No merge conflicts detected
  </verify>
  <done>
- Stack verified: PR #2 -> PR #5 -> PR #4
- All PRs mergeable
- All 6 action items addressed
  </done>
</task>

</tasks>

<verification>
After all tasks complete:
- [ ] PR #2 has matching grading comment fix and useEffect consolidation
- [ ] PR #5 has migration preflight validation and removed unused import
- [ ] PR #4 has centralized QuestionType and isValidQuestionType guard
- [ ] All three PRs pass lint and build
- [ ] All three PRs are mergeable (no conflicts)
- [ ] Stack order maintained: main <- PR #2 <- PR #5 <- PR #4
</verification>

<success_criteria>
- All 6 action items from PR review addressed
- No merge conflicts between stacked PRs
- All PRs pass CI (lint + build)
- Fixes propagate correctly up the stack via rebases
</success_criteria>
