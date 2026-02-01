# PR #2 Comprehensive Review Summary

**PR:** Phase 3 - Question Bank & Teacher Workflow
**Files:** 88 changed, 17,925 additions
**Review Date:** 2026-01-30
**Method:** 12 parallel specialized review agents

---

## Executive Summary

PR #2 implements a substantial feature set with generally high code quality. The review identified **47 total issues** across 12 review dimensions, with **5 Critical**, **18 High/Important**, and **24 Medium** priority items.

### Overall Quality Rating: **B+ (Good with Notable Improvements Needed)**

---

## Critical Issues (Must Fix Before Merge)

### 1. Security: Missing Filename Extension Validation
**File:** `src/lib/storage/images.ts`
**Issue:** Image upload validates MIME type but not file extension. Attackers could upload `malicious.html` with spoofed Content-Type.
**Fix:** Call existing `isValidImageExtension()` function during upload flow.

### 2. Security: Path Traversal Vulnerability
**File:** `src/lib/storage/images.ts:62`
**Issue:** Filename sanitization allows `..` pattern which could create unexpected paths.
**Fix:** Add `.replace(/\.\./g, '_')` to sanitization regex.

### 3. Error Handling: Silenced Database Errors
**File:** `src/actions/quiz.ts:172-175`
**Issue:** Catch block returns 'not_found' for ALL errors, hiding database connectivity issues.
**Fix:** Log errors and differentiate between "not found" and "system error".

### 4. Error Handling: Empty Catch Block
**File:** `src/app/api/upload/image/route.ts:35-36`
**Issue:** JSON parse errors are completely swallowed with no logging.
**Fix:** Add `console.error` for debugging.

### 5. Performance: Missing Database Index
**File:** `prisma/schema.prisma`
**Issue:** `QuestionAnswer.questionId` lacks index, causing O(n) scans.
**Fix:** Add `@@index([questionId])` to QuestionAnswer model.

---

## High Priority Issues by Category

### Security (2)
- Missing rate limiting on image upload endpoint
- IDOR risk in quiz attempt (needs role-based access for future students)

### Performance (3)
- N+1 query in `submitAnswer()` - over-fetches with nested includes
- N+1 query in curate route - updates questions one-by-one in loop
- Missing composite index on `CuratedQuestion(documentId, teacherSelected)`

### Error Handling (4)
- Silent fallback to empty arrays on question bank page errors
- Failed answer saves not persistently tracked in QuizTaker
- Generic "Database operation failed" messages without context
- Question update errors don't include Zod validation details

### Type Safety (3)
- `as any` cast for canvas state in QuizTaker (line 114)
- Unsafe JSON.parse cast from FormData in createQuiz
- Missing Zod validation on database JSON before grading

### Test Coverage (2)
- No tests for server actions (quiz.ts, attempts.ts, questions.ts)
- Missing edge case tests for empty arrays in grading

### Accessibility (3)
- Matching component lacks ARIA labels for drag-and-drop
- Quiz progress bar missing progressbar role/attributes
- Form inputs missing proper label associations

---

## Medium Priority Issues

### Code Quality (3)
- Duplicate type definitions in component files vs lib/types
- Inconsistent string method usage (.replaceAll vs .replace regex)
- Two different QuestionEditor components with same name

### React Patterns (4)
- Potential stale closure in Matching useEffect
- useCallback dependency includes object reference
- Missing FileReader cleanup in ImageUpload
- useOptimistic revert behavior misunderstood in comments

### Database (2)
- Missing index on Quiz.publishedAt
- QuizAttempt unique constraint may be too restrictive for retakes

### API Design (3)
- Inconsistent result type patterns (success flag vs data/error)
- Missing CUID validation on direct ID parameters
- submitAnswer lacks Zod validation on answerData

### Simplification (5)
- Repeated auth check pattern could use shared utility
- Verbose updateData building could use Object.fromEntries
- Nested ternary for image URL resolution
- Repeated error result pattern across actions
- Switch cases could be simplified with type grouping

### Documentation (3)
- CANONICAL_QUESTION_TYPES vs QUESTION_TYPES terminology confusion
- Missing JSDoc for type guard functions
- Stale "Phase 4" removal comments without tracking

---

## Positive Findings

### Security
- Excellent XSS prevention with DOMPurify for LaTeX
- Consistent authorization checks in all server actions
- Proper Zod validation at API boundaries

### Code Quality
- Strong TypeScript with discriminated unions
- Well-organized file structure
- Consistent naming conventions

### Performance
- Proper use of Prisma includes for related data
- Race condition prevention with upsert
- Good pagination input validation

### Accessibility
- Proper ARIA roles on radio buttons
- Keyboard support via dnd-kit
- Focus visible states on interactive elements

### Testing
- Thorough grading tests with edge cases
- Good Zod schema validation tests

---

## Recommended Fix Priority

### Before Merge (Critical)
1. Add filename extension validation in image upload
2. Fix path traversal in filename sanitization
3. Add error logging in JSON parse catch block
4. Add `@@index([questionId])` to QuestionAnswer

### First Follow-up PR
1. Rate limiting on image upload
2. Batch N+1 queries in curate route
3. Add ARIA labels to Matching component
4. Fix silent error handling in question bank page

### Technical Debt (Track in Backlog)
1. Server action unit tests
2. Shared auth utility
3. Type guard JSDoc
4. Composite database indexes

---

## Metrics

| Category       | Critical | High   | Medium | Total  |
| -------------- | -------- | ------ | ------ | ------ |
| Security       | 2        | 2      | 0      | 4      |
| Error Handling | 2        | 4      | 0      | 6      |
| Performance    | 1        | 3      | 2      | 6      |
| Type Safety    | 0        | 3      | 0      | 3      |
| Test Coverage  | 0        | 2      | 0      | 2      |
| Accessibility  | 0        | 3      | 1      | 4      |
| Code Quality   | 0        | 0      | 3      | 3      |
| React Patterns | 0        | 1      | 4      | 5      |
| Database       | 0        | 0      | 2      | 2      |
| API Design     | 0        | 0      | 3      | 3      |
| Simplification | 0        | 0      | 5      | 5      |
| Documentation  | 0        | 0      | 4      | 4      |
| **Total**      | **5**    | **18** | **24** | **47** |

---

## Review Methodology

12 specialized agents reviewed the PR in parallel:
- Code quality/style, type safety, error handling, test coverage
- Security, performance, accessibility, React patterns
- Database/Prisma, API design, code simplification, documentation

Each agent focused on their specialty area with >=80% confidence threshold for reported issues. Full agent reports available for detailed findings.

---

*Review completed: 2026-01-30*
