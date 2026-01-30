# Test Coverage Fixes Plan

**PR #2 Review Issues:** Test Coverage (2 HIGH severity issues)

## Issues Summary

| Issue | Severity | File(s) | Description |
|-------|----------|---------|-------------|
| 1 | HIGH | `src/actions/quiz.ts`, `src/actions/attempts.ts`, `src/actions/questions.ts` | No tests for server actions |
| 2 | HIGH | `src/lib/questions/grading.ts` | Missing edge case tests for empty arrays |

---

## Issue 1: Server Actions Test Coverage

### Test Files to Create

```
src/actions/__tests__/quiz.test.ts
src/actions/__tests__/attempts.test.ts
src/actions/__tests__/questions.test.ts
```

### Mock Setup Requirements

All server action tests require mocking:

1. **Authentication (`@/lib/auth`)**
2. **Prisma client (`@/lib/prisma`)**
3. **Next.js cache functions (`next/cache`)**
4. **Next.js navigation (`next/navigation`)**

#### Shared Mock Setup File

**File:** `src/actions/__tests__/setup.ts`

```typescript
import { vi } from 'vitest';

// Mock auth session
export const mockSession = {
  user: {
    id: 'user-123',
    email: 'teacher@example.com',
    role: 'teacher',
  },
};

export const mockNoSession = null;

// Create auth mock
export const mockAuth = vi.fn();

// Mock Prisma client with chainable methods
export function createMockPrisma() {
  return {
    document: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    quiz: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    quizAttempt: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    questionAnswer: {
      upsert: vi.fn(),
    },
    curatedQuestion: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  };
}

// Mock next/cache
export const mockRevalidatePath = vi.fn();

// Mock next/navigation
export const mockRedirect = vi.fn();
```

---

### Test Suite 1: `quiz.test.ts`

**Critical paths to test:**
- `publishQuiz` CONT-06 workflow (requires teacher preview)
- `createQuiz` authorization and validation
- `updateQuizSettings` ownership verification

#### Test Cases

```typescript
// src/actions/__tests__/quiz.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules BEFORE importing the actions
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: createMockPrisma(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createQuiz,
  publishQuiz,
  unpublishQuiz,
  archiveQuiz,
  updateQuizSettings,
  getQuizzesForDocument,
  getQuizWithQuestions,
} from '../quiz';
import { QuizStatus } from '@/generated/prisma/client';

describe('quiz server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // publishQuiz - CONT-06 Critical Path
  // =========================================================================
  describe('publishQuiz', () => {
    it('returns error when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await publishQuiz('quiz-123');

      expect(result).toEqual({ success: false, error: 'Unauthorized' });
    });

    it('returns error when quiz not found', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue(null);

      const result = await publishQuiz('nonexistent');

      expect(result).toEqual({ success: false, error: 'Quiz not found' });
    });

    it('returns error when user does not own quiz', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        createdById: 'other-user',
        status: QuizStatus.draft,
        teacherPreviewedAt: new Date(),
        documentId: 'doc-123',
      });

      const result = await publishQuiz('quiz-123');

      expect(result).toEqual({ success: false, error: 'Access denied' });
    });

    it('returns error when quiz already published', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        createdById: 'user-123',
        status: QuizStatus.published,
        teacherPreviewedAt: new Date(),
        documentId: 'doc-123',
      });

      const result = await publishQuiz('quiz-123');

      expect(result).toEqual({ success: false, error: 'Quiz is already published' });
    });

    // CONT-06: Critical - Must preview before publish
    it('returns error when teacherPreviewedAt is null (CONT-06)', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        createdById: 'user-123',
        status: QuizStatus.draft,
        teacherPreviewedAt: null,  // NOT PREVIEWED
        documentId: 'doc-123',
      });

      const result = await publishQuiz('quiz-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('previewed before publishing');
    });

    it('successfully publishes quiz after preview (CONT-06)', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        createdById: 'user-123',
        status: QuizStatus.draft,
        teacherPreviewedAt: new Date('2024-01-01'),  // PREVIEWED
        documentId: 'doc-123',
      });
      vi.mocked(prisma.quiz.update).mockResolvedValue({} as any);

      const result = await publishQuiz('quiz-123');

      expect(result).toEqual({ success: true });
      expect(prisma.quiz.update).toHaveBeenCalledWith({
        where: { id: 'quiz-123' },
        data: {
          status: QuizStatus.published,
          publishedAt: expect.any(Date),
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/documents/doc-123/quiz/quiz-123');
    });
  });

  // =========================================================================
  // createQuiz
  // =========================================================================
  describe('createQuiz', () => {
    it('returns error when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      const formData = new FormData();

      const result = await createQuiz(formData);

      expect(result).toEqual({ error: 'Unauthorized' });
    });

    it('returns error for invalid questionIds JSON', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      const formData = new FormData();
      formData.set('questionIds', 'invalid-json');

      const result = await createQuiz(formData);

      expect(result).toEqual({ error: 'Invalid question IDs format' });
    });

    it('returns error for invalid input (empty title)', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      const formData = new FormData();
      formData.set('documentId', 'cuid123456789012345678901');
      formData.set('title', '');  // Invalid: empty
      formData.set('questionIds', '["q1"]');

      const result = await createQuiz(formData);

      expect(result.error).toBe('Invalid input');
    });

    it('returns error when document not found', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.document.findUnique).mockResolvedValue(null);

      const formData = new FormData();
      formData.set('documentId', 'cuid123456789012345678901');
      formData.set('title', 'Test Quiz');
      formData.set('questionIds', '["cuid123456789012345678902"]');

      const result = await createQuiz(formData);

      expect(result).toEqual({ error: 'Document not found or access denied' });
    });

    it('returns error when user does not own document', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.document.findUnique).mockResolvedValue({
        id: 'doc-123',
        uploadedById: 'other-user',  // Different owner
      });

      const formData = new FormData();
      formData.set('documentId', 'cuid123456789012345678901');
      formData.set('title', 'Test Quiz');
      formData.set('questionIds', '["cuid123456789012345678902"]');

      const result = await createQuiz(formData);

      expect(result).toEqual({ error: 'Document not found or access denied' });
    });

    it('creates quiz successfully and redirects', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.document.findUnique).mockResolvedValue({
        id: 'cuid123456789012345678901',
        uploadedById: 'user-123',
      });
      vi.mocked(prisma.quiz.create).mockResolvedValue({
        id: 'quiz-new',
        documentId: 'cuid123456789012345678901',
      });

      const formData = new FormData();
      formData.set('documentId', 'cuid123456789012345678901');
      formData.set('title', 'Test Quiz');
      formData.set('questionIds', '["cuid123456789012345678902"]');
      formData.set('shuffleQuestions', 'true');

      // redirect throws, so we need to catch
      await expect(createQuiz(formData)).rejects.toThrow();

      expect(prisma.quiz.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Test Quiz',
            shuffleQuestions: true,
          }),
        })
      );
    });
  });

  // =========================================================================
  // updateQuizSettings
  // =========================================================================
  describe('updateQuizSettings', () => {
    it('returns error when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await updateQuizSettings('quiz-123', { title: 'New Title' });

      expect(result).toEqual({ success: false, error: 'Unauthorized' });
    });

    it('returns error for invalid input', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });

      // Title too long (>200 chars)
      const result = await updateQuizSettings('quiz-123', { title: 'x'.repeat(201) });

      expect(result).toEqual({ success: false, error: 'Invalid input' });
    });

    it('returns success when no fields to update (empty data)', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });

      const result = await updateQuizSettings('quiz-123', {});

      expect(result).toEqual({ success: true });
      expect(prisma.quiz.findUnique).not.toHaveBeenCalled();
    });

    it('returns error when quiz not found or not owned', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue(null);

      const result = await updateQuizSettings('quiz-123', { title: 'New' });

      expect(result).toEqual({ success: false, error: 'Quiz not found or access denied' });
    });

    it('updates quiz settings successfully', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        createdById: 'user-123',
        documentId: 'doc-123',
      });
      vi.mocked(prisma.quiz.update).mockResolvedValue({} as any);

      const result = await updateQuizSettings('quiz-123', { title: 'Updated Title' });

      expect(result).toEqual({ success: true });
      expect(prisma.quiz.update).toHaveBeenCalledWith({
        where: { id: 'quiz-123' },
        data: { title: 'Updated Title' },
      });
    });
  });

  // =========================================================================
  // unpublishQuiz
  // =========================================================================
  describe('unpublishQuiz', () => {
    it('returns error when quiz is not published', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        createdById: 'user-123',
        status: QuizStatus.draft,
        documentId: 'doc-123',
      });

      const result = await unpublishQuiz('quiz-123');

      expect(result).toEqual({ success: false, error: 'Quiz is not published' });
    });

    it('unpublishes quiz successfully', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        createdById: 'user-123',
        status: QuizStatus.published,
        documentId: 'doc-123',
      });
      vi.mocked(prisma.quiz.update).mockResolvedValue({} as any);

      const result = await unpublishQuiz('quiz-123');

      expect(result).toEqual({ success: true });
      expect(prisma.quiz.update).toHaveBeenCalledWith({
        where: { id: 'quiz-123' },
        data: { status: QuizStatus.draft, publishedAt: null },
      });
    });
  });

  // =========================================================================
  // archiveQuiz
  // =========================================================================
  describe('archiveQuiz', () => {
    it('archives quiz successfully', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        createdById: 'user-123',
        documentId: 'doc-123',
      });
      vi.mocked(prisma.quiz.update).mockResolvedValue({} as any);

      const result = await archiveQuiz('quiz-123');

      expect(result).toEqual({ success: true });
      expect(prisma.quiz.update).toHaveBeenCalledWith({
        where: { id: 'quiz-123' },
        data: { status: QuizStatus.archived },
      });
    });
  });

  // =========================================================================
  // getQuizzesForDocument
  // =========================================================================
  describe('getQuizzesForDocument', () => {
    it('returns error when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await getQuizzesForDocument('doc-123');

      expect(result).toEqual({ success: false, error: 'Authentication required' });
    });

    it('returns quizzes for authenticated user', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findMany).mockResolvedValue([
        { id: 'quiz-1', title: 'Quiz 1', _count: { questions: 5 } },
      ]);

      const result = await getQuizzesForDocument('doc-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.quizzes).toHaveLength(1);
      }
    });
  });

  // =========================================================================
  // getQuizWithQuestions
  // =========================================================================
  describe('getQuizWithQuestions', () => {
    it('returns unauthenticated error', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await getQuizWithQuestions('quiz-123');

      expect(result).toEqual({ success: false, error: 'unauthenticated' });
    });

    it('returns not_found when quiz does not exist', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue(null);

      const result = await getQuizWithQuestions('nonexistent');

      expect(result).toEqual({ success: false, error: 'not_found' });
    });

    it('returns access_denied when user does not own quiz', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        createdById: 'other-user',
        questions: [],
        document: { id: 'doc-123', fileName: 'test.pdf' },
      });

      const result = await getQuizWithQuestions('quiz-123');

      expect(result).toEqual({ success: false, error: 'access_denied' });
    });

    it('returns quiz with questions for owner', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        createdById: 'user-123',
        questions: [{ id: 'qq-1', question: { id: 'q-1' } }],
        document: { id: 'doc-123', fileName: 'test.pdf' },
      });

      const result = await getQuizWithQuestions('quiz-123');

      expect(result.success).toBe(true);
    });
  });
});
```

---

### Test Suite 2: `attempts.test.ts`

**Critical paths to test:**
- `submitAnswer` grading logic integration
- `completeAttempt` score calculation
- `markQuizPreviewed` CONT-06 workflow

#### Test Cases

```typescript
// src/actions/__tests__/attempts.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ default: createMockPrisma() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  startAttempt,
  submitAnswer,
  completeAttempt,
  markQuizPreviewed,
  getAttemptWithAnswers,
} from '../attempts';
import { AttemptStatus, QuizStatus } from '@/generated/prisma/client';

describe('attempts server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // startAttempt
  // =========================================================================
  describe('startAttempt', () => {
    it('returns error when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await startAttempt('quiz-123');

      expect(result).toEqual({ error: 'Unauthorized' });
    });

    it('returns error when quiz not found', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue(null);

      const result = await startAttempt('nonexistent');

      expect(result).toEqual({ error: 'Quiz not found' });
    });

    it('returns error when user does not own document', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        document: { uploadedById: 'other-user' },
      });

      const result = await startAttempt('quiz-123');

      expect(result).toEqual({ error: 'Access denied' });
    });

    it('creates or returns existing attempt via upsert', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        document: { uploadedById: 'user-123' },
      });
      vi.mocked(prisma.quizAttempt.upsert).mockResolvedValue({
        id: 'attempt-123',
      });

      const result = await startAttempt('quiz-123');

      expect(result).toEqual({ attemptId: 'attempt-123' });
      expect(prisma.quizAttempt.upsert).toHaveBeenCalledWith({
        where: {
          quizId_userId: { quizId: 'quiz-123', userId: 'user-123' },
        },
        update: {},
        create: expect.objectContaining({
          quizId: 'quiz-123',
          userId: 'user-123',
          status: AttemptStatus.in_progress,
        }),
      });
    });
  });

  // =========================================================================
  // submitAnswer - Grading Integration
  // =========================================================================
  describe('submitAnswer', () => {
    it('returns error when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await submitAnswer('attempt-123', 'q-1', { type: 'multiple_choice', selectedChoiceId: 'A' });

      expect(result).toEqual({ error: 'Unauthorized' });
    });

    it('returns error when attempt not found or not owned', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quizAttempt.findUnique).mockResolvedValue(null);

      const result = await submitAnswer('nonexistent', 'q-1', { type: 'multiple_choice', selectedChoiceId: 'A' });

      expect(result).toEqual({ error: 'Attempt not found' });
    });

    it('returns error when attempt already submitted', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quizAttempt.findUnique).mockResolvedValue({
        id: 'attempt-123',
        userId: 'user-123',
        status: AttemptStatus.submitted,  // Already submitted
        quiz: { questions: [{ questionId: 'q-1', question: {}, points: 1 }] },
      });

      const result = await submitAnswer('attempt-123', 'q-1', { type: 'multiple_choice', selectedChoiceId: 'A' });

      expect(result).toEqual({ error: 'Attempt already submitted' });
    });

    it('returns error when question not in quiz', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quizAttempt.findUnique).mockResolvedValue({
        id: 'attempt-123',
        userId: 'user-123',
        status: AttemptStatus.in_progress,
        quiz: { questions: [] },  // Question not in quiz
      });

      const result = await submitAnswer('attempt-123', 'q-1', { type: 'multiple_choice', selectedChoiceId: 'A' });

      expect(result).toEqual({ error: 'Question not in quiz' });
    });

    it('grades multiple_choice answer correctly and upserts', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quizAttempt.findUnique).mockResolvedValue({
        id: 'attempt-123',
        userId: 'user-123',
        status: AttemptStatus.in_progress,
        quiz: {
          questions: [{
            questionId: 'q-1',
            points: 2,
            question: {
              id: 'q-1',
              questionType: 'multiple_choice',
              options: {
                type: 'multiple_choice',
                choices: [
                  { id: 'A', text: 'Correct', isCorrect: true },
                  { id: 'B', text: 'Wrong', isCorrect: false },
                ],
              },
            },
          }],
        },
      });
      vi.mocked(prisma.questionAnswer.upsert).mockResolvedValue({} as any);

      const result = await submitAnswer('attempt-123', 'q-1', { type: 'multiple_choice', selectedChoiceId: 'A' });

      expect(result.success).toBe(true);
      expect(result.gradeResult).toEqual({
        isCorrect: true,
        pointsEarned: 2,
        maxPoints: 2,
      });
      expect(prisma.questionAnswer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            isCorrect: true,
            pointsEarned: 2,
          }),
        })
      );
    });

    it('handles manual grading types (essay) without grading', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quizAttempt.findUnique).mockResolvedValue({
        id: 'attempt-123',
        userId: 'user-123',
        status: AttemptStatus.in_progress,
        quiz: {
          questions: [{
            questionId: 'q-1',
            points: 5,
            question: {
              id: 'q-1',
              questionType: 'essay',  // Not auto-gradable
              options: null,
            },
          }],
        },
      });
      vi.mocked(prisma.questionAnswer.upsert).mockResolvedValue({} as any);

      const result = await submitAnswer('attempt-123', 'q-1', { type: 'essay', text: 'My essay', wordCount: 100 });

      expect(result.success).toBe(true);
      expect(result.gradeResult).toBeNull();
      expect(prisma.questionAnswer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            isCorrect: null,
            pointsEarned: null,
          }),
        })
      );
    });
  });

  // =========================================================================
  // completeAttempt
  // =========================================================================
  describe('completeAttempt', () => {
    it('returns error when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await completeAttempt('attempt-123');

      expect(result).toEqual({ error: 'Unauthorized' });
    });

    it('returns error when attempt already submitted', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quizAttempt.findUnique).mockResolvedValue({
        id: 'attempt-123',
        userId: 'user-123',
        status: AttemptStatus.submitted,
        answers: [],
        quiz: { questions: [] },
      });

      const result = await completeAttempt('attempt-123');

      expect(result).toEqual({ error: 'Attempt already submitted' });
    });

    it('calculates score from graded answers', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quizAttempt.findUnique).mockResolvedValue({
        id: 'attempt-123',
        userId: 'user-123',
        status: AttemptStatus.in_progress,
        answers: [
          { pointsEarned: 1 },
          { pointsEarned: 0.5 },
          { pointsEarned: null },  // Ungraded (essay)
        ],
        quiz: {
          questions: [
            { points: 1 },
            { points: 1 },
            { points: 5 },
          ],
        },
      });
      vi.mocked(prisma.quizAttempt.update).mockResolvedValue({} as any);

      const result = await completeAttempt('attempt-123');

      expect(result).toEqual({ success: true, score: 1.5, maxScore: 7 });
      expect(prisma.quizAttempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-123' },
        data: {
          status: AttemptStatus.submitted,
          submittedAt: expect.any(Date),
          score: 1.5,
          maxScore: 7,
        },
      });
    });

    it('handles empty answers array', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quizAttempt.findUnique).mockResolvedValue({
        id: 'attempt-123',
        userId: 'user-123',
        status: AttemptStatus.in_progress,
        answers: [],  // No answers submitted
        quiz: {
          questions: [{ points: 1 }, { points: 2 }],
        },
      });
      vi.mocked(prisma.quizAttempt.update).mockResolvedValue({} as any);

      const result = await completeAttempt('attempt-123');

      expect(result).toEqual({ success: true, score: 0, maxScore: 3 });
    });
  });

  // =========================================================================
  // markQuizPreviewed - CONT-06
  // =========================================================================
  describe('markQuizPreviewed', () => {
    it('returns error when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await markQuizPreviewed('quiz-123');

      expect(result).toEqual({ error: 'Unauthorized' });
    });

    it('returns error when quiz not found', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue(null);

      const result = await markQuizPreviewed('nonexistent');

      expect(result).toEqual({ error: 'Quiz not found' });
    });

    it('returns error when user does not own quiz', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        createdById: 'other-user',
        status: QuizStatus.draft,
      });

      const result = await markQuizPreviewed('quiz-123');

      expect(result).toEqual({ error: 'Access denied' });
    });

    it('marks quiz as previewed and updates status', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
        id: 'quiz-123',
        createdById: 'user-123',
        status: QuizStatus.draft,
      });
      vi.mocked(prisma.quiz.update).mockResolvedValue({} as any);

      const result = await markQuizPreviewed('quiz-123');

      expect(result).toEqual({ success: true });
      expect(prisma.quiz.update).toHaveBeenCalledWith({
        where: { id: 'quiz-123' },
        data: {
          teacherPreviewedAt: expect.any(Date),
          status: QuizStatus.preview_required,
        },
      });
    });
  });

  // =========================================================================
  // getAttemptWithAnswers
  // =========================================================================
  describe('getAttemptWithAnswers', () => {
    it('returns error when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await getAttemptWithAnswers('quiz-123');

      expect(result).toEqual({ error: 'Unauthorized' });
    });

    it('returns null attempt when not found', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quizAttempt.findUnique).mockResolvedValue(null);

      const result = await getAttemptWithAnswers('quiz-123');

      expect(result).toEqual({ attempt: null, answers: [] });
    });

    it('returns attempt with answers', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.quizAttempt.findUnique).mockResolvedValue({
        id: 'attempt-123',
        status: AttemptStatus.in_progress,
        score: null,
        maxScore: null,
        answers: [
          { questionId: 'q-1', answerData: {}, isCorrect: true, pointsEarned: 1, feedback: null },
        ],
      });

      const result = await getAttemptWithAnswers('quiz-123');

      expect(result.attempt).toEqual({
        id: 'attempt-123',
        status: AttemptStatus.in_progress,
        score: null,
        maxScore: null,
      });
      expect(result.answers).toHaveLength(1);
    });
  });
});
```

---

### Test Suite 3: `questions.test.ts`

**Critical paths to test:**
- `updateQuestion` CONT-07 editing workflow
- `getQuestions` pagination and filtering

#### Test Cases

```typescript
// src/actions/__tests__/questions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ default: createMockPrisma() }));

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  getQuestions,
  getTeacherDocuments,
  updateQuestion,
  getQuestionForEdit,
} from '../questions';

describe('questions server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // getQuestions
  // =========================================================================
  describe('getQuestions', () => {
    it('returns error when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await getQuestions();

      expect(result).toEqual({ success: false, error: 'Authentication required' });
    });

    it('returns paginated questions with defaults', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.curatedQuestion.findMany).mockResolvedValue([
        { id: 'q-1', questionText: 'Test?', document: { id: 'd-1', fileName: 'test.pdf' } },
      ]);
      vi.mocked(prisma.curatedQuestion.count).mockResolvedValue(1);

      const result = await getQuestions();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.page).toBe(1);
        expect(result.totalPages).toBe(1);
      }
    });

    it('clamps pagination inputs to safe ranges', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.curatedQuestion.findMany).mockResolvedValue([]);
      vi.mocked(prisma.curatedQuestion.count).mockResolvedValue(0);

      // Negative page, limit > 100
      await getQuestions({ page: -5, limit: 500 });

      expect(prisma.curatedQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,  // Clamped from negative
          take: 100,  // Clamped from 500
        })
      );
    });

    it('applies filters correctly', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.curatedQuestion.findMany).mockResolvedValue([]);
      vi.mocked(prisma.curatedQuestion.count).mockResolvedValue(0);

      await getQuestions({
        documentId: 'doc-123',
        questionType: 'multiple_choice',
        bloomLevel: 'remember',
        search: 'capital',
      });

      expect(prisma.curatedQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            documentId: 'doc-123',
            questionType: 'multiple_choice',
            bloomLevel: 'remember',
            questionText: { contains: 'capital', mode: 'insensitive' },
          }),
        })
      );
    });
  });

  // =========================================================================
  // updateQuestion - CONT-07
  // =========================================================================
  describe('updateQuestion', () => {
    it('returns error when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await updateQuestion('q-123', { questionText: 'Updated?' });

      expect(result).toEqual({ success: false, error: 'Not authenticated' });
    });

    it('returns error for invalid input (empty question text)', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });

      const result = await updateQuestion('q-123', { questionText: '' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input');
    });

    it('returns success when no fields provided (empty update)', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });

      const result = await updateQuestion('q-123', {});

      expect(result).toEqual({ success: true });
      expect(prisma.curatedQuestion.findFirst).not.toHaveBeenCalled();
    });

    it('returns error when question not found or not owned', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.curatedQuestion.findFirst).mockResolvedValue(null);

      const result = await updateQuestion('q-123', { questionText: 'Updated?' });

      expect(result).toEqual({ success: false, error: 'Question not found or access denied' });
    });

    it('returns error when options.type does not match questionType', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.curatedQuestion.findFirst).mockResolvedValue({
        id: 'q-123',
        questionType: 'multiple_choice',
      });

      const result = await updateQuestion('q-123', {
        options: {
          type: 'true_false',  // Mismatched!
          correctAnswer: true,
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not match question type');
    });

    it('updates question successfully', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.curatedQuestion.findFirst).mockResolvedValue({
        id: 'q-123',
        questionType: 'multiple_choice',
      });
      vi.mocked(prisma.curatedQuestion.update).mockResolvedValue({} as any);

      const result = await updateQuestion('q-123', {
        questionText: 'Updated question text?',
        explanation: 'New explanation',
      });

      expect(result).toEqual({ success: true });
      expect(prisma.curatedQuestion.update).toHaveBeenCalledWith({
        where: { id: 'q-123' },
        data: {
          questionText: 'Updated question text?',
          explanation: 'New explanation',
        },
      });
    });
  });

  // =========================================================================
  // getTeacherDocuments
  // =========================================================================
  describe('getTeacherDocuments', () => {
    it('returns error when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await getTeacherDocuments();

      expect(result).toEqual({ success: false, error: 'Authentication required' });
    });

    it('returns documents with question counts', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        { id: 'd-1', fileName: 'doc.pdf', _count: { curatedQuestions: 5 } },
      ]);

      const result = await getTeacherDocuments();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.documents).toHaveLength(1);
        expect(result.documents[0]._count.curatedQuestions).toBe(5);
      }
    });
  });

  // =========================================================================
  // getQuestionForEdit
  // =========================================================================
  describe('getQuestionForEdit', () => {
    it('returns error when unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await getQuestionForEdit('q-123');

      expect(result).toEqual({ success: false, error: 'Authentication required' });
    });

    it('returns error when question not found', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.curatedQuestion.findFirst).mockResolvedValue(null);

      const result = await getQuestionForEdit('nonexistent');

      expect(result).toEqual({ success: false, error: 'Question not found or access denied' });
    });

    it('returns question for editing', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
      vi.mocked(prisma.curatedQuestion.findFirst).mockResolvedValue({
        id: 'q-123',
        questionText: 'Test?',
        document: { id: 'd-1', fileName: 'test.pdf' },
      });

      const result = await getQuestionForEdit('q-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.question.id).toBe('q-123');
      }
    });
  });
});
```

---

## Issue 2: Empty Array Edge Cases in Grading

### Test File to Modify

**File:** `src/lib/questions/__tests__/grading.test.ts`

### Missing Test Cases

The existing `grading.test.ts` tests most scenarios but is missing explicit tests for empty arrays in `fill_in_blank` and `matching` types.

#### Tests to Add

```typescript
// Add to existing grading.test.ts

describe('gradeAnswer - empty array edge cases', () => {
  describe('fill_in_blank with empty blanks array', () => {
    it('returns 0 points when options.blanks is empty', () => {
      const emptyBlanksOptions: QuestionOptions = {
        type: 'fill_in_blank',
        blanks: [],  // EDGE CASE: No blanks defined
      };
      const answer: AnswerData = { type: 'fill_in_blank', blanks: [] };

      const result = gradeAnswer('fill_in_blank', emptyBlanksOptions, answer);

      // Should not divide by zero; should return 0 points
      expect(result.isCorrect).toBe(true);  // 0/0 blanks = vacuously correct
      expect(result.pointsEarned).toBe(0);
      expect(result.maxPoints).toBe(1);
      expect(Number.isFinite(result.pointsEarned)).toBe(true);  // Not NaN/Infinity
    });

    it('handles student providing answers when no blanks expected', () => {
      const emptyBlanksOptions: QuestionOptions = {
        type: 'fill_in_blank',
        blanks: [],
      };
      const answer: AnswerData = { type: 'fill_in_blank', blanks: ['unexpected', 'answers'] };

      const result = gradeAnswer('fill_in_blank', emptyBlanksOptions, answer);

      expect(result.isCorrect).toBe(true);  // All 0 expected blanks are correct
      expect(result.pointsEarned).toBe(0);  // 0 * maxPoints = 0
    });

    it('handles student providing empty blanks when blanks expected', () => {
      const normalOptions: QuestionOptions = {
        type: 'fill_in_blank',
        blanks: [
          { index: 0, acceptedAnswers: ['Paris'], caseSensitive: false },
          { index: 1, acceptedAnswers: ['France'], caseSensitive: false },
        ],
      };
      const answer: AnswerData = { type: 'fill_in_blank', blanks: [] };  // Student submitted nothing

      const result = gradeAnswer('fill_in_blank', normalOptions, answer);

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);  // 0/2 correct
      expect(result.feedback).toBe('0/2 blanks correct');
    });
  });

  describe('matching with empty pairs array', () => {
    it('returns 0 points when options.pairs is empty', () => {
      const emptyPairsOptions: QuestionOptions = {
        type: 'matching',
        pairs: [],  // EDGE CASE: No pairs defined
      };
      const answer: AnswerData = { type: 'matching', pairs: [] };

      const result = gradeAnswer('matching', emptyPairsOptions, answer);

      // Should not divide by zero; should return 0 points
      expect(result.isCorrect).toBe(true);  // 0/0 pairs = vacuously correct
      expect(result.pointsEarned).toBe(0);
      expect(result.maxPoints).toBe(1);
      expect(Number.isFinite(result.pointsEarned)).toBe(true);  // Not NaN/Infinity
    });

    it('handles student providing matches when no pairs expected', () => {
      const emptyPairsOptions: QuestionOptions = {
        type: 'matching',
        pairs: [],
      };
      const answer: AnswerData = {
        type: 'matching',
        pairs: [{ leftId: '1', rightId: '2' }],  // Extra answers
      };

      const result = gradeAnswer('matching', emptyPairsOptions, answer);

      expect(result.isCorrect).toBe(true);  // All 0 expected pairs are correct
      expect(result.pointsEarned).toBe(0);
    });

    it('handles student providing empty pairs when matches expected', () => {
      const normalOptions: QuestionOptions = {
        type: 'matching',
        pairs: [
          { id: '1', left: 'A', right: '1' },
          { id: '2', left: 'B', right: '2' },
        ],
      };
      const answer: AnswerData = { type: 'matching', pairs: [] };  // Student submitted nothing

      const result = gradeAnswer('matching', normalOptions, answer);

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);  // 0/2 correct
      expect(result.feedback).toBe('0/2 pairs correct');
    });
  });

  describe('partial answers edge cases', () => {
    it('handles fill_in_blank with fewer answers than blanks', () => {
      const options: QuestionOptions = {
        type: 'fill_in_blank',
        blanks: [
          { index: 0, acceptedAnswers: ['Paris'], caseSensitive: false },
          { index: 1, acceptedAnswers: ['France'], caseSensitive: false },
          { index: 2, acceptedAnswers: ['Europe'], caseSensitive: false },
        ],
      };
      const answer: AnswerData = { type: 'fill_in_blank', blanks: ['Paris'] };  // Only 1 of 3

      const result = gradeAnswer('fill_in_blank', options, answer);

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBeCloseTo(1 / 3);  // 1/3 correct
      expect(result.feedback).toBe('1/3 blanks correct');
    });

    it('handles matching with fewer pairs than expected', () => {
      const options: QuestionOptions = {
        type: 'matching',
        pairs: [
          { id: '1', left: 'A', right: '1' },
          { id: '2', left: 'B', right: '2' },
          { id: '3', left: 'C', right: '3' },
        ],
      };
      const answer: AnswerData = {
        type: 'matching',
        pairs: [{ leftId: '1', rightId: '1' }],  // Only 1 of 3
      };

      const result = gradeAnswer('matching', options, answer);

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBeCloseTo(1 / 3);  // 1/3 correct
      expect(result.feedback).toBe('1/3 pairs correct');
    });
  });
});
```

---

## Implementation Order

### Priority 1: Grading Edge Cases (Quick Win)

1. Add empty array edge case tests to `src/lib/questions/__tests__/grading.test.ts`
2. Run tests: `npm test -- src/lib/questions/__tests__/grading.test.ts`
3. Verify existing implementation handles edge cases (it should based on code review)

**Estimated time:** 15 minutes

### Priority 2: Server Action Tests (High Impact)

1. Create `src/actions/__tests__/setup.ts` with shared mocks
2. Create `src/actions/__tests__/quiz.test.ts` (publishQuiz CONT-06 critical)
3. Create `src/actions/__tests__/attempts.test.ts` (submitAnswer grading)
4. Create `src/actions/__tests__/questions.test.ts` (updateQuestion CONT-07)
5. Run full test suite: `npm test`

**Estimated time:** 45-60 minutes

---

## Verification Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/lib/questions/__tests__/grading.test.ts
npm test -- src/actions/__tests__/quiz.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode during development
npm test -- --watch
```

---

## Success Criteria

- [ ] All grading edge case tests pass
- [ ] Quiz server action tests cover CONT-06 workflow
- [ ] Attempts server action tests cover submitAnswer grading
- [ ] Questions server action tests cover CONT-07 editing
- [ ] No test failures in CI
- [ ] Test coverage for server actions > 80%
