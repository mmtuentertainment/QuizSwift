# Code Quality Fixes - PR #2 Review Issues

**Scope:** 3 Medium-severity issues from PR #2 CodeRabbit review
**Estimated effort:** ~30 minutes

---

## Issue 1: Duplicate Type Definitions

### Problem
Multiple component files define their own versions of Options interfaces that already exist in `src/lib/questions/types.ts`. This creates drift risk and maintenance burden.

### Affected Files

| Component File | Duplicate Interface | Canonical Interface in `types.ts` |
|----------------|--------------------|------------------------------------|
| `src/components/questions/types/multiple-choice.tsx` | `MultipleChoiceOptions` (lines 9-15) | `MultipleChoiceOptions` (lines 14-21) |
| `src/components/questions/types/true-false.tsx` | `TrueFalseOptions` (lines 7-10) | `TrueFalseOptions` (lines 23-27) |
| `src/components/questions/types/fill-in-blank.tsx` | `FillInBlankOptions` (lines 10-17) | `FillInBlankOptions` (lines 29-37) |
| `src/components/questions/types/essay.tsx` | `EssayOptions` (lines 9-14) | `EssayOptions` (lines 48-54) |

**Note:** `matching.tsx` already imports from `@/lib/questions/types` - no fix needed there.

### Schema Differences (IMPORTANT)

The local types differ slightly from canonical types:

| Type | Local Version | Canonical Version | Resolution |
|------|---------------|-------------------|------------|
| `MultipleChoiceOptions` | Missing `type: 'multiple_choice'` discriminator | Has `type` field | Use canonical (discriminated union pattern) |
| `TrueFalseOptions` | Missing `type: 'true_false'` discriminator | Has `type` field | Use canonical |
| `FillInBlankOptions` | Uses `id`, `correctAnswer`, `acceptableVariants`, `caseSensitive` per blank | Uses `index`, `acceptedAnswers`, `caseSensitive` per blank | **NEEDS DECISION** - see below |
| `EssayOptions` | Missing `type: 'essay'` discriminator | Has `type` field | Use canonical |

### Decision Needed: FillInBlankOptions

The component's `FillInBlankOptions` structure differs significantly:

**Component version (fill-in-blank.tsx):**
```typescript
blanks: Array<{
  id: string;
  correctAnswer: string;
  acceptableVariants?: string[];
  caseSensitive?: boolean;
}>
```

**Canonical version (types.ts):**
```typescript
blanks: Array<{
  index: number;
  acceptedAnswers: string[];
  caseSensitive: boolean;
}>
```

**Options:**
1. **Update canonical type** to match component usage (id-based, correctAnswer + variants)
2. **Update component** to use canonical type (index-based, acceptedAnswers array)
3. **Create separate UI-specific type** that extends/maps from canonical

**Recommendation:** Option 1 - Update canonical type. The component's structure is more flexible (id-based vs index-based) and the `correctAnswer` + `acceptableVariants` is clearer than a single `acceptedAnswers` array.

### Unified Solution

**Step 1:** Update `src/lib/questions/types.ts` FillInBlankOptions to match component usage:

```typescript
export interface FillInBlankOptions {
  type: 'fill_in_blank';
  blanks: Array<{
    id: string;                    // Changed from index: number
    correctAnswer: string;         // Primary correct answer
    acceptableVariants?: string[]; // Additional accepted answers
    caseSensitive?: boolean;       // Optional, defaults to false
  }>;
}
```

**Step 2:** Remove local interface definitions from each component file and import from canonical:

```typescript
// Before (each component):
export interface MultipleChoiceOptions { ... }

// After:
import type { MultipleChoiceOptions } from '@/lib/questions/types';
```

**Step 3:** Update component logic to handle the `type` discriminator field:
- Components should accept the discriminated union type
- When constructing options, include the `type` field

### Import Changes Summary

| File | Remove | Add Import |
|------|--------|------------|
| `multiple-choice.tsx` | Lines 9-15 (interface) | `import type { MultipleChoiceOptions } from '@/lib/questions/types';` |
| `true-false.tsx` | Lines 7-10 (interface) | `import type { TrueFalseOptions } from '@/lib/questions/types';` |
| `fill-in-blank.tsx` | Lines 10-17 (interface) | `import type { FillInBlankOptions } from '@/lib/questions/types';` |
| `essay.tsx` | Lines 9-14 (interface) | `import type { EssayOptions } from '@/lib/questions/types';` |

---

## Issue 2: Inconsistent String Method Usage

### Problem
Mixed usage of `.replaceAll()` and `.replace(/regex/g, ...)` for the same operation (replacing underscores with spaces in question types).

### Current State

| File | Line | Method Used |
|------|------|-------------|
| `src/components/question-bank/question-list.tsx` | 73 | `.replaceAll('_', ' ')` |
| `src/components/question-bank/question-editor.tsx` | 104 | `.replace(/_/g, ' ')` |
| `src/components/questions/question-editor.tsx` | 299 | `.replace(/_/g, ' ')` |
| `src/components/quiz/quiz-builder.tsx` | 173 | `.replace(/_/g, ' ')` |
| `src/components/quiz/quiz-taker.tsx` | 388 | `.replace(/_/g, ' ')` |
| `src/app/(dashboard)/documents/[id]/quiz/page.tsx` | 88 | `.replace(/_/g, ' ')` |
| `src/app/(dashboard)/documents/[id]/quiz/[quizId]/quiz-detail-client.tsx` | 143, 155, 263 | `.replace(/_/g, ' ')` |

### Unified Solution

**Option A: Use `.replace(/_/g, ' ')` everywhere (RECOMMENDED)**
- More explicit about intent (regex pattern)
- Consistent with existing majority (7 occurrences vs 1)
- Works in all JavaScript environments

**Option B: Use `.replaceAll('_', ' ')` everywhere**
- Cleaner syntax for simple string replacement
- ES2021+ feature (well-supported now)

### Implementation

Create a utility function OR standardize inline:

**Approach 1: Utility function (if used in many places)**
```typescript
// src/lib/utils/format.ts
export function formatEnumLabel(value: string): string {
  return value.replace(/_/g, ' ');
}
```

**Approach 2: Standardize inline (simpler)**
Update `question-list.tsx` line 73:
```typescript
// Before:
{question.questionType.replaceAll('_', ' ')}

// After:
{question.questionType.replace(/_/g, ' ')}
```

**Recommendation:** Approach 2 - just fix the one inconsistent usage. Creating a utility for 8 occurrences adds indirection without significant benefit.

---

## Issue 3: Two QuestionEditor Components with Same Name

### Problem
Two different components both named `QuestionEditor`:

| File | Purpose | Features |
|------|---------|----------|
| `src/components/questions/question-editor.tsx` | Full-featured modal for curated questions | Image upload, options editing by type, LaTeX preview, source evidence |
| `src/components/question-bank/question-editor.tsx` | Simple modal for question bank editing | Basic text fields only, no type-specific editing |

Both are exported, potentially causing import confusion.

### Analysis

```
src/components/question-bank/index.ts:
  export { QuestionEditor } from './question-editor';

src/components/questions/question-editor.tsx:
  export function QuestionEditor (no index.ts barrel export)
```

**Usage search:**
- `question-bank/QuestionEditor` - Used in question bank UI (question-list.tsx)
- `questions/QuestionEditor` - Used in quiz detail client (quiz-detail-client.tsx)

### Unified Solution

**Option A: Rename the simpler one**
```typescript
// src/components/question-bank/question-editor.tsx
export function SimpleQuestionEditor({ ... }) { ... }

// Update index.ts:
export { SimpleQuestionEditor } from './question-editor';
```

**Option B: Rename the full-featured one**
```typescript
// src/components/questions/question-editor.tsx
export function FullQuestionEditor({ ... }) { ... }
```

**Option C: Namespace via barrel exports (no rename)**
```typescript
// Consumers use:
import { QuestionEditor } from '@/components/question-bank';
import { QuestionEditor as CuratedQuestionEditor } from '@/components/questions/question-editor';
```

### Recommendation: Option A

Rename `question-bank/question-editor.tsx` to `BasicQuestionEditor`:
- The question-bank version is simpler (subset of features)
- Fewer import changes needed (only used in question-bank/question-list.tsx)
- Descriptive name: "Basic" vs implicit "Full"

### Implementation Steps

1. **Rename component in file:**
   ```typescript
   // src/components/question-bank/question-editor.tsx
   export function BasicQuestionEditor({ question, onClose }: BasicQuestionEditorProps) {
   ```

2. **Update barrel export:**
   ```typescript
   // src/components/question-bank/index.ts
   export { BasicQuestionEditor } from './question-editor';
   ```

3. **Update consumer:**
   ```typescript
   // src/components/question-bank/question-list.tsx
   import { BasicQuestionEditor } from './question-editor';
   // or via barrel: import { BasicQuestionEditor } from '@/components/question-bank';
   ```

4. **Optionally rename file:**
   `question-editor.tsx` -> `basic-question-editor.tsx`
   (More explicit but requires more changes)

---

## Summary Checklist

- [ ] **Issue 1:** Remove duplicate types from 4 component files, import from `@/lib/questions/types`
  - [ ] Update `FillInBlankOptions` in types.ts to match component usage (DECISION NEEDED)
  - [ ] Update `multiple-choice.tsx`
  - [ ] Update `true-false.tsx`
  - [ ] Update `fill-in-blank.tsx`
  - [ ] Update `essay.tsx`

- [ ] **Issue 2:** Change `.replaceAll('_', ' ')` to `.replace(/_/g, ' ')` in `question-list.tsx` line 73

- [ ] **Issue 3:** Rename `question-bank/QuestionEditor` to `BasicQuestionEditor`
  - [ ] Rename function in `question-editor.tsx`
  - [ ] Update `index.ts` export
  - [ ] Update import in `question-list.tsx`

---

## Files Modified (Complete List)

| File | Changes |
|------|---------|
| `src/lib/questions/types.ts` | Update FillInBlankOptions structure |
| `src/components/questions/types/multiple-choice.tsx` | Remove interface, add import |
| `src/components/questions/types/true-false.tsx` | Remove interface, add import |
| `src/components/questions/types/fill-in-blank.tsx` | Remove interface, add import |
| `src/components/questions/types/essay.tsx` | Remove interface, add import |
| `src/components/question-bank/question-editor.tsx` | Rename to BasicQuestionEditor |
| `src/components/question-bank/question-list.tsx` | Fix replaceAll, update import |
| `src/components/question-bank/index.ts` | Update export name |
