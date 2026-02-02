---
phase: quick-023
plan: 01
subsystem: ai-curation
tags: [validation, zod, ai-pipeline, format-checking]
dependency-graph:
  requires: [quick-018]
  provides: [question-format-validation]
  affects: [ai-curation-pipeline]
tech-stack:
  added: []
  patterns: [multi-layer-validation, zod-refinements, post-generation-filtering]
file-tracking:
  key-files:
    created:
      - prisma/scripts/delete-bad-questions.ts
    modified:
      - src/lib/ai/schemas/question-generation.ts
      - src/lib/ai/curate-questions.ts
      - src/lib/ai/prompts/pass4-self-evaluation.ts
decisions:
  - key: dual-schema-pattern
    choice: "Separate CuratedQuestionSchema (loose) and ValidatedQuestionSchema (strict)"
    reason: "AI generation needs loose schema; validation happens post-generation"
  - key: filter-before-pass4
    choice: "Filter malformed questions after Pass 3, before Pass 4 evaluation"
    reason: "No point evaluating questions with format violations"
  - key: anti-pattern-list
    choice: "Maintain list of T/F anti-patterns (comparison, preference, opinion)"
    reason: "These indicate wrong question type, not fixable T/F questions"
metrics:
  duration: 8 minutes
  completed: 2026-02-01
---

# Quick-023: Question Format Validation Summary

**One-liner:** 3-layer format validation prevents malformed questions (fill-in-blank without ___ markers, T/F comparison questions) from reaching students.

## What Was Done

### Task 1: Zod Schema Refinements + Format Validation Filter

**Files Modified:**
- `src/lib/ai/schemas/question-generation.ts` - Added ValidatedQuestionSchema with refinements
- `src/lib/ai/curate-questions.ts` - Added validateQuestionFormat() and filterValidQuestions()

**Changes:**
1. Created `ValidatedQuestionSchema` with three refinements:
   - fill_in_blank: questionText must contain `___` or `[BLANK]`
   - true_false: correctAnswer must be "True" or "False" (case insensitive)
   - true_false: questionText must NOT contain comparison anti-patterns

2. Added `validateQuestionFormat()` for runtime validation without Zod overhead

3. Added `filterValidQuestions()` that:
   - Filters questions with format violations
   - Logs rejected questions with reasons for debugging
   - Tracks rejection counts by type

4. Updated `runPass3QuestionGeneration()` to:
   - Call filterValidQuestions() on AI output
   - Recalculate typeDistribution after filtering
   - Log warning if questions were filtered

**Commit:** b95ad34

### Task 2: Pass 4 Format Compliance Criterion

**Files Modified:**
- `src/lib/ai/prompts/pass4-self-evaluation.ts`

**Changes:**
1. Added 5th evaluation criterion "Format Compliance (1-5)" with scoring rubric
2. Documented format requirements for all 7 question types
3. Added concrete examples of correct/incorrect formats
4. Updated output section to reference 5 criteria

**Commit:** d239ab1

### Task 3: Delete Bad Questions from Database

**Files Created:**
- `prisma/scripts/delete-bad-questions.ts`

**Changes:**
1. Created one-time script using pg Pool (matching existing scripts)
2. Deleted 3 malformed questions:
   - `cmkttd7pa0004swcehesfrmsn`: T/F comparison question ("Which is better...")
   - `cmkttd7pa0005swcefpq0y4we`: fill_in_blank without marker
   - `cmkttd7pa0007swceju7ag4ds`: fill_in_blank without marker
3. Script preserved for documentation of historical cleanup

**Commit:** 545bd84

## Validation Layers

The 3-layer validation architecture:

```
Layer 1: ValidatedQuestionSchema (Zod refinements)
  - Compile-time type checking
  - Parse-time validation for post-generation use

Layer 2: filterValidQuestions() (Runtime filter)
  - Applied after Pass 3 generation
  - Removes malformed questions before Pass 4
  - Logs rejections for debugging

Layer 3: Pass 4 Format Compliance (AI evaluation)
  - AI scores format compliance 1-5
  - Low scores trigger suggested rewrites
  - Discard recommendation for format violations
```

## Anti-Patterns Detected

True/False questions are rejected if questionText contains:
- "which is better"
- "which one"
- "compare"
- "prefer"
- "would you rather"
- "what is your"
- "which do you"
- "opinion"
- "favorite"

## Verification

- TypeScript: 0 errors
- Linting: Clean
- Tests: 74/74 passing
- Database: 3 bad questions deleted

## Deviations from Plan

None - plan executed exactly as written.
