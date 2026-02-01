# Quick Task 010: PR #2 - 47 Issue Fix Plan

**Source:** `.planning/quick/009-review-pr-2-comprehensive/009-SUMMARY.md`
**Created:** 2026-01-30
**Method:** 12 parallel gsd-planner agents with Context7 best practices verification

---

## Execution Waves (Dependency-Ordered)

### Wave 1: Critical Security & Error Handling (MUST FIX BEFORE MERGE)

| Task | File | Issue | Plan File |
|------|------|-------|-----------|
| 1.1 | `src/lib/storage/images.ts` | Add filename extension validation | security-fixes.md |
| 1.2 | `src/lib/storage/images.ts:62` | Fix path traversal (remove `..` pattern) | security-fixes.md |
| 1.3 | `src/actions/quiz.ts:172-175` | Don't hide DB errors as "not_found" | error-handling-fixes.md |
| 1.4 | `src/app/api/upload/image/route.ts:35` | Add logging to catch block | error-handling-fixes.md |

**Checkpoint:** Run `npm run typecheck && npm run test:run`

### Wave 2: Database Indexes (Schema Migration)

| Task | File | Issue | Plan File |
|------|------|-------|-----------|
| 2.1 | `prisma/schema.prisma` | Add `@@index([questionId])` to QuestionAnswer | performance-fixes.md |
| 2.2 | `prisma/schema.prisma` | Add `@@index([documentId, teacherSelected])` to CuratedQuestion | performance-fixes.md |
| 2.3 | `prisma/schema.prisma` | Add `@@index([publishedAt])` to Quiz | database-fixes.md |

**Checkpoint:** `npx prisma migrate dev --name add_pr2_indexes`

### Wave 3: Performance (N+1 Queries)

| Task | File | Issue | Plan File |
|------|------|-------|-----------|
| 3.1 | `src/actions/attempts.ts:88-100` | Fix over-fetch in submitAnswer() | performance-fixes.md |
| 3.2 | `src/app/api/documents/.../curate/route.ts` | Batch question updates | performance-fixes.md |

**Checkpoint:** Run affected server actions manually

### Wave 4: Type Safety

| Task | File | Issue | Plan File |
|------|------|-------|-----------|
| 4.1 | `src/components/quiz/quiz-taker.tsx:114` | Replace `as any` canvas cast with type guard | type-safety-fixes.md |
| 4.2 | `src/actions/quiz.ts` | Add Zod validation for FormData JSON | type-safety-fixes.md |
| 4.3 | `src/lib/questions/grading.ts` | Validate database JSON before grading | type-safety-fixes.md |

**Checkpoint:** `npm run typecheck`

### Wave 5: Accessibility

| Task | File | Issue | Plan File |
|------|------|-------|-----------|
| 5.1 | `src/components/questions/types/matching.tsx` | Add ARIA labels to drag-and-drop | accessibility-fixes.md |
| 5.2 | `src/components/quiz/quiz-progress.tsx` | Add progressbar role/attributes | accessibility-fixes.md |
| 5.3 | Various form components | Fix label associations | accessibility-fixes.md |

**Checkpoint:** Manual screen reader test OR axe-core audit

### Wave 6: Error Handling (Non-Critical)

| Task | File | Issue | Plan File |
|------|------|-------|-----------|
| 6.1 | `src/app/(dashboard)/question-bank/page.tsx` | Don't silently return empty array | error-handling-fixes.md |
| 6.2 | `src/components/quiz/quiz-taker.tsx` | Track failed answer saves | error-handling-fixes.md |
| 6.3 | `src/actions/questions.ts` | Include Zod validation details in errors | error-handling-fixes.md |

### Wave 7: React Patterns

| Task | File | Issue | Plan File |
|------|------|-------|-----------|
| 7.1 | `src/components/questions/types/matching.tsx` | Fix stale closure in useEffect | react-patterns-fixes.md |
| 7.2 | Various components | Fix useCallback dependencies | react-patterns-fixes.md |
| 7.3 | `src/components/questions/image-upload.tsx` | Add FileReader cleanup | react-patterns-fixes.md |

### Wave 8: Code Quality & Simplification

| Task | File | Issue | Plan File |
|------|------|-------|-----------|
| 8.1 | Various | Deduplicate type definitions | code-quality-fixes.md |
| 8.2 | Various | Standardize string methods | code-quality-fixes.md |
| 8.3 | Various server actions | Create shared auth utility | simplification-fixes.md |
| 8.4 | Various | Simplify error result patterns | simplification-fixes.md |

### Wave 9: API Design

| Task | File | Issue | Plan File |
|------|------|-------|-----------|
| 9.1 | Various server actions | Standardize result type patterns | api-design-fixes.md |
| 9.2 | Various | Add CUID validation on ID parameters | api-design-fixes.md |
| 9.3 | `src/actions/attempts.ts` | Add Zod validation on answerData | api-design-fixes.md |

### Wave 10: Documentation (Backlog)

| Task | File | Issue | Plan File |
|------|------|-------|-----------|
| 10.1 | `src/lib/questions/types.ts` | Clarify CANONICAL vs QUESTION_TYPES | documentation-fixes.md |
| 10.2 | Various | Add JSDoc to type guards | documentation-fixes.md |

### Wave 11: Test Coverage (Backlog)

| Task | File | Issue | Plan File |
|------|------|-------|-----------|
| 11.1 | `src/actions/__tests__/` | Add server action unit tests | test-coverage-fixes.md |
| 11.2 | `src/lib/questions/__tests__/grading.test.ts` | Add edge case tests | test-coverage-fixes.md |

---

## Summary

| Priority | Count | Waves |
|----------|-------|-------|
| Critical | 5 | Wave 1-2 |
| High | 18 | Wave 3-6 |
| Medium | 24 | Wave 7-11 |
| **Total** | **47** | 11 waves |

---

## Detailed Plans by Category

Each category has a detailed plan file with:
- Exact code locations and line numbers
- Current problematic code
- Fixed code with Context7-verified best practices
- Verification steps

| Category | File | Issues |
|----------|------|--------|
| Security | `security-fixes.md` | 4 |
| Error Handling | `error-handling-fixes.md` | 6 |
| Performance | `performance-fixes.md` | 6 |
| Type Safety | `type-safety-fixes.md` | 3 |
| Accessibility | `accessibility-fixes.md` | 4 |
| React Patterns | `react-patterns-fixes.md` | 5 |
| Code Quality | `code-quality-fixes.md` | 3 |
| Database | `database-fixes.md` | 3 |
| API Design | `api-design-fixes.md` | 3 |
| Simplification | `simplification-fixes.md` | 5 |
| Documentation | `documentation-fixes.md` | 4 |
| Test Coverage | `test-coverage-fixes.md` | 2 |

---

## Context7 Best Practices Applied

### Next.js Server Actions
- Use Zod for input validation at boundaries
- Return early with meaningful error messages
- Log errors server-side before returning sanitized messages

### Prisma
- Add indexes for foreign keys and frequently filtered columns
- Use include instead of nested queries to avoid N+1
- Use transactions for multi-step operations

### React
- Wrap callbacks in useCallback with correct dependencies
- Clean up side effects in useEffect
- Use type guards for runtime validation of external data
