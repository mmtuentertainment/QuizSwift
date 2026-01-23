import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uploadPdf } from '@/lib/storage/blob';
import { inngest } from '@/inngest/client';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const uploadResult = await uploadPdf(file, session.user.id);

    // Create Document record
    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileUrl: uploadResult.url,
        fileSize: uploadResult.size,
        mimeType: uploadResult.contentType,
        status: 'pending',
        uploadedById: session.user.id,
      },
    });

    // Trigger Inngest background processing
    await inngest.send({
      name: 'pdf/uploaded',
      data: {
        documentId: document.id,
        fileUrl: document.fileUrl,
        fileName: document.fileName,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        status: document.status,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
