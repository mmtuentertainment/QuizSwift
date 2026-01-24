import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: { uploadedById: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        status: true,
        totalPages: true,
        createdAt: true,
        _count: {
          select: { questions: true },
        },
      },
    });

    return NextResponse.json({
      documents: documents.map((doc) => ({
        ...doc,
        questionCount: doc._count.questions,
        _count: undefined,
      })),
    });
  } catch (error) {
    console.error('Documents list error:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}
