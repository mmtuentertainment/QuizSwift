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

const CreateQuizSchema = z.object({
  documentId: z.string().cuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  questionIds: z.array(z.string().cuid()).min(1),
  timeLimit: z.number().int().min(1).max(300).nullable().optional(),
  shuffleQuestions: z.boolean().optional(),
});

export async function createQuiz(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  // Parse questionIds with error handling
  let questionIds: string[] = [];
  try {
    const rawQuestionIds = formData.get('questionIds');
    questionIds = rawQuestionIds ? JSON.parse(rawQuestionIds as string) : [];
  } catch (error) {
    console.error('[createQuiz] Failed to parse questionIds:', error);
    return { error: 'Invalid question IDs format' };
  }

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
        status: 'draft',
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
  | { success: false; error: 'unauthenticated' | 'not_found' | 'access_denied' };

export async function getQuizWithQuestions(quizId: string): Promise<GetQuizWithQuestionsResult> {
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
  } catch {
    // Database error - treat as not found to avoid leaking error details
    return { success: false, error: 'not_found' };
  }
}

// =============================================================================
// Quiz Settings Update
// =============================================================================

const UpdateQuizSettingsSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  timeLimit: z.number().int().min(1).max(300).nullable().optional(),
  shuffleQuestions: z.boolean().optional(),
  showResults: z.enum(['after_submit', 'after_due', 'manual']).optional(),
});

export type UpdateQuizSettingsInput = z.infer<typeof UpdateQuizSettingsSchema>;

/**
 * Update quiz settings (title, description, time limit, etc.)
 */
export async function updateQuizSettings(
  quizId: string,
  data: UpdateQuizSettingsInput
): Promise<{ success: boolean; error?: string }> {
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

  if (quiz.status === 'published') {
    return { success: false, error: 'Quiz is already published' };
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
        status: 'published',
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

  if (quiz.status !== 'published') {
    return { success: false, error: 'Quiz is not published' };
  }

  try {
    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        status: 'draft',
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
      data: { status: 'archived' },
    });

    revalidatePath(`/documents/${quiz.documentId}/quiz/${quizId}`);
    revalidatePath(`/documents/${quiz.documentId}/quiz`);
    return { success: true };
  } catch (error) {
    return { success: false, error: handlePrismaError(error) };
  }
}
