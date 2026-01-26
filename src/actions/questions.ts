'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

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

// =============================================================================
// Question Update with Zod Validation
// =============================================================================

/**
 * Zod schema for question update validation
 * Validates questionText, options, correctAnswer, explanation, sourceEvidence
 */
const UpdateQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text cannot be empty').max(5000).optional(),
  correctAnswer: z.string().min(1, 'Correct answer cannot be empty').max(2000).optional(),
  explanation: z.string().max(5000).optional(),
  sourceEvidence: z.string().max(5000).optional(),
  options: z.unknown().optional(), // JSON structure varies by question type
  imageUrl: z.string().nullable().optional(),
  imageAltText: z.string().max(500).nullable().optional(),
});

export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;

/**
 * Update a curated question's content with Zod validation.
 * Only allows updating questions from documents owned by the current user.
 *
 * CONT-07: Teacher can edit question text, answers, or explanation
 */
export async function updateQuestion(
  questionId: string,
  data: UpdateQuestionInput
): Promise<{ success: boolean; error?: string; details?: ReturnType<z.ZodError['flatten']> }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate input with Zod
  const parsed = UpdateQuestionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input', details: parsed.error.flatten() };
  }

  // Verify ownership - user must own the document the question belongs to
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

  // Build update data, only including fields that were provided
  const updateData: {
    questionText?: string;
    correctAnswer?: string;
    explanation?: string;
    sourceEvidence?: string;
    options?: object;
    imageUrl?: string | null;
    imageAltText?: string | null;
  } = {};

  if (parsed.data.questionText !== undefined) {
    updateData.questionText = parsed.data.questionText;
  }
  if (parsed.data.correctAnswer !== undefined) {
    updateData.correctAnswer = parsed.data.correctAnswer;
  }
  if (parsed.data.explanation !== undefined) {
    updateData.explanation = parsed.data.explanation;
  }
  if (parsed.data.sourceEvidence !== undefined) {
    updateData.sourceEvidence = parsed.data.sourceEvidence;
  }
  if (parsed.data.options !== undefined) {
    updateData.options = parsed.data.options as object;
  }
  if (parsed.data.imageUrl !== undefined) {
    updateData.imageUrl = parsed.data.imageUrl;
  }
  if (parsed.data.imageAltText !== undefined) {
    updateData.imageAltText = parsed.data.imageAltText;
  }

  await prisma.curatedQuestion.update({
    where: { id: questionId },
    data: updateData,
  });

  return { success: true };
}

/**
 * Get a single question with all details for editing
 */
export async function getQuestionForEdit(questionId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  return prisma.curatedQuestion.findFirst({
    where: {
      id: questionId,
      document: {
        uploadedById: session.user.id,
      },
    },
    include: {
      document: {
        select: { id: true, fileName: true },
      },
    },
  });
}
