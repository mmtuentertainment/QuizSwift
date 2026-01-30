---
quick_plan: 007
type: execute
description: Fix ALL remaining PR issues with cascading rebases
autonomous: true
files_modified:
  - package-lock.json
  - src/actions/questions.ts
  - src/components/quiz/quiz-taker.tsx
  - src/components/question-bank/question-filters.tsx
  - src/lib/questions/types.ts
  - src/components/questions/question-renderer.tsx
---

<objective>
Fix all remaining CodeRabbit issues on PR #2, then cascade fixes up through PR #5 and PR #4 via rebases.

PR Stack (bottom to top):
- PR #2 (feat/phase-3-question-bank) - 6 CodeRabbit issues + CI failure
- PR #5 (feat/phase-3.1-prisma-enums-clean) - READY, just needs rebase
- PR #4 (feat/phase-3.2-questiontype-clean) - QuestionType centralization incomplete

Purpose: Get all 3 PRs green and ready for sequential merging
Output: All PRs passing CI, all CodeRabbit actionable items resolved
</objective>

<context>
Current branch: feat/phase-3.1-prisma-enums-clean (PR #5)

Files already reviewed:
- src/actions/attempts.ts - Authorization already present (lines 30-47)
- src/actions/questions.ts - Pagination clamping already present (lines 63-65), empty update guard present (lines 258-260)
- src/components/quiz/quiz-taker.tsx - Has saveError state but needs visibility fix
- src/components/question-bank/question-filters.tsx - Already has aria-labels (lines 92, 107, 121)
- src/lib/questions/types.ts - Has normalizeQuestionType() but missing isValidQuestionType()
- src/components/questions/question-renderer.tsx - Has local QuestionType (lines 42-51) that should use canonical
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix PR #2 issues on feat/phase-3-question-bank</name>
  <files>
    package-lock.json
    src/components/quiz/quiz-taker.tsx
  </files>
  <action>
    Checkout feat/phase-3-question-bank branch.

    1. Run `npm install` to regenerate package-lock.json (fixes CI failure)

    2. In quiz-taker.tsx, the saveError handling already exists (lines 145, 215-216, 468-480).
       However, need to verify it shows errors from submitAnswer properly.
       The current code at line 232 sets saveError on failure - this is correct.
       No change needed for error handling - it's already implemented.

    3. Replace window.location.href with Next.js router:
       - Check for any window.location usage
       - Currently the component doesn't use window.location.href (completion redirects via onComplete callback)
       - No change needed

    4. Review accessibility labels:
       - question-filters.tsx already has aria-labels on all selects (lines 92, 107, 121)
       - No change needed

    5. Review authorization in attempts.ts:
       - startAttempt already verifies user owns document (lines 30-47)
       - No change needed

    6. Review pagination clamping in questions.ts:
       - Already implemented (lines 63-65)
       - No change needed

    7. Review empty update handling in questions.ts:
       - Already implemented (lines 258-260)
       - No change needed

    Summary: The only actual fix needed on PR #2 is running `npm install` to fix the lock file.
    All CodeRabbit issues appear to have already been addressed in prior commits.

    Commit: "fix(phase-3): regenerate package-lock.json for CI"
  </action>
  <verify>
    git diff --stat shows only package-lock.json changed
    npm ci succeeds locally
  </verify>
  <done>package-lock.json regenerated and committed on feat/phase-3-question-bank</done>
</task>

<task type="auto">
  <name>Task 2: Rebase PR #5 on updated PR #2</name>
  <files>None (rebase only)</files>
  <action>
    Checkout feat/phase-3.1-prisma-enums-clean branch.

    Rebase on updated feat/phase-3-question-bank:
    ```
    git fetch origin
    git rebase feat/phase-3-question-bank
    ```

    Resolve any conflicts (likely none since PR #5 touches different files).

    Force push with lease:
    ```
    git push --force-with-lease origin feat/phase-3.1-prisma-enums-clean
    ```
  </action>
  <verify>
    git log --oneline -3 shows commits rebased on top of PR #2's changes
    No merge conflicts
  </verify>
  <done>PR #5 rebased on updated PR #2 and pushed</done>
</task>

<task type="auto">
  <name>Task 3: Fix PR #4 QuestionType centralization + rebase</name>
  <files>
    src/lib/questions/types.ts
    src/components/questions/question-renderer.tsx
  </files>
  <action>
    Checkout feat/phase-3.2-questiontype-clean branch.

    First rebase on updated PR #5:
    ```
    git fetch origin
    git rebase feat/phase-3.1-prisma-enums-clean
    ```

    Then fix the QuestionType centralization issues:

    1. In src/lib/questions/types.ts, add isValidQuestionType() type guard after normalizeQuestionType():
       ```typescript
       /**
        * Type guard to check if a string is a valid canonical question type.
        */
       export function isValidQuestionType(type: string): type is CanonicalQuestionType {
         return (CANONICAL_QUESTION_TYPES as readonly string[]).includes(type);
       }
       ```

    2. In src/components/questions/question-renderer.tsx:
       - DELETE the local QuestionType definition (lines 42-51)
       - ADD import for CanonicalQuestionType and normalizeQuestionType from '@/lib/questions/types'
       - UPDATE QuestionRendererProps.questionType to use `CanonicalQuestionType | string`
       - ADD normalization at start of renderQuestionInput():
         ```typescript
         const normalizedType = normalizeQuestionType(questionType);
         ```
       - UPDATE all switch cases to use normalizedType instead of questionType
       - UPDATE shouldRenderQuestionText to use normalizedType

    Commit: "fix(phase-3.2): complete QuestionType centralization"

    Force push with lease:
    ```
    git push --force-with-lease origin feat/phase-3.2-questiontype-clean
    ```
  </action>
  <verify>
    grep -r "export type QuestionType" src/components/questions/ returns nothing
    grep "isValidQuestionType" src/lib/questions/types.ts returns the function
    TypeScript compiles without errors: npx tsc --noEmit
  </verify>
  <done>
    - Local QuestionType removed from question-renderer.tsx
    - isValidQuestionType() added to types.ts
    - normalizeQuestionType() used in renderer switch
    - PR #4 rebased on PR #5 and pushed
  </done>
</task>

<task type="auto">
  <name>Task 4: Verify all PRs are green</name>
  <files>None</files>
  <action>
    Check CI status for all three PRs:
    ```
    gh pr view 2 --json statusCheckRollup
    gh pr view 5 --json statusCheckRollup
    gh pr view 4 --json statusCheckRollup
    ```

    If any PR has failing checks, investigate and fix.

    List all PRs to confirm they're all ready:
    ```
    gh pr list --state open
    ```
  </action>
  <verify>
    All three PRs show passing CI checks
    gh pr view shows no merge conflicts for any PR
  </verify>
  <done>All PRs passing CI and ready for sequential merge (user's decision)</done>
</task>

</tasks>

<verification>
After all tasks:
1. PR #2 CI passes (package-lock.json in sync)
2. PR #5 cleanly rebased on PR #2
3. PR #4 cleanly rebased on PR #5 with QuestionType centralization complete
4. All CodeRabbit actionable items resolved
5. No merge conflicts in PR stack
</verification>

<success_criteria>
- [ ] package-lock.json regenerated on PR #2
- [ ] PR #5 rebased on PR #2
- [ ] isValidQuestionType() added to types.ts
- [ ] Local QuestionType removed from question-renderer.tsx
- [ ] normalizeQuestionType() used in question-renderer.tsx switch
- [ ] PR #4 rebased on PR #5
- [ ] All 3 PRs passing CI
</success_criteria>

<notes>
Based on code review, most CodeRabbit issues appear to already be fixed:
- Authorization in startAttempt: Already implemented (lines 30-47 in attempts.ts)
- Pagination clamping: Already implemented (lines 63-65 in questions.ts)
- Empty update guard: Already implemented (lines 258-260 in questions.ts)
- Error handling in quiz-taker: Already implemented (saveError state)
- Aria-labels: Already present on all filter selects
- No window.location.href usage found

The main remaining work is:
1. Regenerate package-lock.json (CI fix)
2. Complete QuestionType centralization on PR #4
3. Cascade rebases through the PR stack
</notes>
