# Quick Task 011: Execute Waves 1-2 Complete

**Status:** COMPLETE
**Date:** 2026-01-30
**Duration:** ~10 minutes

---

## Wave 1: Critical Security & Error Handling

### Task 1.1: Filename Extension Validation ✓
**File:** `src/lib/storage/images.ts`
- Added `isValidImageExtension()` check in `getImageUploadUrl()`
- Rejects files like `malware.exe` even with spoofed content-type

### Task 1.2: Path Traversal Protection ✓
**File:** `src/lib/storage/images.ts`
- Added `sanitizeFileName()` helper function
- Removes `..` patterns and path separators
- Prevents attacks like `../../../etc/passwd.png`

### Task 1.3: Database Error Handling ✓
**File:** `src/actions/quiz.ts:172-175`
- Changed from returning `'not_found'` for all DB errors
- Now returns `'database_error'` and logs the actual error
- Updated type: `GetQuizWithQuestionsResult` includes `'database_error'`

### Task 1.4: Upload Route Catch Block ✓
**File:** `src/app/api/upload/image/route.ts`
- Already fixed - returns proper error message
- Also added extension validation in route handler

**Commit:** `b189e36`

---

## Wave 2: Database Indexes

### Task 2.1: QuestionAnswer.questionId Index ✓
**File:** `prisma/schema.prisma`
- Added `@@index([questionId])` to QuestionAnswer model
- Prevents full table scans when querying by question

### Task 2.2: CuratedQuestion Composite Index ✓
**File:** `prisma/schema.prisma`
- Added `@@index([documentId, teacherSelected])`
- Optimizes "count selected questions per document" queries

### Task 2.3: Quiz.publishedAt Index ✓
**File:** `prisma/schema.prisma`
- Added `@@index([publishedAt])` to Quiz model
- Optimizes "recently published quizzes" queries

**Commit:** `53a069c`

---

## Verification

- TypeScript: ✓ No errors
- Tests: ✓ 43/43 passing
- Build: Ready for migration

---

## Next Step: Apply Migration

When deploying, run:
```bash
npx prisma migrate dev --name add_pr2_critical_fixes
```

This will create the 3 new indexes in the database.

---

## Remaining Issues (Waves 3-11)

40 more issues to address in future sessions:
- Wave 3: N+1 query fixes (2 tasks)
- Wave 4: Type safety (3 tasks)
- Wave 5: Accessibility (3 tasks)
- Wave 6-11: Medium-priority items

Full plan: `.planning/quick/010-fix-pr2-47-issues-plan/PLAN.md`
