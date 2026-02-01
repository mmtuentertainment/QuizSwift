# Performance Fixes Plan - PR #2 Review Issues

**Category:** Performance (6 issues)
**Priority:** CRITICAL to MEDIUM
**Estimated Impact:** Prevents O(N) queries becoming O(N^2), adds essential database indexes

---

## Issue 1: Missing Index on `QuestionAnswer.questionId`

**Severity:** CRITICAL
**File:** `prisma/schema.prisma`
**Lines:** 305-330 (QuestionAnswer model)

### Problem

The `QuestionAnswer` model has a foreign key `questionId` that references `CuratedQuestion`, but there is no index on this field. Every query that joins or filters on `questionId` will perform a full table scan.

```prisma
model QuestionAnswer {
  id              String          @id @default(cuid())
  attemptId       String
  questionId      String          // <-- NO INDEX!
  // ...
  @@unique([attemptId, questionId])
  @@index([attemptId])             // <-- Only attemptId indexed
}
```

### Fix

Add `@@index([questionId])` to the model:

```prisma
model QuestionAnswer {
  id              String          @id @default(cuid())
  attemptId       String
  questionId      String

  // Answer data (typed per question type)
  answerData      Json

  // Grading
  isCorrect       Boolean?
  pointsEarned    Float?
  feedback        String?         // For essay/short answer teacher feedback

  // Show-your-work support
  workImageKey    String?         // R2 key for show-your-work canvas
  workCanvasState Json?           // tldraw snapshot

  answeredAt      DateTime        @default(now())

  // Relations
  attempt         QuizAttempt     @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question        CuratedQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([attemptId, questionId])
  @@index([attemptId])
  @@index([questionId])           // <-- ADD THIS
}
```

### Migration Steps

```bash
npx prisma migrate dev --name add_question_answer_questionid_index
```

---

## Issue 2: N+1 Query in `submitAnswer()`

**Severity:** HIGH
**File:** `src/actions/attempts.ts`
**Lines:** 88-100

### Problem

The current query fetches the entire quiz with all questions, then filters to one question. This over-fetches data and creates unnecessary load.

```typescript
// CURRENT: Over-fetches with nested includes
const attempt = await prisma.quizAttempt.findUnique({
  where: { id: attemptId },
  include: {
    quiz: {
      include: {
        questions: {
          where: { questionId },        // Filters AFTER fetching
          include: { question: true },
        },
      },
    },
  },
});
```

### Fix

Split into two targeted queries that fetch only what's needed:

```typescript
// FIXED: Two targeted queries instead of nested over-fetch
export async function submitAnswer(
  attemptId: string,
  questionId: string,
  answerData: AnswerData
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  // Query 1: Verify attempt ownership and status
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      quizId: true,
    },
  });

  if (!attempt || attempt.userId !== session.user.id) {
    return { error: 'Attempt not found' };
  }

  if (attempt.status !== AttemptStatus.in_progress) {
    return { error: 'Attempt already submitted' };
  }

  // Query 2: Get the specific quiz question with its curated question
  const quizQuestion = await prisma.quizQuestion.findFirst({
    where: {
      quizId: attempt.quizId,
      questionId: questionId,
    },
    include: {
      question: true,
    },
  });

  if (!quizQuestion) {
    return { error: 'Question not in quiz' };
  }

  const question = quizQuestion.question;
  const points = quizQuestion.points;

  // ... rest of grading logic unchanged
}
```

### Why This Is Better

| Metric | Before | After |
|--------|--------|-------|
| Queries | 1 (heavy) | 2 (light) |
| Data fetched | All quiz questions + nested data | Only attempt metadata + 1 question |
| Scales with | Quiz size (O(N)) | Constant (O(1)) |

---

## Issue 3: N+1 Query in Curate Route

**Severity:** HIGH
**File:** `src/app/api/documents/[id]/curate/route.ts`
**Lines:** 109-115

### Problem

Updates are performed one-by-one in a loop, creating N database round-trips:

```typescript
// CURRENT: N+1 - one query per selection
for (const { questionId, selected } of body.selections) {
  await prisma.curatedQuestion.update({
    where: { id: questionId },
    data: { teacherSelected: selected },
  });
}
```

With 50 questions, this creates 50 separate database queries.

### Fix

Use batched `updateMany` with `in` clause, grouped by selection value:

```typescript
// FIXED: 2 queries max (one for selected=true, one for selected=false)

// Group by selection value
const toSelect = body.selections
  .filter((s) => s.selected)
  .map((s) => s.questionId);
const toDeselect = body.selections
  .filter((s) => !s.selected)
  .map((s) => s.questionId);

// Batch update selected questions
if (toSelect.length > 0) {
  await prisma.curatedQuestion.updateMany({
    where: {
      id: { in: toSelect },
      documentId: id,  // Extra safety: ensure they belong to this doc
    },
    data: { teacherSelected: true },
  });
}

// Batch update deselected questions
if (toDeselect.length > 0) {
  await prisma.curatedQuestion.updateMany({
    where: {
      id: { in: toDeselect },
      documentId: id,
    },
    data: { teacherSelected: false },
  });
}
```

### Why This Is Better

| Metric | Before | After |
|--------|--------|-------|
| Queries | N (one per selection) | 2 (batched) |
| Round-trips | 50 for 50 questions | 2 for 50 questions |
| Latency | O(N) | O(1) |

---

## Issue 4: Missing Composite Index on `CuratedQuestion(documentId, teacherSelected)`

**Severity:** HIGH
**File:** `prisma/schema.prisma`
**Lines:** 178-225 (CuratedQuestion model)

### Problem

Queries filtering by both `documentId` AND `teacherSelected` are common (e.g., counting selected questions for a document). Current separate indexes require index intersection.

```prisma
// CURRENT: Separate single-column indexes
@@index([documentId])
@@index([teacherSelected])
```

### Fix

Add composite index for the common query pattern:

```prisma
model CuratedQuestion {
  // ... fields unchanged ...

  @@index([documentId])
  @@index([inCurationPool])
  @@index([teacherSelected])
  @@index([bloomLevel])
  @@index([documentId, teacherSelected])  // <-- ADD THIS
}
```

### Query Benefiting

```typescript
// This query benefits from composite index
const selectedCount = await prisma.curatedQuestion.count({
  where: { documentId: id, teacherSelected: true },
});
```

### Migration Steps

```bash
npx prisma migrate dev --name add_curated_question_composite_index
```

---

## Issue 5: Missing Index on `Quiz.publishedAt`

**Severity:** MEDIUM
**File:** `prisma/schema.prisma`
**Lines:** 231-261 (Quiz model)

### Problem

Queries filtering or ordering by `publishedAt` (e.g., "show recently published quizzes") require full table scan:

```prisma
model Quiz {
  // ...
  publishedAt         DateTime?     // <-- NO INDEX
  // ...
  @@index([documentId])
  @@index([createdById])
  @@index([status])                 // Only these three indexed
}
```

### Fix

Add index for `publishedAt`:

```prisma
model Quiz {
  id                  String        @id @default(cuid())
  documentId          String
  title               String
  description         String?

  // Workflow status
  status              QuizStatus    @default(draft)
  teacherPreviewedAt  DateTime?     // CONT-06: must be set before publish
  publishedAt         DateTime?

  // Quiz settings
  timeLimit           Int?          // Minutes, null = unlimited
  shuffleQuestions    Boolean       @default(false)
  showResults         ShowResultsOption  @default(after_submit)

  // Audit fields
  createdById         String
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  // Relations
  document            Document      @relation(fields: [documentId], references: [id], onDelete: Cascade)
  createdBy           User          @relation(fields: [createdById], references: [id])
  questions           QuizQuestion[]
  attempts            QuizAttempt[]

  @@index([documentId])
  @@index([createdById])
  @@index([status])
  @@index([publishedAt])            // <-- ADD THIS
}
```

### Migration Steps

```bash
npx prisma migrate dev --name add_quiz_publishedat_index
```

---

## Issue 6: QuizAttempt Unique Constraint May Be Too Restrictive

**Severity:** MEDIUM
**File:** `prisma/schema.prisma`
**Lines:** 279-303 (QuizAttempt model)

### Problem

Current unique constraint prevents multiple attempts per user per quiz:

```prisma
@@unique([quizId, userId]) // One active attempt per user
```

This is intentional for now but may block future retake functionality.

### Assessment

**Current Behavior:**
- One attempt per user per quiz (by design)
- Retakes not currently supported

**Future Consideration:**
If retakes are needed, options include:

#### Option A: Add attempt number (recommended if retakes needed)

```prisma
model QuizAttempt {
  // ... existing fields ...
  attemptNumber   Int           @default(1)  // Track which attempt

  @@unique([quizId, userId, attemptNumber])  // Allow multiple attempts
  @@index([quizId])
  @@index([userId])
  @@index([status])
}
```

#### Option B: Keep current design (no retakes)

Current constraint is correct if:
- Quiz attempts are one-shot
- Teacher preview uses same model (current design)
- No retake feature planned

### Recommendation

**No immediate change required.** Current constraint matches current requirements.

Document this as a known limitation. When retake feature is added:
1. Add `attemptNumber` field with default 1
2. Change unique constraint to include `attemptNumber`
3. Run migration

---

## Consolidated Migration Plan

### Single Migration Approach (Recommended)

Combine all schema changes into one migration:

```bash
# 1. Apply all schema changes to schema.prisma (Issues 1, 4, 5)
# 2. Run single migration
npx prisma migrate dev --name performance_indexes

# Migration will create:
# - Index on QuestionAnswer.questionId
# - Composite index on CuratedQuestion(documentId, teacherSelected)
# - Index on Quiz.publishedAt
```

### Files to Modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add 3 indexes (Issues 1, 4, 5) |
| `src/actions/attempts.ts` | Refactor `submitAnswer()` (Issue 2) |
| `src/app/api/documents/[id]/curate/route.ts` | Batch updates (Issue 3) |

---

## Verification Checklist

After applying fixes:

- [ ] `npx prisma migrate dev` completes without errors
- [ ] `npx prisma generate` regenerates client
- [ ] `npm run build` passes
- [ ] Existing tests pass
- [ ] Manual test: Submit quiz answer (Issue 2)
- [ ] Manual test: Update question selections in curate UI (Issue 3)

---

## Summary

| Issue | Severity | Type | Fix |
|-------|----------|------|-----|
| 1. QuestionAnswer.questionId | CRITICAL | Missing index | Add `@@index([questionId])` |
| 2. submitAnswer() N+1 | HIGH | Code refactor | Split into 2 targeted queries |
| 3. curate PATCH N+1 | HIGH | Code refactor | Use batched `updateMany` |
| 4. CuratedQuestion composite | HIGH | Missing index | Add `@@index([documentId, teacherSelected])` |
| 5. Quiz.publishedAt | MEDIUM | Missing index | Add `@@index([publishedAt])` |
| 6. QuizAttempt constraint | MEDIUM | Design review | No change - document limitation |
