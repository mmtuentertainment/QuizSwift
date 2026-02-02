# Quick Task 025: PR7 CodeRabbit Fixes

**Mode:** quick
**Created:** 2026-02-01
**Branch:** feat/pr7-manual-testing-polish

## Description

Fix CodeRabbit review issues from PR #7:

1. **transformToMultipleChoice bug** - Function can mark multiple choices correct because each option independently tests correctAnswer. Need to compute single correctIndex once.

2. **normalizeQuestionOptions null handling** - When normalization returns null for unrecognized question type, warn explicitly rather than silently proceeding.

3. **Odd-length matching arrays** - When options array has odd length, document behavior and log warning.

## Tasks

### Task 1: Fix transformToMultipleChoice single-correct guarantee
- **File:** `src/lib/questions/normalize.ts` (lines 112-143)
- **Issue:** Each choice independently tests `isCorrect = correctAnswer ? id === correctAnswer || textStr === correctAnswer...`, so multiple choices could match
- **Fix:** Compute `correctIndex` once using `findIndex` with priority order, then map choices with `isCorrect = (index === correctIndex)`

### Task 2: Add normalization failure warning
- **File:** `src/actions/questions.ts` (lines 254-283)
- **Issue:** When `normalizeQuestionOptions` returns null, code silently proceeds without updating options
- **Fix:** Add console.warn when options were provided but couldn't be normalized

### Task 3: Add odd-length matching warning
- **File:** `src/lib/questions/normalize.ts` (lines 206-222)
- **Issue:** Odd-length arrays use same value for left and right in last pair without documentation
- **Fix:** Add docstring explaining behavior and console.warn for odd-length arrays

## Verification

- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] All 102 tests pass
