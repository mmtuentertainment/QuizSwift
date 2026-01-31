# Database Schema Fixes - PR #2 Issues

## Overview

Two database schema issues identified in PR #2 review:
1. Missing index on `Quiz.publishedAt`
2. QuizAttempt unique constraint too restrictive for retakes

---

## Issue 1: Missing Index on Quiz.publishedAt

### Severity
MEDIUM

### Problem
`Quiz.publishedAt` is used in queries filtering/sorting published quizzes but has no index. This will cause full table scans as quiz count grows.

### Usage Analysis
From `src/actions/quiz.ts`, `publishedAt` is:
- Set when publishing a quiz (line 292)
- Cleared when unpublishing (line 332)
- Could be used for sorting published quizzes by publish date

Likely future queries:

```sql
-- List published quizzes for students (by publish date)
SELECT * FROM "Quiz" WHERE status = 'published' ORDER BY "publishedAt" DESC;

-- Find recently published quizzes
SELECT * FROM "Quiz" WHERE "publishedAt" > $1;
```

### Current Schema (lines 231-261)

```prisma
model Quiz {
  id                  String        @id @default(cuid())
  documentId          String
  title               String
  description         String?
  status              QuizStatus    @default(draft)
  teacherPreviewedAt  DateTime?
  publishedAt         DateTime?     // <-- NO INDEX
  timeLimit           Int?
  shuffleQuestions    Boolean       @default(false)
  showResults         ShowResultsOption  @default(after_submit)
  createdById         String
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  document            Document      @relation(...)
  createdBy           User          @relation(...)
  questions           QuizQuestion[]
  attempts            QuizAttempt[]

  @@index([documentId])
  @@index([createdById])
  @@index([status])
}
```

### Fix: Add Index

```prisma
model Quiz {
  // ... existing fields ...

  @@index([documentId])
  @@index([createdById])
  @@index([status])
  @@index([publishedAt])  // <-- ADD THIS
}
```

### Migration SQL

```sql
-- CreateIndex
CREATE INDEX "Quiz_publishedAt_idx" ON "Quiz"("publishedAt");
```

### Impact Analysis
- **No code changes required** - purely additive schema change
- **Zero downtime** - index creation on small tables is fast
- **No data changes** - existing data unaffected
- **Backwards compatible** - works with existing queries

---

## Issue 2: QuizAttempt Unique Constraint Too Restrictive

### Severity
MEDIUM

### Problem
Current constraint `@@unique([quizId, userId])` limits users to ONE attempt per quiz EVER. This blocks:
- Quiz retakes (students retry for better scores)
- Practice mode (students take quiz multiple times to learn)
- Teacher re-preview after quiz edits

### Current Schema (lines 279-303)

```prisma
model QuizAttempt {
  id          String           @id @default(cuid())
  quizId      String
  userId      String
  status      AttemptStatus    @default(in_progress)
  startedAt   DateTime         @default(now())
  submittedAt DateTime?
  gradedAt    DateTime?
  score       Float?
  maxScore    Float?

  quiz        Quiz             @relation(...)
  user        User             @relation(...)
  answers     QuestionAnswer[]

  @@unique([quizId, userId])  // <-- TOO RESTRICTIVE
  @@index([quizId])
  @@index([userId])
  @@index([status])
}
```

### Current Code Usage (src/actions/attempts.ts)

```typescript
// Line 52-65: startAttempt uses upsert with the unique constraint
const attempt = await prisma.quizAttempt.upsert({
  where: {
    quizId_userId: {
      quizId,
      userId: session.user.id,
    },
  },
  update: {}, // No-op if exists
  create: { ... },
});

// Line 272-277: getAttemptWithAnswers uses it for lookup
const attempt = await prisma.quizAttempt.findUnique({
  where: {
    quizId_userId: {
      quizId,
      userId: session.user.id,
    },
  },
  ...
});
```

### Fix Options

#### Option A: Add attemptNumber for Sequential Retakes (RECOMMENDED)

```prisma
model QuizAttempt {
  id            String           @id @default(cuid())
  quizId        String
  userId        String
  attemptNumber Int              @default(1)  // <-- ADD THIS
  status        AttemptStatus    @default(in_progress)
  // ... rest unchanged ...

  @@unique([quizId, userId, attemptNumber])  // <-- CHANGE THIS
  @@index([quizId])
  @@index([userId])
  @@index([status])
}
```

**Pros:**
- Clean tracking of attempt history
- Easy to query "which attempt is this?"
- Natural ordering (1st, 2nd, 3rd attempt)
- Supports "best of N" grading policies

**Cons:**
- Requires code changes to manage attemptNumber
- More complex upsert logic

#### Option B: Remove Unique Constraint Entirely

```prisma
model QuizAttempt {
  // ... fields unchanged ...

  // @@unique([quizId, userId])  <-- REMOVE THIS
  @@index([quizId, userId])  // <-- ADD COMPOSITE INDEX
  @@index([quizId])
  @@index([userId])
  @@index([status])
}
```

**Pros:**
- Simplest change
- Maximum flexibility

**Cons:**
- No protection against accidental duplicate in-progress attempts
- Code must manually enforce "one active attempt" rule

#### Option C: Composite Unique with Status (NOT RECOMMENDED)

```prisma
@@unique([quizId, userId, status])
```

**Cons:**
- User could have multiple `submitted` attempts with same status
- Doesn't solve the core problem

### Recommended: Option A (attemptNumber)

### Updated Schema

```prisma
model QuizAttempt {
  id            String           @id @default(cuid())
  quizId        String
  userId        String
  attemptNumber Int              @default(1)

  status        AttemptStatus    @default(in_progress)
  startedAt     DateTime         @default(now())
  submittedAt   DateTime?
  gradedAt      DateTime?

  score         Float?
  maxScore      Float?

  quiz          Quiz             @relation(fields: [quizId], references: [id], onDelete: Cascade)
  user          User             @relation(fields: [userId], references: [id])
  answers       QuestionAnswer[]

  @@unique([quizId, userId, attemptNumber])
  @@index([quizId])
  @@index([userId])
  @@index([status])
  @@index([quizId, userId])  // For finding all attempts by user on quiz
}
```

### Migration SQL

```sql
-- Step 1: Add attemptNumber column with default
ALTER TABLE "QuizAttempt" ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1;

-- Step 2: Drop old unique constraint
ALTER TABLE "QuizAttempt" DROP CONSTRAINT "QuizAttempt_quizId_userId_key";

-- Step 3: Create new composite unique constraint
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_userId_attemptNumber_key"
  UNIQUE ("quizId", "userId", "attemptNumber");

-- Step 4: Add composite index for user attempt lookups
CREATE INDEX "QuizAttempt_quizId_userId_idx" ON "QuizAttempt"("quizId", "userId");
```

### Code Changes Required

#### src/actions/attempts.ts

**startAttempt (lines 25-71):**

```typescript
export async function startAttempt(quizId: string) {
  // ... auth checks unchanged ...

  // Find the latest attempt number for this user on this quiz
  const latestAttempt = await prisma.quizAttempt.findFirst({
    where: {
      quizId,
      userId: session.user.id,
    },
    orderBy: { attemptNumber: 'desc' },
    select: { attemptNumber: true, status: true, id: true },
  });

  // If there's an in-progress attempt, return it (reuse same record to avoid race condition)
  if (latestAttempt?.status === AttemptStatus.in_progress) {
    return { attemptId: latestAttempt.id };
  }

  // Otherwise, create new attempt with next number
  const nextAttemptNumber = (latestAttempt?.attemptNumber ?? 0) + 1;

  try {
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId: session.user.id,
        attemptNumber: nextAttemptNumber,
        status: AttemptStatus.in_progress,
      },
    });

    return { attemptId: attempt.id };
  } catch (error) {
    return { error: handlePrismaError(error) };
  }
}
```

**getAttemptWithAnswers (lines 265-308):**

```typescript
export async function getAttemptWithAnswers(quizId: string, attemptNumber?: number) {
  // ... auth checks unchanged ...

  try {
    // If attemptNumber specified, get that specific attempt
    // Otherwise, get the latest in-progress or most recent submitted
    const attempt = attemptNumber
      ? await prisma.quizAttempt.findUnique({
          where: {
            quizId_userId_attemptNumber: {
              quizId,
              userId: session.user.id,
              attemptNumber,
            },
          },
          include: { answers: { ... } },
        })
      : await prisma.quizAttempt.findFirst({
          where: {
            quizId,
            userId: session.user.id,
          },
          orderBy: [
            { status: 'asc' }, // in_progress comes first
            { attemptNumber: 'desc' },
          ],
          include: { answers: { ... } },
        });

    // ... rest unchanged ...
  }
}
```

### Impact Analysis

**Schema:**
- Adds `attemptNumber` column (default 1)
- Changes unique constraint (quizId, userId) -> (quizId, userId, attemptNumber)
- Adds composite index for performance

**Code changes:**
- `startAttempt`: Must find latest attempt number and increment
- `getAttemptWithAnswers`: Must handle multiple attempts per user
- Any UI showing attempts needs to handle attempt history

**Data migration:**
- Existing attempts get attemptNumber = 1 (via default)
- No data loss

**Backwards compatibility:**
- Breaking change for code using `quizId_userId` compound key
- Must update all references to use `quizId_userId_attemptNumber`

---

## Implementation Order

1. **Phase 1: Add publishedAt index** (no code changes)
   - Update schema.prisma
   - Run `prisma db push` or create migration
   - Verify with `prisma studio`

2. **Phase 2: Add attemptNumber** (requires code changes)
   - Update schema.prisma
   - Update `startAttempt` in attempts.ts
   - Update `getAttemptWithAnswers` in attempts.ts
   - Run migration
   - Test retake flow manually

---

## Files to Modify

| File                      | Change                                           |
| ------------------------- | ------------------------------------------------ |
| `prisma/schema.prisma`    | Add index, add attemptNumber, change constraint  |
| `src/actions/attempts.ts` | Update startAttempt, getAttemptWithAnswers       |

---

## Testing Checklist

- [ ] Existing quizzes still accessible
- [ ] Existing attempts still work
- [ ] Can start a new attempt on a quiz
- [ ] After submitting, can start a second attempt
- [ ] attemptNumber increments correctly (1, 2, 3...)
- [ ] In-progress attempt is reused (not new attempt created)
- [ ] Published quiz filtering is fast (check EXPLAIN ANALYZE)
