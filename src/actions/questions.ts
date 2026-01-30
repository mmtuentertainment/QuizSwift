'use server';

/**
 * Server Actions for question management
 *
 * Handles:
 * - Fetching questions with pagination and filtering (question bank)
 * - Getting teacher documents for filtering
 * - Updating question content (CONT-07: Teacher editing)
 * - Getting individual questions for editing
 */

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { handlePrismaError } from '@/lib/prisma-errors';
import { questionOptionsSchema } from '@/lib/questions/validation';

export interface QuestionFilters {
  documentId?: string;
  questionType?: string;
  bloomLevel?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export type QuestionsResult =
  | {
      success: true;
      questions: Awaited<ReturnType<typeof fetchQuestions>>;
      total: number;
      page: number;
      totalPages: number;
    }
  | { success: false; error: string };

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
    return { success: false, error: 'Authentication required' };
  }

  // Validate and clamp pagination inputs to safe ranges
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(filters.limit ?? 20)));
  const offset = Math.max(0, (page - 1) * limit);

  const { documentId, questionType, bloomLevel, search } = filters;

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

  try {
    const [questions, total] = await Promise.all([
      fetchQuestions(where, offset, limit),
      prisma.curatedQuestion.count({ where }),
    ]);

    return {
      success: true,
      questions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    return { success: false, error: handlePrismaError(error) };
  }
}

export interface TeacherDocument {
  id: string;
  fileName: string;
  _count: {
    curatedQuestions: number;
  };
}

export type TeacherDocumentsResult =
  | { success: true; documents: TeacherDocument[] }
  | { success: false; error: string };

/**
 * Get all documents with curated questions for the current teacher.
 * Used for the document filter dropdown in question bank.
 */
export async function getTeacherDocuments(): Promise<TeacherDocumentsResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const documents = await prisma.document.findMany({
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

    return { success: true, documents };
  } catch (error) {
    return { success: false, error: handlePrismaError(error) };
  }
}

// =============================================================================
// Question Update with Zod Validation
// =============================================================================

const UpdateQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text cannot be empty').max(5000).optional(),
  correctAnswer: z.string().min(1, 'Correct answer cannot be empty').max(2000).optional(),
  explanation: z.string().max(5000).optional(),
  sourceEvidence: z.string().max(5000).optional(),
  options: questionOptionsSchema.nullable().optional(),
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

  // Validate options.type matches questionType if options provided
  if (parsed.data.options && parsed.data.options.type !== question.questionType) {
    return {
      success: false,
      error: `Options type '${parsed.data.options.type}' does not match question type '${question.questionType}'`,
    };
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

  // Guard against empty updateData
  if (Object.keys(updateData).length === 0) {
    return { success: true }; // Nothing to update
  }

  try {
    await prisma.curatedQuestion.update({
      where: { id: questionId },
      data: updateData,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: handlePrismaError(error) };
  }
}

type QuestionForEdit = Awaited<ReturnType<typeof fetchQuestionForEdit>>;

async function fetchQuestionForEdit(questionId: string, userId: string) {
  return prisma.curatedQuestion.findFirst({
    where: {
      id: questionId,
      document: {
        uploadedById: userId,
      },
    },
    include: {
      document: {
        select: { id: true, fileName: true },
      },
    },
  });
}

export type GetQuestionForEditResult =
  | { success: true; question: NonNullable<QuestionForEdit> }
  | { success: false; error: string };

/**
 * Get a single question with all details for editing.
 * Returns error result if unauthenticated or question not found/accessible.
 */
export async function getQuestionForEdit(questionId: string): Promise<GetQuestionForEditResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const question = await fetchQuestionForEdit(questionId, session.user.id);

    if (!question) {
      return { success: false, error: 'Question not found or access denied' };
    }

    return { success: true, question };
  } catch (error) {
    return { success: false, error: handlePrismaError(error) };
  }
}
