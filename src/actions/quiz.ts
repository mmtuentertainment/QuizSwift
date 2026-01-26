'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

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

  const rawQuestionIds = formData.get('questionIds');
  const parsed = CreateQuizSchema.safeParse({
    documentId: formData.get('documentId'),
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    questionIds: rawQuestionIds ? JSON.parse(rawQuestionIds as string) : [],
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
}

export async function getQuizzesForDocument(documentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  return prisma.quiz.findMany({
    where: {
      documentId,
      createdById: session.user.id,
    },
    include: {
      _count: {
        select: { questions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getQuizWithQuestions(quizId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const quiz = await prisma.quiz.findUnique({
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

  if (!quiz || quiz.createdById !== session.user.id) {
    return null;
  }

  return quiz;
}
