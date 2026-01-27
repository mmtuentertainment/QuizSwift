---
quick: 004
subsystem: error-handling
tags: [silent-failures, try-catch, prisma, server-actions]

# Dependency graph
requires:
  - quick: 003
    provides: CodeRabbit PR #2 fixes round 1+2
provides:
  - Consistent error handling across all server actions
  - Graceful database failure recovery
  - User-friendly error messages instead of crashes
affects: [server-actions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Try-catch wrapper for all Prisma queries in server actions
    - handlePrismaError for consistent error transformation

key-files:
  modified:
    - src/actions/questions.ts
    - src/actions/attempts.ts
    - src/actions/quiz.ts

key-decisions:
  - "Wrap all Prisma queries in try-catch for graceful failure handling"
  - "Use handlePrismaError for consistent error messages"
  - "Return success: false with error message instead of throwing"

patterns-established:
  - All server action Prisma queries wrapped in try-catch
  - Consistent error result shape: { success: false, error: string }

# Metrics
duration: 15min
completed: 2026-01-27
---

# Quick 004: Fix PR #2 Silent Failure Issues

**Fixed 5 blocking silent failure issues - unhandled Prisma queries in server actions**

## Performance

- **Duration:** ~15 min
- **Tasks:** 5
- **Files modified:** 3

## Accomplishments

- Added try-catch error handling to 6 server action functions
- Prevents app crashes from database connection/query failures
- Provides user-friendly error messages instead of generic 500 errors

## Changes Made

### src/actions/questions.ts
1. **getQuestions**: Wrapped `Promise.all` in try-catch
2. **getTeacherDocuments**: Wrapped `findMany` in try-catch
3. **getQuestionForEdit**: Wrapped `fetchQuestionForEdit` in try-catch

### src/actions/attempts.ts
4. **getAttemptWithAnswers**: Wrapped `findUnique` in try-catch

### src/actions/quiz.ts
5. **getQuizzesForDocument**: Wrapped `fetchQuizzesForDocument` in try-catch
6. **getQuizWithQuestions**: Wrapped `fetchQuizWithQuestions` in try-catch

## Decisions Made

**1. Use handlePrismaError consistently**
- **Rationale:** Already established pattern in other server actions (startAttempt, submitAnswer, etc.)
- **Benefit:** Consistent error messages and logging across all database operations

**2. Return 'not_found' for getQuizWithQuestions database errors**
- **Rationale:** The function has a typed union return type that only allows specific error strings
- **Benefit:** Avoids leaking internal error details while maintaining type safety

## Issues Resolved

| Issue | Location | Fix |
|-------|----------|-----|
| Unhandled Promise.all | questions.ts:102 | try-catch wrapper |
| Unhandled findMany | questions.ts:138 | try-catch wrapper |
| Unhandled fetchQuestionForEdit | questions.ts:344 | try-catch wrapper |
| Unhandled findUnique | attempts.ts:268 | try-catch wrapper |
| Unhandled fetchQuizzesForDocument | quiz.ts:124 | try-catch wrapper |
| Unhandled fetchQuizWithQuestions | quiz.ts:155 | try-catch wrapper |

## Deviations from Plan

None - all 5 issues fixed as planned.

---
*Quick Task: 004*
*Completed: 2026-01-27*
