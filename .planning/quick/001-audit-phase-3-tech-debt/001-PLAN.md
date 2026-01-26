---
phase: quick-001
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/questions/question-renderer.tsx
  - src/actions/questions.ts
  - src/components/quiz/quiz-taker.tsx
autonomous: true
must_haves:
  truths:
    - "No TypeScript errors or warnings after cleanup"
    - "All Phase 3 tests still pass"
    - "Consistent import patterns across actions"
  artifacts:
    - path: "src/components/questions/question-renderer.tsx"
      provides: "Clean imports without duplicates"
    - path: "src/actions/questions.ts"
      provides: "Consistent prisma import pattern"
  key_links: []
---

<objective>
Clean up Phase 3 tech debt: unused imports, inconsistent patterns, and unused props.

Purpose: Maintain code quality and consistency after rapid Phase 3 development.
Output: Clean, consistent codebase ready for Phase 4.
</objective>

<context>
@.planning/STATE.md
@src/components/questions/question-renderer.tsx
@src/actions/questions.ts
@src/components/quiz/quiz-taker.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix unused and duplicate type imports</name>
  <files>src/components/questions/question-renderer.tsx</files>
  <action>
In question-renderer.tsx, lines 10-19 import type guards incorrectly as types:
```typescript
import type {
  QuestionOptions,
  MatchingAnswer,
  isMultipleChoiceOptions,  // These are functions, not types
  isTrueFalseOptions,
  isFillInBlankOptions,
  isMatchingOptions,
  isEssayOptions,
  isShowWorkOptions,
} from '@/lib/questions/types';
```

Then lines 22-29 correctly import them as values with aliases:
```typescript
import {
  isMultipleChoiceOptions as isMC,
  // ...
} from '@/lib/questions/types';
```

Fix by:
1. Remove the type guards from the `import type` statement (lines 13-18)
2. Keep only `QuestionOptions` and `MatchingAnswer` in the type import
3. The function imports with aliases (lines 22-29) are correct - keep them

Result should be:
```typescript
import type {
  QuestionOptions,
  MatchingAnswer,
} from '@/lib/questions/types';

// Import type guards (keep existing lines 22-29)
import {
  isMultipleChoiceOptions as isMC,
  // ...existing aliases
} from '@/lib/questions/types';
```
  </action>
  <verify>npm run typecheck passes without errors or warnings about unused imports</verify>
  <done>question-renderer.tsx has clean imports with no duplicates</done>
</task>

<task type="auto">
  <name>Task 2: Standardize Prisma import pattern</name>
  <files>src/actions/questions.ts</files>
  <action>
Currently questions.ts uses named import:
```typescript
import { prisma } from '@/lib/prisma';
```

But quiz.ts and attempts.ts use default import:
```typescript
import prisma from '@/lib/prisma';
```

Standardize on DEFAULT import (matches the majority pattern):
- Change line 3 in questions.ts from `import { prisma } from '@/lib/prisma'`
- To `import prisma from '@/lib/prisma'`

This matches quiz.ts and attempts.ts patterns.
  </action>
  <verify>npm run typecheck passes; grep -r "from '@/lib/prisma'" src/actions/ shows consistent pattern</verify>
  <done>All action files use consistent `import prisma from '@/lib/prisma'` pattern</done>
</task>

<task type="auto">
  <name>Task 3: Remove unused timeLimit prop warning</name>
  <files>src/components/quiz/quiz-taker.tsx</files>
  <action>
The QuizTaker component accepts `timeLimit` prop (line 27) but never uses it:
```typescript
interface QuizTakerProps {
  // ...
  timeLimit?: number | null;
}

export function QuizTaker({
  // ...
  timeLimit,  // Unused - will cause ESLint warning
}: QuizTakerProps) {
```

Two options:
1. Remove the prop entirely (breaks API compatibility)
2. Prefix with underscore to indicate intentionally unused: `_timeLimit`

Choose option 2 (underscore prefix) since timeLimit is part of the Quiz model and will be implemented in Phase 4 (Quiz Delivery). This preserves the API contract.

Change line 121 from `timeLimit,` to `timeLimit: _timeLimit,` (destructure with rename to underscore).

Add a comment above the prop interface: `// Note: timeLimit will be implemented in Phase 4`
  </action>
  <verify>npm run lint passes without unused variable warnings for timeLimit</verify>
  <done>QuizTaker has no ESLint warnings about unused timeLimit prop</done>
</task>

</tasks>

<verification>
1. Run `npm run typecheck` - should pass with no errors
2. Run `npm run lint` - should pass with no unused import/variable warnings
3. Run `npm run build` - should succeed
4. Verify consistent prisma import: `grep "from '@/lib/prisma'" src/actions/*.ts`
</verification>

<success_criteria>
- Zero TypeScript errors
- Zero ESLint warnings related to unused imports/variables
- Consistent import patterns across src/actions/*.ts
- Build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/001-audit-phase-3-tech-debt/001-SUMMARY.md`
</output>
