# Quick Task 008: Fix Accessibility Labels & Essay Guidelines

**Created:** 2026-01-30
**Status:** Complete

## Description

Fix three CodeRabbit review issues:
1. Add htmlFor/id associations to QuestionEditor form labels for screen reader accessibility
2. Populate essay guidelines in QuestionRenderer (essayConfig was declaring but not using guidelines)
3. Log known Prisma errors (docstring says all errors logged, but known errors weren't)

## Tasks

### Task 1: Add htmlFor/id to QuestionEditor form fields
- [x] Add id="question-text" to question text textarea, htmlFor to label
- [x] Add id="explanation" to explanation textarea, htmlFor to label
- [x] Add id="source-evidence" to source evidence textarea, htmlFor to label
- [x] Add id="image-alt" to image alt text input, htmlFor to label

### Task 2: Populate essay guidelines in QuestionRenderer
- [x] Add guidelines field to EssayOptions interface in types.ts
- [x] Add guidelines field to essayOptionsSchema in validation.ts
- [x] Update essayConfig assignment to include options.guidelines

### Task 3: Log known Prisma errors
- [x] Move console.error inside the known error branch (before return statements)

## Verification

- [x] TypeScript check passes
- [x] All tests pass (43/43)
- [x] Lint check passes
