import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    // Verify document ownership
    const document = await prisma.document.findFirst({
      where: {
        id,
        uploadedById: session.user.id,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const questions = await prisma.extractedQuestion.findMany({
      where: { documentId: id },
      orderBy: [
        { pageNumber: 'asc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        questionText: true,
        questionType: true,
        options: true,
        correctAnswer: true,
        sourceQuote: true,
        pageNumber: true,
        verified: true,
        verificationScore: true,
        flagged: true,
        flagReason: true,
      },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Questions fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}
