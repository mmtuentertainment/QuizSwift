# Quick Task 011: Execute Waves 1-2 (Critical Security + Indexes)

**Source:** `.planning/quick/010-fix-pr2-47-issues-plan/PLAN.md`
**Created:** 2026-01-30
**Mode:** Execution of pre-planned fixes

---

## Wave 1: Critical Security & Error Handling

### Task 1.1: Add Filename Extension Validation
**File:** `src/lib/storage/images.ts`
**Fix:** Call `isValidImageExtension()` in `getImageUploadUrl()` after content type check

### Task 1.2: Fix Path Traversal Vulnerability
**File:** `src/lib/storage/images.ts`
**Fix:** Add `sanitizeFileName()` helper that removes `..` patterns and path separators

### Task 1.3: Fix Silenced Database Errors
**File:** `src/actions/quiz.ts:172-175`
**Fix:** Log error and return `'database_error'` instead of `'not_found'`

### Task 1.4: Add Logging to Catch Block
**File:** `src/app/api/upload/image/route.ts`
**Status:** Already fixed per error-handling-fixes.md - verify only

---

## Wave 2: Database Indexes

### Task 2.1: Add QuestionAnswer.questionId Index
**File:** `prisma/schema.prisma`
**Fix:** Add `@@index([questionId])` to QuestionAnswer model

### Task 2.2: Add CuratedQuestion Composite Index
**File:** `prisma/schema.prisma`
**Fix:** Add `@@index([documentId, teacherSelected])` to CuratedQuestion model

### Task 2.3: Add Quiz.publishedAt Index
**File:** `prisma/schema.prisma`
**Fix:** Add `@@index([publishedAt])` to Quiz model

---

## Verification

After all changes:
```bash
npm run typecheck
npm run test:run
npx prisma migrate dev --name add_pr2_critical_fixes
```

---

## Commits

- Commit after Wave 1: `fix(security): add filename validation and path traversal protection`
- Commit after Wave 2: `fix(db): add missing performance indexes`
