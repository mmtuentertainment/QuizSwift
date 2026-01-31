import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uploadPdf, deletePdf } from '@/lib/storage/pdf-storage';
import { inngest } from '@/inngest/client';
import { checkRateLimit, rateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 10 uploads per hour per user
    const rateLimitResult = checkRateLimit(`upload:${session.user.id}`, RATE_LIMITS.upload);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many uploads. Please try again later.',
          retryAfter: rateLimitResult.resetAt - Math.floor(Date.now() / 1000),
        },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Extract and validate question count
    const questionCountStr = formData.get('questionCount') as string | null;
    const requestedQuestionCount = questionCountStr ? parseInt(questionCountStr, 10) : 15;

    if (requestedQuestionCount < 5 || requestedQuestionCount > 50) {
      return NextResponse.json(
        { error: 'Question count must be between 5 and 50' },
        { status: 400 }
      );
    }

    // Upload to Cloudflare R2
    const uploadResult = await uploadPdf(file, session.user.id);

    // Create Document record - cleanup blob on failure
    let document;
    try {
      document = await prisma.document.create({
        data: {
          fileName: file.name,
          storageKey: uploadResult.storageKey,
          fileSize: uploadResult.size,
          mimeType: uploadResult.contentType,
          status: 'pending',
          uploadedById: session.user.id,
          requestedQuestionCount,
          curationStatus: 'pending',
        },
      });
    } catch (dbError) {
      // Clean up orphaned blob if database insert fails
      console.error('Database insert failed, cleaning up blob:', dbError);
      await deletePdf(uploadResult.storageKey);
      throw dbError;
    }

    // Trigger Inngest background processing
    await inngest.send({
      name: 'pdf/uploaded',
      data: {
        documentId: document.id,
        fileName: document.fileName,
        userId: session.user.id,
        requestedQuestionCount,
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.fileName,
        storageKey: document.storageKey,
        status: document.status,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
