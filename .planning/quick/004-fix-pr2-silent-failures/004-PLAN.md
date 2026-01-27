---
quick: 004
subsystem: error-handling
tags: [silent-failures, try-catch, prisma, server-actions]
---

# Quick 004: Fix PR #2 Silent Failure Issues

**Description:** Fix 5 blocking silent failure issues identified by PR review - unhandled Prisma queries in server actions that could crash without user feedback.

## Issues to Fix

1. **getQuestions** (`src/actions/questions.ts`): Unhandled `Promise.all` for fetching questions and count
2. **getTeacherDocuments** (`src/actions/questions.ts`): Unhandled Prisma query for document list
3. **getQuestionForEdit** (`src/actions/questions.ts`): Unhandled Prisma query for single question fetch
4. **getAttemptWithAnswers** (`src/actions/attempts.ts`): Unhandled Prisma query for quiz attempt
5. **getQuizzesForDocument & getQuizWithQuestions** (`src/actions/quiz.ts`): Unhandled Prisma queries

## Fix Pattern

Wrap each Prisma query in try-catch and use `handlePrismaError` for consistent error handling:

```typescript
try {
  const data = await prisma.model.findMany({ /* query */ });
  return { success: true, data };
} catch (error) {
  return { success: false, error: handlePrismaError(error) };
}
```

## Tasks

1. Add try-catch to `getQuestions` around Promise.all
2. Add try-catch to `getTeacherDocuments` around findMany
3. Add try-catch to `getQuestionForEdit` around fetchQuestionForEdit
4. Add try-catch to `getAttemptWithAnswers` around findUnique
5. Add try-catch to `getQuizzesForDocument` and `getQuizWithQuestions`
