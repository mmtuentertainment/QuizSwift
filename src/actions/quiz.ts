'use server';

/**
 * Server Actions for quiz management
 *
 * Handles:
 * - Creating quizzes from selected questions
 * - Fetching quizzes for documents
 * - Updating quiz settings
 * - Publishing workflow (CONT-06: requires teacher preview)
 * - Archiving quizzes
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { handlePrismaError } from '@/lib/prisma-errors';
import { cuidSchema } from '@/lib/action-utils';
import { QuizStatus, ShowResultsOption } from '@/generated/prisma/client';
import {
  QUIZ_TIME_LIMIT,
  QUIZ_TITLE_LENGTH,
  QUIZ_DESCRIPTION_MAX_LENGTH,
} from '@/lib/questions/validation';

const CreateQuizSchema = z.object({
  documentId: z.string().cuid(),
  title: z.string().min(QUIZ_TITLE_LENGTH.MIN).max(QUIZ_TITLE_LENGTH.MAX),
  description: z.string().max(QUIZ_DESCRIPTION_MAX_LENGTH).optional(),
  questionIds: z.array(z.string().cuid()).min(1),
  timeLimit: z.number().int().min(QUIZ_TIME_LIMIT.MIN).max(QUIZ_TIME_LIMIT.MAX).nullable().optional(),
  shuffleQuestions: z.boolean().optional(),
});

export async function createQuiz(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  // Parse and validate questionIds from FormData
  const rawQuestionIds = formData.get('questionIds');
  let parsedIds: unknown;
  try {
    parsedIds = rawQuestionIds ? JSON.parse(rawQuestionIds as string) : [];
  } catch {
    return { error: 'Invalid question IDs format: malformed JSON' };
  }

  const questionIdsResult = z.array(z.string()).safeParse(parsedIds);
  if (!questionIdsResult.success) {
    console.error('[createQuiz] Invalid questionIds:', questionIdsResult.error.flatten());
    return { error: 'Invalid question IDs format: expected array of strings' };
  }
  const questionIds = questionIdsResult.data;

  const parsed = CreateQuizSchema.safeParse({
    documentId: formData.get('documentId'),
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    questionIds,
    timeLimit: formData.get('timeLimit') ? parseInt(formData.get('timeLimit') as string) : null,
    shuffleQuestions: formData.get('shuffleQuestions') === 'true',
  });

  if (!parsed.success) {
    return { error: 'Invalid input', details: parsed.error.flatten() };
  }

  // Verify user owns the document
  const document = await prisma.document.findUnique({
    where: { id: parsed.data.documentId },
    select: { uploadedById: true },
  });

  if (!document || document.uploadedById !== session.user.id) {
    return { error: 'Document not found or access denied' };
  }

  // Create quiz with questions
  try {
    const quiz = await prisma.quiz.create({
      data: {
        documentId: parsed.data.documentId,
        title: parsed.data.title,
        description: parsed.data.description,
        timeLimit: parsed.data.timeLimit,
        shuffleQuestions: parsed.data.shuffleQuestions ?? false,
        createdById: session.user.id,
        status: QuizStatus.draft,
        questions: {
          create: parsed.data.questionIds.map((questionId, idx) => ({
            questionId,
            position: idx,
            points: 1.0,
          })),
        },
      },
    });

    revalidatePath(`/documents/${parsed.data.documentId}/quiz`);
    redirect(`/documents/${parsed.data.documentId}/quiz/${quiz.id}`);
  } catch (error) {
    return { error: handlePrismaError(error) };
  }
}

type QuizListItem = Awaited<ReturnType<typeof fetchQuizzesForDocument>>[number];

async function fetchQuizzesForDocument(documentId: string, userId: string) {
  return prisma.quiz.findMany({
    where: {
      documentId,
      createdById: userId,
    },
    include: {
      _count: {
        select: { questions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export type GetQuizzesResult =
  | { success: true; quizzes: QuizListItem[] }
  | { success: false; error: string };

export async function getQuizzesForDocument(documentId: string): Promise<GetQuizzesResult> {
  // Validate CUID format
  const idCheck = cuidSchema.safeParse(documentId);
  if (!idCheck.success) return { success: false, error: 'Invalid document ID format' };

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const quizzes = await fetchQuizzesForDocument(documentId, session.user.id);
    return { success: true, quizzes };
  } catch (error) {
    return { success: false, error: handlePrismaError(error) };
  }
}

type QuizWithQuestions = NonNullable<Awaited<ReturnType<typeof fetchQuizWithQuestions>>>;

async function fetchQuizWithQuestions(quizId: string) {
  return prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { question: true },
        orderBy: { position: 'asc' },
      },
      document: {
        select: { id: true, fileName: true },
      },
    },
  });
}

export type GetQuizWithQuestionsResult =
  | { success: true; quiz: QuizWithQuestions }
  | { success: false; error: 'unauthenticated' | 'not_found' | 'access_denied' | 'database_error' };

export async function getQuizWithQuestions(quizId: string): Promise<GetQuizWithQuestionsResult> {
  // Validate CUID format - return 'not_found' for consistency with existing error types
  const idCheck = cuidSchema.safeParse(quizId);
  if (!idCheck.success) return { success: false, error: 'not_found' };

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'unauthenticated' };
  }

  try {
    const quiz = await fetchQuizWithQuestions(quizId);

    if (!quiz) {
      return { success: false, error: 'not_found' };
    }

    if (quiz.createdById !== session.user.id) {
      return { success: false, error: 'access_denied' };
    }

    return { success: true, quiz };
  } catch (error) {
    // Log full error for debugging, return appropriate error type
    console.error('[getQuizWithQuestions] Database error:', error);
    return { success: false, error: 'database_error' };
  }
}

// =============================================================================
// Quiz Settings Update
// =============================================================================

export const UpdateQuizSettingsSchema = z.object({
  title: z.string().min(QUIZ_TITLE_LENGTH.MIN).max(QUIZ_TITLE_LENGTH.MAX).optional(),
  description: z.string().max(QUIZ_DESCRIPTION_MAX_LENGTH).nullable().optional(),
  timeLimit: z.number().int().min(QUIZ_TIME_LIMIT.MIN).max(QUIZ_TIME_LIMIT.MAX).nullable().optional(),
  shuffleQuestions: z.boolean().optional(),
  showResults: z.nativeEnum(ShowResultsOption).optional(),
});

export type UpdateQuizSettingsInput = z.infer<typeof UpdateQuizSettingsSchema>;

/**
 * Update quiz settings (title, description, time limit, etc.)
 */
export async function updateQuizSettings(
  quizId: string,
  data: UpdateQuizSettingsInput
): Promise<{ success: boolean; error?: string }> {
  // Validate CUID format
  const idCheck = cuidSchema.safeParse(quizId);
  if (!idCheck.success) return { success: false, error: 'Invalid quiz ID format' };

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = UpdateQuizSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  // Guard against empty update data
  if (Object.keys(parsed.data).length === 0) {
    return { success: true }; // No fields to update, return success
  }

  // Verify ownership
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { createdById: true, documentId: true },
  });

  if (!quiz || quiz.createdById !== session.user.id) {
    return { success: false, error: 'Quiz not found or access denied' };
  }

  try {
    await prisma.quiz.update({
      where: { id: quizId },
      data: parsed.data,
    });

    revalidatePath(`/documents/${quiz.documentId}/quiz/${quizId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: handlePrismaError(error) };
  }
}

// =============================================================================
// Quiz Publishing (CONT-06: Requires preview before publish)
// =============================================================================

/**
 * Publish a quiz after teacher has previewed it.
 *
 * CONT-06: Quiz cannot be published unless teacherPreviewedAt is set.
 * This ensures teachers verify the quiz before students can access it.
 */
export async function publishQuiz(
  quizId: string
): Promise<{ success: boolean; error?: string }> {
  // Validate CUID format
  const idCheck = cuidSchema.safeParse(quizId);
  if (!idCheck.success) return { success: false, error: 'Invalid quiz ID format' };

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  // Fetch quiz with preview status
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      createdById: true,
      documentId: true,
      status: true,
      teacherPreviewedAt: true,
    },
  });

  if (!quiz) {
    return { success: false, error: 'Quiz not found' };
  }

  if (quiz.createdById !== session.user.id) {
    return { success: false, error: 'Access denied' };
  }

  if (quiz.status === QuizStatus.published) {
    return { success: false, error: 'Quiz is already published' };
  }

  if (quiz.status === QuizStatus.archived) {
    return { success: false, error: 'Archived quizzes cannot be published' };
  }

  // CONT-06: Enforce preview requirement
  if (!quiz.teacherPreviewedAt) {
    return {
      success: false,
      error: 'Quiz must be previewed before publishing. Please complete the teacher preview first.',
    };
  }

  // Publish the quiz
  try {
    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        status: QuizStatus.published,
        publishedAt: new Date(),
      },
    });

    revalidatePath(`/documents/${quiz.documentId}/quiz/${quizId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: handlePrismaError(error) };
  }
}

/**
 * Unpublish a quiz (revert to draft)
 */
export async function unpublishQuiz(
  quizId: string
): Promise<{ success: boolean; error?: string }> {
  // Validate CUID format
  const idCheck = cuidSchema.safeParse(quizId);
  if (!idCheck.success) return { success: false, error: 'Invalid quiz ID format' };

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { createdById: true, documentId: true, status: true },
  });

  if (!quiz || quiz.createdById !== session.user.id) {
    return { success: false, error: 'Quiz not found or access denied' };
  }

  if (quiz.status !== QuizStatus.published) {
    return { success: false, error: 'Quiz is not published' };
  }

  try {
    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        status: QuizStatus.draft,
        publishedAt: null,
      },
    });

    revalidatePath(`/documents/${quiz.documentId}/quiz/${quizId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: handlePrismaError(error) };
  }
}

/**
 * Archive a quiz (soft delete)
 */
export async function archiveQuiz(
  quizId: string
): Promise<{ success: boolean; error?: string }> {
  // Validate CUID format
  const idCheck = cuidSchema.safeParse(quizId);
  if (!idCheck.success) return { success: false, error: 'Invalid quiz ID format' };

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { createdById: true, documentId: true },
  });

  if (!quiz || quiz.createdById !== session.user.id) {
    return { success: false, error: 'Quiz not found or access denied' };
  }

  try {
    await prisma.quiz.update({
      where: { id: quizId },
      data: { status: QuizStatus.archived },
    });

    revalidatePath(`/documents/${quiz.documentId}/quiz/${quizId}`);
    revalidatePath(`/documents/${quiz.documentId}/quiz`);
    return { success: true };
  } catch (error) {
    return { success: false, error: handlePrismaError(error) };
  }
}
