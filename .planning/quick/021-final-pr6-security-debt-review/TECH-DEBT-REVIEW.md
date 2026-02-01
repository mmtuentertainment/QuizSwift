# Tech Debt Review: PR #6

**PR Title:** feat: Phase 3 Tech Debt (3.1 + 3.2) and Quick Fixes
**Files Changed:** 91 files
**Lines Added:** 13,378
**Lines Deleted:** 367

## Summary

PR #6 represents a **significant tech debt reduction effort** that successfully established:

1. **Strong type safety** through discriminated unions and comprehensive type guards
2. **Consistent validation patterns** using Zod schemas across server actions
3. **Clear separation of concerns** with dual answer type systems (UI vs storage/grading layers)
4. **Well-documented code** with JSDoc comments explaining design decisions
5. **Solid test coverage** for grading logic and type validation

The PR leaves the codebase in good shape, with remaining debt being primarily:
- Tracked deprecations with clear migration paths
- Well-documented TODOs with ticket references
- Minor typing issues in external dependencies (Prisma generated, AI SDK)

---

## Remaining Tech Debt

### High Impact

#### 1. `any` Types in AI Provider Functions (Confidence: 95)

**File:** `C:\Users\matth\Desktop\Fun-with-code\src\lib\ai\providers.ts`
**Lines:** 61, 75

```typescript
export function getExtractionModel(): any {
export function getEmbeddingModel(): any {
```

**Issue:** These functions return `any`, defeating TypeScript's type safety for all downstream consumers. Every call site loses type information.

**Recommendation:**
- Define proper return types based on the Vercel AI SDK interfaces
- Consider `LanguageModel` or `EmbeddingModel` types from the SDK
- Priority: **HIGH** - affects all AI-related code paths

---

#### 2. Legacy Type Aliases Still Exported (Confidence: 88)

**File:** `C:\Users\matth\Desktop\Fun-with-code\src\lib\questions\types.ts`
**Lines:** 494-535

Seven deprecated type aliases remain:
- `MultipleChoiceAnswer` (use `MCAnswer`)
- `ShortAnswerOptions` (use `FillInBlankOptions`)
- `ShortAnswerAnswer` (use `EssayAnswer`)
- `TrueFalseJustifyOptions` (use `TrueFalseOptions`)
- `TrueFalseJustifyAnswer` (use `TFAnswer`)
- `FillBlankOptions` (use `FillInBlankOptions`)
- `QuestionAnswer` (generic type)

**Issue:** While properly marked `@deprecated`, these exports:
1. May still have consumers (needs grep verification)
2. Increase bundle size
3. Create confusion about which types to use

**Tracked:** Yes - `TODO(LEGACY-TYPES)` at line 487
**Recommendation:** Run `grep -r "MultipleChoiceAnswer\|ShortAnswerOptions" src/` and remove if unused

---

### Medium Impact

#### 3. Inconsistent Error Return Patterns (Confidence: 82)

**Files:** Multiple server actions

The codebase uses three different error return patterns:

**Pattern A** (quiz.ts):
```typescript
return { success: false, error: 'message' };
```

**Pattern B** (attempts.ts):
```typescript
return { error: 'message' };
```

**Pattern C** (quiz.ts - GetQuizWithQuestionsResult):
```typescript
return { success: false, error: 'not_found' };  // Enum-like errors
```

**Recommendation:** Standardize on Pattern A (`ActionResult`) from `action-utils.ts`, which is already defined but not universally adopted.

---

#### 4. Duplicate Validation Constants (Confidence: 85)

**File:** `C:\Users\matth\Desktop\Fun-with-code\src\actions\__tests__\quiz.test.ts`
**Lines:** 18-22

```typescript
// Duplicate ShowResultsOption enum definition to match production enum
enum ShowResultsOption {
  immediately = 'immediately',
  after_due_date = 'after_due_date',
  never = 'never',
}
```

**Issue:** The test file recreates enums/schemas because the actual server action files have server-only dependencies. This creates maintenance burden - if the production enum changes, tests may not catch it.

**Recommendation:** Consider creating a shared validation schema file that doesn't have server-only deps, or use dependency injection patterns for tests.

---

#### 5. Quiz Timer Not Implemented (Confidence: 90)

**Files:**
- `C:\Users\matth\Desktop\Fun-with-code\src\components\quiz\quiz-taker.tsx:29`
- `C:\Users\matth\Desktop\Fun-with-code\src\app\(dashboard)\documents\[id]\quiz\[quizId]\preview\actions.tsx:20`
- `C:\Users\matth\Desktop\Fun-with-code\src\app\(dashboard)\documents\[id]\quiz\[quizId]\preview\page.tsx:111`

```typescript
// TODO(QUIZ-TIMER): Add timeLimit prop when implementing quiz timer
```

**Issue:** The `timeLimit` field exists in the schema and can be set in quiz builder, but:
1. Timer countdown UI not implemented
2. Server-side enforcement not implemented
3. Students can take unlimited time on timed quizzes

**Tracked:** Yes - properly documented with ticket reference
**Recommendation:** Prioritize before any student-facing deployment

---

#### 6. Missing Sentry/Error Tracking Integration (Confidence: 85)

**File:** `C:\Users\matth\Desktop\Fun-with-code\src\actions\quiz.ts:197`

```typescript
// TODO(ERROR-TRACKING): Consider Sentry integration for production error tracking
```

**Issue:** Currently using `console.error` for server-side errors. In production:
1. Errors may be lost in server logs
2. No alerting on error rate spikes
3. No error grouping/deduplication

**Recommendation:** Add Sentry before production deployment

---

### Low Impact

#### 7. Validation Schema Duplication in Tests (Confidence: 80)

**File:** `C:\Users\matth\Desktop\Fun-with-code\src\actions\__tests__\quiz.test.ts:83-89`

The `UpdateQuizSettingsSchema` is recreated in tests rather than imported. While documented, this could lead to drift.

---

#### 8. `canvasState: unknown` Type (Confidence: 75)

**File:** `C:\Users\matth\Desktop\Fun-with-code\src\lib\questions\types.ts:187`

```typescript
canvasState: unknown;
```

**Issue:** The tldraw canvas state is typed as `unknown`. While this is intentional (documented for JSON persistence), it means all consumers must cast/validate.

**Mitigated:** `isValidCanvasState()` type guard exists (line 414-434)

---

#### 9. Two Similar QuestionEditor Components (Confidence: 70)

**Files:**
- `C:\Users\matth\Desktop\Fun-with-code\src\components\question-bank\question-editor.tsx` (BasicQuestionEditor)
- `C:\Users\matth\Desktop\Fun-with-code\src\components\quiz\question-editor.tsx` (referenced in comments)

**Issue:** Two editor components exist with different capabilities. The "basic" one handles text/answer/explanation, while another handles full question types.

**Mitigated:** Naming (`BasicQuestionEditor`) and JSDoc distinguish them
**Recommendation:** Consider consolidating into a single editor with modes

---

## Debt Reduced by This PR

### Excellent Work

1. **Type System Overhaul**
   - Created discriminated unions for `QuestionOptions` (7 types) and `AnswerData` (6 types)
   - Added 12+ type guards (`isMultipleChoiceOptions`, `isMCAnswer`, etc.)
   - Clear documentation of dual type system (UI vs storage layer)

2. **Validation Layer**
   - Comprehensive Zod schemas for all question/answer types
   - `parseQuestionOptions()` and `parseAnswerData()` helpers
   - CUID validation on all server action ID parameters

3. **Normalization**
   - `normalizeQuestionType()` for legacy alias handling
   - `CANONICAL_QUESTION_TYPES` vs `QUESTION_TYPES` with clear docs

4. **Test Coverage**
   - 400+ lines of grading tests covering edge cases
   - Type validation tests for all scenarios
   - CUID validation pattern tests

5. **Documentation**
   - JSDoc on all public functions
   - Clear architecture comments (dual type system explanation)
   - TODO comments with ticket references

6. **Error Handling**
   - `handlePrismaError()` utility used consistently
   - Early CUID rejection pattern (documented in tests)
   - Graceful degradation with `parseQuestionOptions` returning null

---

## Recommendations

### Priority Order for Addressing Remaining Debt

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | Type AI provider return values | Low | High |
| 2 | Implement quiz timer | Medium | High |
| 3 | Add error tracking (Sentry) | Medium | High |
| 4 | Remove deprecated type aliases | Low | Medium |
| 5 | Standardize error return patterns | Medium | Medium |
| 6 | Consolidate question editors | Medium | Low |

### Quick Wins (< 1 hour each)

1. Add return types to `getExtractionModel()` and `getEmbeddingModel()`
2. Grep for deprecated type usage and remove if unused
3. Document the ActionResult pattern in CLAUDE.md

---

## Metrics

| Metric | Value |
|--------|-------|
| Files reviewed | 14 |
| Issues found | 9 |
| Severity breakdown | 2 high, 4 medium, 3 low |
| Well-documented TODOs | 5 |
| Deprecated exports (tracked) | 7 |
| Test files reviewed | 3 |
| Type guard functions | 12 |
| Zod validation schemas | 15+ |

---

## Conclusion

PR #6 successfully achieved its tech debt reduction goals. The codebase has strong typing, consistent validation, and clear documentation. Remaining debt is well-tracked and prioritized. The most critical items are:

1. **Type safety hole** in AI providers (returns `any`)
2. **Missing quiz timer** feature (schema exists but not enforced)
3. **Error tracking** for production readiness

These should be addressed before student-facing deployment.
