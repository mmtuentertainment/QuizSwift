'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export interface QuestionFilters {
  documentId?: string;
  questionType?: string;
  bloomLevel?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface QuestionsResult {
  questions: Awaited<ReturnType<typeof fetchQuestions>>;
  total: number;
  page: number;
  totalPages: number;
}

async function fetchQuestions(where: object, skip: number, take: number) {
  return prisma.curatedQuestion.findMany({
    where,
    include: {
      document: {
        select: { id: true, fileName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });
}

/**
 * Get paginated questions with filtering support for the question bank.
 * Only returns questions that belong to documents uploaded by the current user.
 */
export async function getQuestions(filters: QuestionFilters = {}): Promise<QuestionsResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { questions: [], total: 0, page: 1, totalPages: 0 };
  }

  const { documentId, questionType, bloomLevel, search, page = 1, limit = 20 } = filters;

  // Build where clause with proper typing
  const where: {
    document: { uploadedById: string };
    teacherSelected: boolean;
    documentId?: string;
    questionType?: string;
    bloomLevel?: string;
    questionText?: { contains: string; mode: 'insensitive' };
  } = {
    document: {
      uploadedById: session.user.id,
    },
    teacherSelected: true, // Only show selected questions in bank
  };

  if (documentId) {
    where.documentId = documentId;
  }

  if (questionType) {
    where.questionType = questionType;
  }

  if (bloomLevel) {
    where.bloomLevel = bloomLevel;
  }

  if (search) {
    where.questionText = {
      contains: search,
      mode: 'insensitive',
    };
  }

  const [questions, total] = await Promise.all([
    fetchQuestions(where, (page - 1) * limit, limit),
    prisma.curatedQuestion.count({ where }),
  ]);

  return {
    questions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export interface TeacherDocument {
  id: string;
  fileName: string;
  _count: {
    curatedQuestions: number;
  };
}

/**
 * Get all documents with curated questions for the current teacher.
 * Used for the document filter dropdown in question bank.
 */
export async function getTeacherDocuments(): Promise<TeacherDocument[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  return prisma.document.findMany({
    where: {
      uploadedById: session.user.id,
      curationStatus: 'complete',
    },
    select: {
      id: true,
      fileName: true,
      _count: {
        select: { curatedQuestions: { where: { teacherSelected: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update a curated question's content.
 * Only allows updating questions from documents owned by the current user.
 */
export async function updateQuestion(
  questionId: string,
  data: {
    questionText?: string;
    correctAnswer?: string;
    explanation?: string;
    options?: unknown;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify ownership
  const question = await prisma.curatedQuestion.findFirst({
    where: {
      id: questionId,
      document: {
        uploadedById: session.user.id,
      },
    },
  });

  if (!question) {
    return { success: false, error: 'Question not found or access denied' };
  }

  await prisma.curatedQuestion.update({
    where: { id: questionId },
    data: {
      questionText: data.questionText,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
      options: data.options as object | undefined,
    },
  });

  return { success: true };
}
