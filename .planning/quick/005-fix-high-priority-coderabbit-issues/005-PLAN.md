---
quick: 005
name: fix-high-priority-coderabbit-issues
type: execute
autonomous: true
files_modified:
  - .claude/settings.json
  - package.json
  - vitest.config.ts
  - src/actions/questions.ts
  - src/components/question-bank/question-editor.tsx
  - src/components/questions/image-upload.tsx
  - src/components/questions/types/matching.tsx
  - src/components/quiz/quiz-taker.tsx
  - src/lib/questions/grading.ts
  - src/lib/questions/types.ts
  - src/lib/questions/validation.ts
---

<objective>
Fix 13 HIGH priority CodeRabbit issues from PR #4 review.

Purpose: Address code quality issues flagged as Major severity before merging.
Output: All 13 issues resolved, TypeScript compiles, tests pass.
</objective>

<context>
@.planning/STATE.md
@.planning/PROJECT.md

CodeRabbit PR #4 review identified 13 Major severity issues across config, tooling,
actions, components, and library code. These are grouped by domain for efficient fixing.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Config and Tooling Issues</name>
  <files>
    .claude/settings.json
    package.json
    vitest.config.ts
  </files>
  <action>
1. **`.claude/settings.json`** - Fix npm permission patterns (lines 4-14)
   - Current patterns like `npm run build:*` don't match base commands like `npm run build`
   - Change patterns to use `*` suffix directly:
     - `Bash(npm run build*)` (matches build, build:*, etc.)
     - `Bash(npm run lint*)`
     - `Bash(npm run test*)`
     - `Bash(npm run typecheck*)`
     - `Bash(npm run dev*)`
   - Remove `Bash(npm install:*)` (invalid - should be `Bash(npm install*)`

2. **`package.json`** - Add coverage provider
   - Add `@vitest/coverage-v8` to devDependencies
   - The test:coverage script needs this provider installed

3. **`vitest.config.ts`** - Fix Windows path compatibility
   - Import `fileURLToPath` from `node:url`
   - Replace `new URL('./src/', import.meta.url).pathname` with
     `fileURLToPath(new URL('./src/', import.meta.url))`
   - This fixes path resolution on Windows where URL.pathname returns `/C:/...`
  </action>
  <verify>
    - `npm run typecheck` passes
    - `npm install` completes without errors
  </verify>
  <done>
    - Claude permissions match actual npm scripts
    - Coverage provider installed
    - Vitest alias works on Windows
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix Server Action Validation Issues</name>
  <files>
    src/actions/questions.ts
    src/lib/questions/validation.ts
  </files>
  <action>
1. **`src/lib/questions/validation.ts`** (lines 68-75) - Use refined schema
   - Change `questionOptionsSchema` discriminated union to use `multipleChoiceOptionsSchema`
     (the refined version with exactly-one-correct validation) instead of `multipleChoiceOptionsBase`
   - This ensures business rules are enforced in the centralized schema

2. **`src/actions/questions.ts`** (lines 150-207) - Import centralized schema
   - Remove the local `questionOptionsSchema` definition (lines 178-221)
   - Import from validation.ts: `import { questionOptionsSchema } from '@/lib/questions/validation';`
   - The centralized schema already includes `short_answer` variant

3. **`src/actions/questions.ts`** (lines 232-277) - Add options.type mismatch guard
   - After ownership check (line 268), add validation:
   ```typescript
   // Validate options.type matches questionType if options provided
   if (parsed.data.options && parsed.data.options.type !== question.questionType) {
     return {
       success: false,
       error: `Options type '${parsed.data.options.type}' does not match question type '${question.questionType}'`
     };
   }
   ```
  </action>
  <verify>
    - `npm run typecheck` passes
    - No duplicate schema definitions remain
  </verify>
  <done>
    - Centralized validation schema with refinements used everywhere
    - Options type mismatch caught before database update
  </done>
</task>

<task type="auto">
  <name>Task 3: Fix React Component State Sync Issues</name>
  <files>
    src/components/question-bank/question-editor.tsx
    src/components/questions/image-upload.tsx
    src/components/questions/types/matching.tsx
  </files>
  <action>
1. **`src/components/question-bank/question-editor.tsx`** (lines 3-26) - Sync form state
   - Add useEffect that watches `question` prop and updates `formData`:
   ```typescript
   useEffect(() => {
     setFormData({
       questionText: question.questionText,
       correctAnswer: question.correctAnswer,
       explanation: question.explanation,
     });
   }, [question]);
   ```
   - This ensures form resets when a different question is opened for editing

2. **`src/components/question-bank/question-editor.tsx`** (lines 44-63) - Add a11y
   - Add to the outer modal div: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="question-editor-title"`
   - Add `id="question-editor-title"` to the h2 element
   - Add ESC key handler:
   ```typescript
   useEffect(() => {
     const handleEsc = (e: KeyboardEvent) => {
       if (e.key === 'Escape') onClose();
     };
     document.addEventListener('keydown', handleEsc);
     return () => document.removeEventListener('keydown', handleEsc);
   }, [onClose]);
   ```

3. **`src/components/questions/image-upload.tsx`** (lines 44-48) - Sync preview state
   - Add useEffect that watches `currentImageUrl` and calls `setPreview`:
   ```typescript
   useEffect(() => {
     setPreview(currentImageUrl || null);
   }, [currentImageUrl]);
   ```
   - This ensures preview updates when parent provides new URL

4. **`src/components/questions/types/matching.tsx`** (lines 79-99) - Update rightOrder
   - Add useEffect watching `[answer, options, readOnly]`:
   ```typescript
   useEffect(() => {
     if (answer?.pairs && !readOnly) {
       setRightOrder(answer.pairs.map((p) => p.rightId));
     } else if (!answer?.pairs && readOnly) {
       // Reset to original order when no answer in readOnly
       setRightOrder(options.pairs.map((p) => p.id));
     }
   }, [answer, options, readOnly]);
   ```
  </action>
  <verify>
    - `npm run typecheck` passes
    - No React hook warnings
  </verify>
  <done>
    - Form state syncs when question prop changes
    - Modal has proper ARIA attributes and ESC key handler
    - Image preview syncs with currentImageUrl prop
    - Matching component syncs rightOrder with answer prop
  </done>
</task>

<task type="auto">
  <name>Task 4: Fix Quiz Answer Format Issues</name>
  <files>
    src/components/quiz/quiz-taker.tsx
  </files>
  <action>
1. **`src/components/quiz/quiz-taker.tsx`** (lines 34-53) - Return empty arrays not null
   - In `toLibAnswerData` function, change fill_in_blank and matching cases to return
     properly typed empty objects instead of null when empty:

   For fill_in_blank (around line 46-49):
   ```typescript
   case 'fill_in_blank':
     return { type: 'fill_in_blank', blanks: answer.answers };
   ```
   - Always return the blanks array (even if empty/all-empty-strings)

   For matching (around line 50-54):
   ```typescript
   case 'matching':
     return { type: 'matching', pairs: answer.pairs };
   ```
   - Always return the pairs array (even if empty)

   Note: This ensures grading functions receive consistent typed data instead of null,
   which the grading code already handles with partial credit logic.
  </action>
  <verify>
    - `npm run typecheck` passes
    - `toLibAnswerData` returns consistent types
  </verify>
  <done>
    - fill_in_blank returns `{ type: 'fill_in_blank', blanks: [] }` not null
    - matching returns `{ type: 'matching', pairs: [] }` not null
  </done>
</task>

<task type="auto">
  <name>Task 5: Fix Grading Logic Issues</name>
  <files>
    src/lib/questions/grading.ts
    src/lib/questions/types.ts
  </files>
  <action>
1. **`src/lib/questions/grading.ts`** (lines 125-149) - Fix duplicate match scoring
   - Current logic counts `answerData.pairs` where leftId === rightId
   - Problem: Student could submit same rightId multiple times to inflate score
   - Fix: Build canonical set from `options.pairs`, iterate expected pairs, track used:
   ```typescript
   case 'matching': {
     if (!options || !isMatchingOptions(options)) {
       return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid question options' };
     }
     if (!isMatchingAnswer(answerData)) {
       return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid answer format' };
     }

     const totalPairs = options.pairs.length;

     // Build map of student's answers: leftId -> rightId
     const studentMatches = new Map<string, string>();
     for (const match of answerData.pairs) {
       studentMatches.set(match.leftId, match.rightId);
     }

     // Count correct matches from expected pairs (prevents duplicates inflating score)
     let correctCount = 0;
     for (const expectedPair of options.pairs) {
       const studentRightId = studentMatches.get(expectedPair.id);
       if (studentRightId === expectedPair.id) {
         correctCount++;
       }
     }

     const isCorrect = correctCount === totalPairs;
     const pointsEarned = totalPairs > 0
       ? Math.min(correctCount, totalPairs) / totalPairs * maxPoints
       : 0;

     return {
       isCorrect,
       pointsEarned,
       maxPoints,
       feedback: isCorrect ? undefined : `${correctCount}/${totalPairs} pairs correct`,
     };
   }
   ```

2. **`src/lib/questions/types.ts`** (lines 60-66) - Handle legacy aliases
   - Add comment documenting canonical vs legacy types
   - Add `normalizeQuestionType` helper function:
   ```typescript
   /**
    * Canonical question types used throughout the application.
    * Legacy aliases (fill_blank, true_false_justify) are supported via grading.ts switch cases.
    */
   export const CANONICAL_QUESTION_TYPES = [
     'multiple_choice',
     'true_false',
     'fill_in_blank',
     'matching',
     'essay',
     'short_answer',
     'show_work',
   ] as const;

   export type CanonicalQuestionType = typeof CANONICAL_QUESTION_TYPES[number];

   /**
    * Normalize legacy question type aliases to canonical types.
    * Returns the input unchanged if already canonical or unrecognized.
    */
   export function normalizeQuestionType(type: string): string {
     switch (type) {
       case 'fill_blank':
         return 'fill_in_blank';
       case 'true_false_justify':
         return 'true_false';
       default:
         return type;
     }
   }
   ```
  </action>
  <verify>
    - `npm run typecheck` passes
    - `npm run test:run` passes (grading tests)
  </verify>
  <done>
    - Matching grading cannot be gamed with duplicate rightIds
    - Legacy type aliases documented and normalization helper available
  </done>
</task>

<task type="auto">
  <name>Task 6: Run Verification and Install Dependencies</name>
  <files>None (verification only)</files>
  <action>
1. Run `npm install` to install @vitest/coverage-v8
2. Run `npm run typecheck` to verify all changes compile
3. Run `npm run test:run` to ensure tests still pass
4. Run `npm run lint` to check for any linting issues
  </action>
  <verify>
    - All commands complete successfully
  </verify>
  <done>
    - All 13 CodeRabbit issues fixed
    - TypeScript compiles clean
    - Tests pass
    - Ready for commit
  </done>
</task>

</tasks>

<verification>
- `npm run typecheck` passes
- `npm run test:run` passes
- `npm run lint` passes (or only pre-existing warnings)
- No runtime errors when running dev server
</verification>

<success_criteria>
- All 13 Major severity CodeRabbit issues addressed:
  1. Claude settings npm patterns fixed
  2. Coverage provider added
  3. Vitest Windows path fixed
  4. Centralized schema imported in questions.ts
  5. Options type mismatch validation added
  6. QuestionEditor form state syncs
  7. QuestionEditor a11y improved
  8. ImageUpload preview syncs
  9. Matching rightOrder syncs
  10. toLibAnswerData returns empty arrays not null
  11. Matching grading duplicate fix
  12. Legacy type aliases documented with helper
  13. Refined schema used in discriminated union
- TypeScript compiles without errors
- Tests pass
</success_criteria>

<output>
After completion, update `.planning/STATE.md` with quick task entry.
</output>
