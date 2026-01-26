---
phase: 03-question-bank-teacher-workflow
plan: 01
subsystem: database
tags: [prisma, typescript, zod, quiz, workflow]

# Dependency graph
requires:
  - phase: 02.1-intelligent-question-curation
    provides: CuratedQuestion model for question storage
provides:
  - Quiz model with teacher workflow (status, teacherPreviewedAt)
  - QuizQuestion junction with ordering and points
  - QuizAttempt for student progress tracking
  - QuestionAnswer for typed answer storage
  - TypeScript discriminated union types for 6 question types
  - Zod validation schemas for question options and answers
affects: [03-02-quiz-creation, 03-03-teacher-preview, 04-quiz-delivery]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated unions with 'type' field for runtime type checking"
    - "Zod schemas with .refine() for complex validation"
    - "Legacy aliases for backward compatibility during refactor"

key-files:
  created:
    - src/lib/questions/validation.ts
  modified:
    - prisma/schema.prisma
    - src/lib/questions/types.ts

key-decisions:
  - "Tasks 1 & 2 combined due to Prisma relational validation requirement"
  - "Added legacy type aliases for Phase 2.1 component backward compatibility"
  - "Used discriminated union base schema without refinement for z.discriminatedUnion"

patterns-established:
  - "QuizQuestion junction: Links Quiz to CuratedQuestion with position/points"
  - "Answer storage: QuestionAnswer.answerData JSON typed per question type"
  - "Teacher workflow: status field (draft->preview_required->published->archived)"

# Metrics
duration: 8min
completed: 2026-01-26
---

# Phase 3 Plan 01: Quiz Workflow Models Summary

**Prisma Quiz/QuizQuestion/QuizAttempt/QuestionAnswer models with TypeScript discriminated unions and Zod validation for 6 question types**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-26T17:00:00Z
- **Completed:** 2026-01-26T17:08:00Z
- **Tasks:** 3 (combined into 2 commits due to Prisma dependency)
- **Files modified:** 3

## Accomplishments
- Quiz model with full teacher workflow fields (status, teacherPreviewedAt for CONT-06)
- QuizQuestion junction table linking quizzes to CuratedQuestion with position and points
- QuizAttempt and QuestionAnswer models for student quiz-taking
- TypeScript discriminated union types for all 6 question types (multiple_choice, true_false, fill_in_blank, matching, essay, show_work)
- Zod validation schemas for all question options and answer formats
- Type guards for runtime type checking

## Task Commits

Each task was committed atomically:

1. **Tasks 1 & 2: Add Quiz workflow models** - `317095e` (feat)
   - Combined due to Prisma relational validation requiring all models to exist together
2. **Task 3: TypeScript types and Zod schemas** - `153415d` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Quiz, QuizQuestion, QuizAttempt, QuestionAnswer models with all relations and indexes
- `src/lib/questions/types.ts` - Discriminated union types for question options and answer data
- `src/lib/questions/validation.ts` - Zod schemas for runtime validation

## Decisions Made
- **Tasks 1 & 2 combined:** Prisma schema validation requires all related models to exist before validation passes. Forward references to QuizAttempt/QuestionAnswer would fail validation without the models present.
- **Legacy type aliases:** Added backward-compatible type exports (MultipleChoiceAnswer, ShortAnswerOptions, etc.) so existing Phase 2.1 components continue to compile. These will be removed when components are updated in Phase 4.
- **Discriminated union base schema:** Used base ZodObject without .refine() in z.discriminatedUnion because ZodEffects (from .refine) are not compatible with discriminatedUnion. The refinement schema is exported separately for standalone validation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Legacy type aliases for backward compatibility**
- **Found during:** Task 3 (TypeScript compilation)
- **Issue:** Updating types.ts broke existing components that imported old type names (MultipleChoiceAnswer, ShortAnswerOptions, etc.)
- **Fix:** Added legacy type aliases with @deprecated tags to maintain backward compatibility
- **Files modified:** src/lib/questions/types.ts
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** 153415d (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for maintaining working codebase. No scope creep.

## Issues Encountered
- Prisma schema validation requires all related models to exist simultaneously - Tasks 1 & 2 could not be committed separately due to forward references

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Database models ready for quiz creation API (03-02)
- TypeScript types ready for form validation
- Zod schemas ready for API request validation
- Teacher workflow foundation in place (CONT-06 teacherPreviewedAt field)

---
*Phase: 03-question-bank-teacher-workflow*
*Completed: 2026-01-26*
