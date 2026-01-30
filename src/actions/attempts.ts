'use server';

/**
 * Server Actions for quiz attempt management
 *
 * Handles:
 * - Starting a quiz attempt
 * - Submitting individual answers (with auto-grading)
 * - Completing an attempt (calculating final score)
 * - Marking quiz as previewed (teacher workflow)
 */

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { gradeAnswer, isAutoGradable } from '@/lib/questions/grading';
import type { AnswerData, QuestionOptions } from '@/lib/questions/types';
import { isValidQuestionType } from '@/lib/questions/types';
import { handlePrismaError } from '@/lib/prisma-errors';
import { AttemptStatus, QuizStatus } from '@/generated/prisma/client';

/**
 * Start or retrieve an existing quiz attempt for the current user
 */
export async function startAttempt(quizId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  // Verify user has access to the quiz
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      document: {
        select: { uploadedById: true },
      },
    },
  });

  if (!quiz) {
    return { error: 'Quiz not found' };
  }

  // Verify user owns the document (for now, only teachers can take quizzes)
  if (quiz.document.uploadedById !== session.user.id) {
    return { error: 'Access denied' };
  }

  // Use upsert to prevent race condition
  try {
    const attempt = await prisma.quizAttempt.upsert({
      where: {
        quizId_userId: {
          quizId,
          userId: session.user.id,
        },
      },
      update: {}, // No-op if exists
      create: {
        quizId,
        userId: session.user.id,
        status: AttemptStatus.in_progress,
      },
    });

    return { attemptId: attempt.id };
  } catch (error) {
    return { error: handlePrismaError(error) };
  }
}

/**
 * Submit an answer for a specific question in an attempt
 * Automatically grades objective question types
 */
export async function submitAnswer(
  attemptId: string,
  questionId: string,
  answerData: AnswerData
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  // Query 1: Verify attempt ownership and status (targeted query)
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      quizId: true,
    },
  });

  if (!attempt || attempt.userId !== session.user.id) {
    return { error: 'Attempt not found' };
  }

  if (attempt.status !== AttemptStatus.in_progress) {
    return { error: 'Attempt already submitted' };
  }

  // Query 2: Get the specific quiz question with its curated question
  const quizQuestion = await prisma.quizQuestion.findFirst({
    where: {
      quizId: attempt.quizId,
      questionId: questionId,
    },
    include: {
      question: true,
    },
  });

  if (!quizQuestion) {
    return { error: 'Question not in quiz' };
  }

  const question = quizQuestion.question;
  const points = quizQuestion.points;

  // Grade if auto-gradable (validate questionType from database first)
  let gradeResult = null;
  const questionType = question.questionType;
  if (isValidQuestionType(questionType) && isAutoGradable(questionType)) {
    gradeResult = gradeAnswer(
      questionType,
      question.options as QuestionOptions | null,
      answerData,
      points
    );
  }

  // Upsert answer (update if already exists)
  try {
    await prisma.questionAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      create: {
        attemptId,
        questionId,
        answerData: answerData as object,
        isCorrect: gradeResult?.isCorrect ?? null,
        pointsEarned: gradeResult?.pointsEarned ?? null,
        feedback: gradeResult?.feedback ?? null,
      },
      update: {
        answerData: answerData as object,
        isCorrect: gradeResult?.isCorrect ?? null,
        pointsEarned: gradeResult?.pointsEarned ?? null,
        feedback: gradeResult?.feedback ?? null,
        answeredAt: new Date(),
      },
    });

    return { success: true, gradeResult };
  } catch (error) {
    return { error: handlePrismaError(error) };
  }
}

/**
 * Complete a quiz attempt and calculate the final score
 */
export async function completeAttempt(attemptId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: true,
      quiz: {
        include: {
          questions: true,
        },
      },
    },
  });

  if (!attempt || attempt.userId !== session.user.id) {
    return { error: 'Attempt not found' };
  }

  if (attempt.status !== AttemptStatus.in_progress) {
    return { error: 'Attempt already submitted' };
  }

  // Calculate total score from graded answers
  const totalScore = attempt.answers.reduce(
    (sum, ans) => sum + (ans.pointsEarned ?? 0),
    0
  );
  const maxScore = attempt.quiz.questions.reduce(
    (sum, q) => sum + q.points,
    0
  );

  // Update attempt status
  try {
    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: AttemptStatus.submitted,
        submittedAt: new Date(),
        score: totalScore,
        maxScore,
      },
    });

    revalidatePath('/documents');

    return { success: true, score: totalScore, maxScore };
  } catch (error) {
    return { error: handlePrismaError(error) };
  }
}

/**
 * Mark a quiz as previewed by the teacher
 * Required before quiz can be published (CONT-06 workflow requirement)
 */
export async function markQuizPreviewed(quizId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { createdById: true, status: true },
  });

  if (!quiz) {
    return { error: 'Quiz not found' };
  }

  if (quiz.createdById !== session.user.id) {
    return { error: 'Access denied' };
  }

  try {
    await prisma.quiz.update({
      where: { id: quizId },
      data: {
        teacherPreviewedAt: new Date(),
        // After preview, quiz can now be published
        status: quiz.status === QuizStatus.draft ? QuizStatus.preview_required : quiz.status,
      },
    });

    revalidatePath('/documents');

    return { success: true };
  } catch (error) {
    return { error: handlePrismaError(error) };
  }
}

/**
 * Get an existing attempt with all answers for resuming
 */
export async function getAttemptWithAnswers(quizId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  try {
    const attempt = await prisma.quizAttempt.findUnique({
      where: {
        quizId_userId: {
          quizId,
          userId: session.user.id,
        },
      },
      include: {
        answers: {
          select: {
            questionId: true,
            answerData: true,
            isCorrect: true,
            pointsEarned: true,
            feedback: true,
          },
        },
      },
    });

    if (!attempt) {
      return { attempt: null, answers: [] };
    }

    return {
      attempt: {
        id: attempt.id,
        status: attempt.status,
        score: attempt.score,
        maxScore: attempt.maxScore,
      },
      answers: attempt.answers,
    };
  } catch (error) {
    return { error: handlePrismaError(error) };
  }
}
