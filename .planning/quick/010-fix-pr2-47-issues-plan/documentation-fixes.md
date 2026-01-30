# Documentation Fixes Plan

**PR:** #2 (Phase 3.1/3.2 Review)
**Category:** Documentation Issues (4 issues)
**Priority:** MEDIUM

---

## Issue 1: CANONICAL_QUESTION_TYPES vs QUESTION_TYPES Terminology Confusion

**File:** `src/lib/questions/types.ts`
**Lines:** 70-87 (CANONICAL_QUESTION_TYPES) and 219-251 (QUESTION_TYPES)

### Problem

Two similar-looking constants exist:
- `CANONICAL_QUESTION_TYPES` (lines 77-85) - 7 canonical types
- `QUESTION_TYPES` (lines 227-237) - 9 types including legacy aliases

The file header and JSDoc don't clearly explain the relationship between these constants, causing confusion about which to use when.

### Current Documentation

```typescript
// Lines 69-87
// =============================================================================
// Canonical Question Types
// =============================================================================

/**
 * Canonical question types used throughout the application.
 * Legacy aliases (fill_blank, true_false_justify) are supported via grading.ts switch cases.
 */
export const CANONICAL_QUESTION_TYPES = [...]

// Lines 219-243
// =============================================================================
// Question Type Constants and Type
// =============================================================================

/**
 * Canonical list of all supported question types.  // <-- CONFUSING: says "Canonical" but includes aliases
 * Includes aliases (fill_blank, true_false_justify) for backward compatibility.
 */
export const QUESTION_TYPES = [...]
```

### Updated Documentation

```typescript
// =============================================================================
// Canonical Question Types (Preferred)
// =============================================================================

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
export const CANONICAL_QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'fill_in_blank',
  'matching',
  'essay',
  'short_answer',
  'show_work',
] as const;

// ...

// =============================================================================
// Question Type Constants (Includes Legacy Aliases)
// =============================================================================

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
 *   // canonical is now 'fill_in_blank', not 'fill_blank'
 * }
 * ```
 *
 * @see CANONICAL_QUESTION_TYPES - canonical forms only (preferred for new code)
 * @see normalizeQuestionType - converts legacy aliases to canonical forms
 */
export const QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'true_false_justify',  // Legacy alias -> 'true_false'
  'fill_in_blank',
  'fill_blank',          // Legacy alias -> 'fill_in_blank'
  'essay',
  'short_answer',
  'show_work',
  'matching',
] as const;
```

---

## Issue 2: Missing JSDoc for Type Guard Functions

**File:** `src/lib/questions/types.ts`
**Lines:** 166-217

### Problem

Type guard functions for QuestionOptions and AnswerData lack JSDoc documentation explaining:
- Purpose of the type guard
- When to use it
- Example usage

### Current Code

```typescript
// Lines 166-192 (QuestionOptions type guards)
export function isMultipleChoiceOptions(options: QuestionOptions): options is MultipleChoiceOptions {
  return options.type === 'multiple_choice';
}

export function isTrueFalseOptions(options: QuestionOptions): options is TrueFalseOptions {
  return options.type === 'true_false';
}
// ... etc

// Lines 194-217 (AnswerData type guards)
export function isMCAnswer(answer: AnswerData): answer is MCAnswer {
  return answer.type === 'multiple_choice';
}
// ... etc
```

### Updated Code with JSDoc

```typescript
// =============================================================================
// Type Guards - QuestionOptions
// =============================================================================

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

/**
 * Type guard for true/false question options.
 * Use to narrow QuestionOptions to TrueFalseOptions for type-safe access to correctAnswer.
 *
 * @example
 * ```typescript
 * if (isTrueFalseOptions(options)) {
 *   const correct = options.correctAnswer; // Type-safe boolean
 * }
 * ```
 */
export function isTrueFalseOptions(options: QuestionOptions): options is TrueFalseOptions {
  return options.type === 'true_false';
}

/**
 * Type guard for fill-in-blank question options.
 * Use to narrow QuestionOptions to FillInBlankOptions for type-safe access to blanks array.
 *
 * @example
 * ```typescript
 * if (isFillInBlankOptions(options)) {
 *   options.blanks.forEach(b => console.log(b.acceptedAnswers));
 * }
 * ```
 */
export function isFillInBlankOptions(options: QuestionOptions): options is FillInBlankOptions {
  return options.type === 'fill_in_blank';
}

/**
 * Type guard for matching question options.
 * Use to narrow QuestionOptions to MatchingOptions for type-safe access to pairs.
 *
 * @example
 * ```typescript
 * if (isMatchingOptions(options)) {
 *   options.pairs.forEach(p => console.log(p.left, p.right));
 * }
 * ```
 */
export function isMatchingOptions(options: QuestionOptions): options is MatchingOptions {
  return options.type === 'matching';
}

/**
 * Type guard for essay question options.
 * Use to narrow QuestionOptions to EssayOptions for type-safe access to rubric/guidelines.
 *
 * @example
 * ```typescript
 * if (isEssayOptions(options)) {
 *   console.log(options.maxWords, options.rubric);
 * }
 * ```
 */
export function isEssayOptions(options: QuestionOptions): options is EssayOptions {
  return options.type === 'essay';
}

/**
 * Type guard for show-work question options.
 * Use to narrow QuestionOptions to ShowWorkOptions for type-safe access to workingSteps.
 *
 * @example
 * ```typescript
 * if (isShowWorkOptions(options)) {
 *   options.workingSteps.forEach(step => console.log(step));
 * }
 * ```
 */
export function isShowWorkOptions(options: QuestionOptions): options is ShowWorkOptions {
  return options.type === 'show_work';
}

// =============================================================================
// Type Guards - AnswerData
// =============================================================================

/**
 * Type guard for multiple choice answer data.
 * Use to narrow AnswerData to MCAnswer for type-safe access to selectedChoiceId.
 *
 * @example
 * ```typescript
 * if (isMCAnswer(answer)) {
 *   console.log(answer.selectedChoiceId); // Type-safe string
 * }
 * ```
 */
export function isMCAnswer(answer: AnswerData): answer is MCAnswer {
  return answer.type === 'multiple_choice';
}

/**
 * Type guard for true/false answer data.
 * Use to narrow AnswerData to TFAnswer for type-safe access to answer boolean.
 *
 * @example
 * ```typescript
 * if (isTFAnswer(answer)) {
 *   const userAnswer: boolean = answer.answer; // Type-safe
 * }
 * ```
 */
export function isTFAnswer(answer: AnswerData): answer is TFAnswer {
  return answer.type === 'true_false';
}

/**
 * Type guard for fill-in-blank answer data.
 * Use to narrow AnswerData to FillBlankAnswer for type-safe access to blanks array.
 *
 * @example
 * ```typescript
 * if (isFillBlankAnswer(answer)) {
 *   answer.blanks.forEach((text, i) => console.log(`Blank ${i}: ${text}`));
 * }
 * ```
 */
export function isFillBlankAnswer(answer: AnswerData): answer is FillBlankAnswer {
  return answer.type === 'fill_in_blank';
}

/**
 * Type guard for matching answer data.
 * Use to narrow AnswerData to MatchingAnswer for type-safe access to pairs.
 *
 * @example
 * ```typescript
 * if (isMatchingAnswer(answer)) {
 *   answer.pairs.forEach(p => console.log(p.leftId, '→', p.rightId));
 * }
 * ```
 */
export function isMatchingAnswer(answer: AnswerData): answer is MatchingAnswer {
  return answer.type === 'matching';
}

/**
 * Type guard for essay/short_answer data.
 * Note: Matches both 'essay' and 'short_answer' types as they share the same structure.
 *
 * @example
 * ```typescript
 * if (isEssayAnswer(answer)) {
 *   console.log(answer.text, `(${answer.wordCount} words)`);
 * }
 * ```
 */
export function isEssayAnswer(answer: AnswerData): answer is EssayAnswer {
  return answer.type === 'essay' || answer.type === 'short_answer';
}

/**
 * Type guard for show-work answer data.
 * Use to narrow AnswerData to ShowWorkAnswer for type-safe access to canvasState.
 *
 * @example
 * ```typescript
 * if (isShowWorkAnswer(answer)) {
 *   console.log(answer.finalAnswer);
 *   // answer.canvasState is TLEditorSnapshot at runtime
 * }
 * ```
 */
export function isShowWorkAnswer(answer: AnswerData): answer is ShowWorkAnswer {
  return answer.type === 'show_work';
}
```

---

## Issue 3: Stale "Phase 4" Removal Comments Without Tracking

**Files:**
1. `src/lib/questions/types.ts` - Line 255
2. `src/components/quiz/quiz-taker.tsx` - Line 27

### Problem

Comments reference "Phase 4" for future work/removal but:
- No tracking issue exists
- Phase 4 scope is undefined
- Creates tech debt without accountability

### File 1: `src/lib/questions/types.ts` (Line 253-256)

**Current:**
```typescript
// =============================================================================
// Legacy Aliases (backward compatibility with Phase 2.1 components)
// These will be removed when components are updated in Phase 4
// =============================================================================
```

**Updated:**
```typescript
// =============================================================================
// Legacy Aliases (backward compatibility with Phase 2.1 components)
//
// These deprecated types support older code that hasn't migrated to canonical types.
// Migration path:
//   - MultipleChoiceAnswer -> MCAnswer
//   - ShortAnswerOptions -> FillInBlankOptions (for short text) or EssayOptions
//   - ShortAnswerAnswer -> EssayAnswer
//   - TrueFalseJustifyOptions -> TrueFalseOptions
//   - TrueFalseJustifyAnswer -> TFAnswer
//   - FillBlankOptions -> FillInBlankOptions
//   - QuestionAnswer -> AnswerData (use specific types)
//
// TODO: Remove once all consumers migrate to canonical types
// Tracked in: .planning/STATE.md (pending todos - legacy type removal)
// =============================================================================
```

### File 2: `src/components/quiz/quiz-taker.tsx` (Line 27)

**Current:**
```typescript
interface QuizTakerProps {
  quizId: string;
  questions: CuratedQuestion[];
  isPreview?: boolean;
  onComplete?: (score: number, maxScore: number) => void;
  // Note: timeLimit will be implemented in Phase 4
  timeLimit?: number | null;
}
```

**Updated:**
```typescript
interface QuizTakerProps {
  quizId: string;
  questions: CuratedQuestion[];
  isPreview?: boolean;
  onComplete?: (score: number, maxScore: number) => void;
  /**
   * Time limit in minutes for quiz completion.
   * When set, displays countdown timer and auto-submits when expired.
   *
   * TODO: Implement timer UI and auto-submit logic
   * Tracked in: .planning/STATE.md (pending todos - quiz timer)
   */
  timeLimit?: number | null;
}
```

### Required: Add to STATE.md Pending Todos

Add these entries to `.planning/STATE.md` under `pending_todos`:

```markdown
### Pending Todos

- [ ] **Legacy type removal** — Remove deprecated type aliases in `src/lib/questions/types.ts` once all consumers migrate to canonical types (MultipleChoiceAnswer, ShortAnswerOptions, etc.)
- [ ] **Quiz timer implementation** — Implement timeLimit prop in `QuizTaker` with countdown UI and auto-submit on expiry
```

---

## Issue 4: Missing Documentation for Dual Type Systems (RendererAnswerData vs LibAnswerData)

**Files:**
1. `src/components/questions/question-renderer.tsx` - Lines 28-40
2. `src/lib/questions/types.ts` - Lines 112-116
3. `src/components/questions/index.ts` - Lines 38, 19

### Problem

The codebase has two parallel AnswerData type systems:
- `RendererAnswerData` (UI layer) - for component state/interaction
- `LibAnswerData` / `AnswerData` (lib layer) - for database storage/grading

The relationship and conversion between them is not clearly documented.

### Fix 1: `src/components/questions/question-renderer.tsx` (Lines 28-40)

**Current:**
```typescript
/**
 * Union type for answer data in the UI layer.
 * This is the format used by renderer components for display and interaction.
 * Named RendererAnswerData to avoid collision with lib/questions/types.ts AnswerData.
 * Note: Converted to/from LibAnswerData (in @/lib/questions/types) for server storage.
 */
export type RendererAnswerData =
```

**Updated:**
```typescript
/**
 * Answer data format for the UI/renderer layer.
 *
 * ## Dual Type System Architecture
 *
 * The question system uses two parallel answer data formats:
 *
 * | Layer | Type | Purpose | Location |
 * |-------|------|---------|----------|
 * | UI | RendererAnswerData | Component state, user interaction | This file |
 * | Lib | AnswerData (LibAnswerData) | Database storage, grading | @/lib/questions/types |
 *
 * ## Why Two Types?
 *
 * **RendererAnswerData** is optimized for UI:
 * - `selectedId: string | null` (null = nothing selected yet)
 * - `answers: string[]` (array of inputs)
 * - `data: ShowYourWorkData` (canvas-specific shape)
 *
 * **LibAnswerData** is optimized for storage/grading:
 * - `selectedChoiceId: string` (must be valid)
 * - `blanks: string[]` (matches schema)
 * - `canvasState: unknown` (JSON-serializable)
 *
 * ## Conversion
 *
 * Conversion functions live in `quiz-taker.tsx`:
 * - `toLibAnswerData(renderer)` - UI -> Storage (before save/grade)
 * - `toRendererAnswerData(type, lib)` - Storage -> UI (when loading)
 *
 * @see LibAnswerData in @/lib/questions/types - database/grading format
 * @see toLibAnswerData in quiz-taker.tsx - conversion to storage format
 * @see toRendererAnswerData in quiz-taker.tsx - conversion from storage format
 */
export type RendererAnswerData =
  | { type: 'multiple_choice'; selectedId: string | null }
  | { type: 'true_false'; selectedAnswer: boolean | null }
  | { type: 'fill_in_blank'; answers: string[] }
  | { type: 'essay' | 'short_answer'; text: string }
  | { type: 'show_work'; data: ShowYourWorkData }
  | { type: 'matching'; pairs: MatchingAnswer['pairs'] };
```

### Fix 2: `src/lib/questions/types.ts` (Lines 112-116)

**Current:**
```typescript
// =============================================================================
// Answer Data (stored in QuestionAnswer.answerData)
// Discriminated union with 'type' field for runtime type checking
// Note: UI components use a different format (RendererAnswerData in question-renderer.tsx)
// =============================================================================
```

**Updated:**
```typescript
// =============================================================================
// Answer Data (Library/Storage Layer)
// =============================================================================
//
// These types define the canonical format for answer data stored in the database
// (QuestionAnswer.answerData JSON field) and used by grading functions.
//
// ## Dual Type System
//
// UI components use a parallel type system (RendererAnswerData) optimized for
// component state and user interaction. Conversions:
//
//   RendererAnswerData --[toLibAnswerData]--> AnswerData (this file)
//   AnswerData --[toRendererAnswerData]--> RendererAnswerData
//
// Conversion functions: src/components/quiz/quiz-taker.tsx
//
// @see RendererAnswerData in @/components/questions/question-renderer.tsx
// =============================================================================
```

### Fix 3: `src/components/questions/index.ts` (Line 38)

**Current:**
```typescript
  AnswerData as LibAnswerData,
```

**Updated:**
```typescript
  /**
   * Library/storage answer format (aliased as LibAnswerData to distinguish from RendererAnswerData).
   * Use for database operations and grading. Convert to/from RendererAnswerData for UI.
   * @see RendererAnswerData for UI layer format
   */
  AnswerData as LibAnswerData,
```

### Fix 4: `src/components/quiz/quiz-taker.tsx` (Lines 31-69, 71-115)

**Current:**
```typescript
/**
 * Convert renderer answer format to library format for grading
 */
function toLibAnswerData(answer: RendererAnswerData): LibAnswerData | null {
```

```typescript
/**
 * Convert library answer format back to renderer format for display
 */
function toRendererAnswerData(
```

**Updated:**
```typescript
/**
 * Convert UI answer format to library format for database storage and grading.
 *
 * This is the "save" direction: user interacts with UI -> data saved to DB.
 *
 * Key transformations:
 * - selectedId (nullable) -> selectedChoiceId (required, null returns null)
 * - selectedAnswer (nullable) -> answer (required, null returns null)
 * - answers: string[] -> blanks: string[]
 * - data.canvasState -> canvasState (flattened)
 *
 * @param answer - UI layer answer from QuestionRenderer
 * @returns Library format for storage/grading, or null if answer is incomplete
 *
 * @see toRendererAnswerData for the reverse conversion (load direction)
 * @see RendererAnswerData in question-renderer.tsx
 * @see LibAnswerData (AnswerData) in @/lib/questions/types
 */
function toLibAnswerData(answer: RendererAnswerData): LibAnswerData | null {
```

```typescript
/**
 * Convert library answer format back to UI format for display in QuestionRenderer.
 *
 * This is the "load" direction: data loaded from DB -> displayed in UI.
 *
 * Key transformations:
 * - selectedChoiceId -> selectedId (with null handling)
 * - answer: boolean -> selectedAnswer: boolean | null
 * - blanks: string[] -> answers: string[]
 * - canvasState -> data.canvasState (wrapped)
 *
 * @param questionType - The question type (may be legacy alias like 'fill_blank')
 * @param answerData - Raw JSON from database (QuestionAnswer.answerData)
 * @returns UI format for QuestionRenderer, or null if conversion fails
 *
 * @see toLibAnswerData for the reverse conversion (save direction)
 * @see RendererAnswerData in question-renderer.tsx
 * @see LibAnswerData (AnswerData) in @/lib/questions/types
 */
function toRendererAnswerData(
  questionType: string,
  answerData: Record<string, unknown>
): RendererAnswerData | null {
```

---

## Summary of Changes

| Issue | File(s) | Lines | Action |
|-------|---------|-------|--------|
| 1 | `src/lib/questions/types.ts` | 69-87, 219-243 | Update section headers and JSDoc to clarify CANONICAL vs QUESTION_TYPES |
| 2 | `src/lib/questions/types.ts` | 166-217 | Add JSDoc with examples to all type guard functions |
| 3 | `src/lib/questions/types.ts` | 253-256 | Replace "Phase 4" with migration path and TODO tracking |
| 3 | `src/components/quiz/quiz-taker.tsx` | 27 | Replace "Phase 4" with proper JSDoc and TODO tracking |
| 3 | `.planning/STATE.md` | pending_todos | Add tracking entries for legacy removal and timer |
| 4 | `src/components/questions/question-renderer.tsx` | 28-40 | Add comprehensive dual type system documentation |
| 4 | `src/lib/questions/types.ts` | 112-116 | Add dual type system context to section header |
| 4 | `src/components/questions/index.ts` | 38 | Add inline JSDoc for LibAnswerData alias |
| 4 | `src/components/quiz/quiz-taker.tsx` | 31-69, 71-115 | Add comprehensive JSDoc to conversion functions |

## Verification

After applying fixes:

1. **TypeScript compilation:** `npx tsc --noEmit` should pass
2. **JSDoc validation:** Hover over functions in VS Code to verify docs appear
3. **Search for stale references:** `grep -r "Phase 4" src/` should return only documented TODOs
4. **STATE.md updated:** Confirm pending_todos has new tracking entries
