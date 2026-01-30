/**
 * Shared test utilities for server actions
 *
 * Provides factory functions for creating mock data.
 * For actual test mocking, use vi.mock() in each test file.
 */

// =============================================================================
// Mock Data Factories
// =============================================================================

/**
 * Create a mock authenticated user session
 */
export function createMockSession(userId = 'test-user-cuid12345') {
  return {
    user: {
      id: userId,
      email: 'teacher@test.com',
      name: 'Test Teacher',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create a mock quiz for testing
 */
export function createMockQuiz(overrides: Partial<{
  id: string;
  title: string;
  documentId: string;
  createdById: string;
  status: 'draft' | 'preview_required' | 'published' | 'archived';
  teacherPreviewedAt: Date | null;
}> = {}) {
  return {
    id: overrides.id ?? 'quiz-cuid-123456789',
    title: overrides.title ?? 'Test Quiz',
    documentId: overrides.documentId ?? 'doc-cuid-1234567890',
    createdById: overrides.createdById ?? 'test-user-cuid12345',
    status: overrides.status ?? 'draft',
    teacherPreviewedAt: overrides.teacherPreviewedAt ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
    description: null,
    timeLimit: null,
    shuffleQuestions: false,
    showResults: 'after_submission',
  };
}

/**
 * Create a mock curated question for testing
 */
export function createMockQuestion(overrides: Partial<{
  id: string;
  documentId: string;
  questionType: string;
  questionText: string;
  correctAnswer: string;
}> = {}) {
  return {
    id: overrides.id ?? 'question-cuid-12345',
    documentId: overrides.documentId ?? 'doc-cuid-1234567890',
    questionType: overrides.questionType ?? 'multiple_choice',
    questionText: overrides.questionText ?? 'Test question?',
    correctAnswer: overrides.correctAnswer ?? 'A',
    explanation: 'Test explanation',
    sourceEvidence: 'Test evidence',
    options: {
      type: 'multiple_choice',
      choices: [
        { id: 'A', text: 'Option A', isCorrect: true },
        { id: 'B', text: 'Option B', isCorrect: false },
      ],
    },
    bloomLevel: 'remember',
    difficulty: 'medium',
    targetConceptName: 'Test Concept',
    teacherSelected: true,
    flagReason: null,
    flagged: false,
    groundingScore: 0.95,
    imageUrl: null,
    imageAltText: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create a mock quiz attempt for testing
 */
export function createMockAttempt(overrides: Partial<{
  id: string;
  quizId: string;
  userId: string;
  status: 'in_progress' | 'submitted' | 'graded';
}> = {}) {
  return {
    id: overrides.id ?? 'attempt-cuid-12345',
    quizId: overrides.quizId ?? 'quiz-cuid-123456789',
    userId: overrides.userId ?? 'test-user-cuid12345',
    status: overrides.status ?? 'in_progress',
    score: null,
    maxScore: null,
    startedAt: new Date(),
    submittedAt: null,
  };
}
