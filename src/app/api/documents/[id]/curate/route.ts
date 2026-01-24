import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/documents/[id]/curate
 * Returns all curated questions for a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Validate user owns document
    const document = await prisma.document.findUnique({
      where: { id },
      select: { uploadedById: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.uploadedById !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const questions = await prisma.curatedQuestion.findMany({
      where: { documentId: id, inCurationPool: true },
      orderBy: { rank: 'asc' },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Get curated questions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch curated questions' },
      { status: 500 }
    );
  }
}

interface SelectionUpdate {
  questionId: string;
  selected: boolean;
}

interface UpdateSelectionRequest {
  selections: SelectionUpdate[];
}

/**
 * PATCH /api/documents/[id]/curate
 * Updates selection status for questions
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Validate user owns document
    const document = await prisma.document.findUnique({
      where: { id },
      select: { uploadedById: true, requestedQuestionCount: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.uploadedById !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = (await request.json()) as UpdateSelectionRequest;

    if (!body.selections || !Array.isArray(body.selections)) {
      return NextResponse.json(
        { error: 'Invalid request body: selections array required' },
        { status: 400 }
      );
    }

    // Validate all questionIds belong to this document
    const questionIds = body.selections.map((s) => s.questionId);
    const validQuestions = await prisma.curatedQuestion.findMany({
      where: {
        id: { in: questionIds },
        documentId: id,
      },
      select: { id: true },
    });

    const validIds = new Set(validQuestions.map((q) => q.id));
    const invalidIds = questionIds.filter((qid) => !validIds.has(qid));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid question IDs: ${invalidIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Update selections
    for (const { questionId, selected } of body.selections) {
      await prisma.curatedQuestion.update({
        where: { id: questionId },
        data: { teacherSelected: selected },
      });
    }

    // Return updated counts
    const selectedCount = await prisma.curatedQuestion.count({
      where: { documentId: id, teacherSelected: true },
    });

    return NextResponse.json({
      success: true,
      selectedCount,
      targetCount: document.requestedQuestionCount,
    });
  } catch (error) {
    console.error('Update selection error:', error);
    return NextResponse.json(
      { error: 'Failed to update selection' },
      { status: 500 }
    );
  }
}
