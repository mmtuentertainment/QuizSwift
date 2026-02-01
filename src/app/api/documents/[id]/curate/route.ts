import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/documents/[id]/curate
 * Returns all curated questions for a document
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ error: 'Failed to fetch curated questions' }, { status: 500 });
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
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Check for duplicate questionIds with conflicting selected values
    const selectionMap = new Map<string, boolean>();
    for (const selection of body.selections) {
      const existing = selectionMap.get(selection.questionId);
      if (existing !== undefined && existing !== selection.selected) {
        return NextResponse.json(
          { error: `Conflicting selection values for question ${selection.questionId}` },
          { status: 400 }
        );
      }
      selectionMap.set(selection.questionId, selection.selected);
    }

    // Validate all questionIds belong to this document
    const questionIds = [...selectionMap.keys()];
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

    // Batch update selections atomically (2 updates + 1 count in single transaction)
    // Use deduped selectionMap to derive toSelect/toDeselect
    const toSelect: string[] = [];
    const toDeselect: string[] = [];
    for (const [questionId, selected] of selectionMap) {
      if (selected) {
        toSelect.push(questionId);
      } else {
        toDeselect.push(questionId);
      }
    }

    const selectedCount = await prisma.$transaction(async (tx) => {
      if (toSelect.length > 0) {
        await tx.curatedQuestion.updateMany({
          where: {
            id: { in: toSelect },
            documentId: id,
          },
          data: { teacherSelected: true },
        });
      }

      if (toDeselect.length > 0) {
        await tx.curatedQuestion.updateMany({
          where: {
            id: { in: toDeselect },
            documentId: id,
          },
          data: { teacherSelected: false },
        });
      }

      // Return count within transaction for consistency
      return tx.curatedQuestion.count({
        where: { documentId: id, teacherSelected: true },
      });
    });

    return NextResponse.json({
      success: true,
      selectedCount,
      targetCount: document.requestedQuestionCount,
    });
  } catch (error) {
    console.error('Update selection error:', error);
    return NextResponse.json({ error: 'Failed to update selection' }, { status: 500 });
  }
}
