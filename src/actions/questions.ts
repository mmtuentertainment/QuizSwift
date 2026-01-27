'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { auth } from '@/lib/auth';
import { z } from 'zod';

function handlePrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return 'A record with this information already exists.';
    if (error.code === 'P2003') return 'Referenced record not found.';
    if (error.code === 'P2025') return 'Record not found.';
  }
  console.error('Database error:', error);
  return 'Database operation failed. Please try again.';
}

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

  const [questions, total] = await Promise.all([
    fetchQuestions(where, offset, limit),
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
const questionOptionsSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('multiple_choice'),
    choices: z.array(z.object({
      id: z.string(),
      text: z.string(),
      isCorrect: z.boolean()
    }))
  }),
  z.object({
    type: z.literal('fill_in_blank'),
    blanks: z.array(z.object({
      index: z.number(),
      acceptedAnswers: z.array(z.string()),
      caseSensitive: z.boolean()
    }))
  }),
  z.object({
    type: z.literal('matching'),
    pairs: z.array(z.object({
      id: z.string(),
      left: z.string(),
      right: z.string()
    }))
  }),
  z.object({
    type: z.literal('true_false'),
    correctAnswer: z.boolean()
  }),
  z.object({
    type: z.literal('essay'),
    minWords: z.number().optional(),
    maxWords: z.number().optional(),
    rubric: z.string().optional()
  }),
  z.object({
    type: z.literal('short_answer')
  }),
  z.object({
    type: z.literal('show_work'),
    workingSteps: z.array(z.string())
  }),
]);

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
