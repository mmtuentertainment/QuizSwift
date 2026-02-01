/**
 * Image Upload Presigned URL Endpoint
 *
 * Returns a presigned URL for direct client-to-R2 image uploads.
 * Validates file type and size before generating the URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getImageUploadUrl,
  isValidImageExtension,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_IMAGE_SIZE,
} from '@/lib/storage/images';

interface UploadRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    let body: Partial<UploadRequest>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { fileName, contentType, fileSize } = body;

    // Validate required fields
    if (!fileName || !contentType || typeof fileSize !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, contentType, fileSize' },
        { status: 400 }
      );
    }

    // Validate file extension
    if (!isValidImageExtension(fileName)) {
      return NextResponse.json(
        { error: `Invalid file extension. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Server-side validation (duplicated for security)
    if (!ALLOWED_IMAGE_TYPES.includes(contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return NextResponse.json(
        {
          error: `Invalid image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (fileSize > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          error: `Image too large. Maximum: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    if (fileSize <= 0) {
      return NextResponse.json(
        { error: 'File size must be greater than 0' },
        { status: 400 }
      );
    }

    // Generate presigned URL
    const result = await getImageUploadUrl(
      session.user.id,
      fileName,
      contentType,
      fileSize
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Image upload URL error:', error);

    // Return the specific error message if it's a validation error
    if (error instanceof Error) {
      const isValidationError =
        error.message.includes('Invalid image type') ||
        error.message.includes('too large') ||
        error.message.includes('must be greater');

      if (isValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
