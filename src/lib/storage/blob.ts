import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getR2Bucket } from './r2-client';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['application/pdf'];
const DOWNLOAD_URL_EXPIRY = 60 * 60; // 1 hour

export interface UploadResult {
  storageKey: string;
  size: number;
  contentType: string;
}

/**
 * Upload a PDF file to R2 storage
 * @param file - The PDF file to upload
 * @param userId - The user ID who owns the file
 * @returns Upload result with storage key and metadata
 */
export async function uploadPdf(
  file: File,
  userId: string
): Promise<UploadResult> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Only PDF files are allowed.`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${file.size} bytes. Maximum is ${MAX_FILE_SIZE} bytes.`);
  }

  // Create unique path: documents/{userId}/{timestamp}-{filename}
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storageKey = `documents/${userId}/${timestamp}-${safeName}`;

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to R2
  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: storageKey,
    Body: buffer,
    ContentType: file.type,
    ContentLength: file.size,
  });

  await getR2Client().send(command);

  return {
    storageKey,
    size: file.size,
    contentType: file.type,
  };
}

/**
 * Delete a PDF file from R2 storage
 * @param storageKey - The storage key of the file to delete
 */
export async function deletePdf(storageKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getR2Bucket(),
    Key: storageKey,
  });

  await getR2Client().send(command);
}

/**
 * Generate a presigned download URL for a PDF file
 * @param storageKey - The storage key of the file
 * @returns Presigned URL valid for 1 hour
 */
export async function getDownloadUrl(storageKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getR2Bucket(),
    Key: storageKey,
  });

  const url = await getSignedUrl(getR2Client(), command, {
    expiresIn: DOWNLOAD_URL_EXPIRY,
  });

  return url;
}

/**
 * Get metadata for a PDF file in R2 storage
 * @param storageKey - The storage key of the file
 * @returns Object metadata including content type, size, and last modified date
 */
export async function getPdfMetadata(storageKey: string) {
  const command = new HeadObjectCommand({
    Bucket: getR2Bucket(),
    Key: storageKey,
  });

  const metadata = await getR2Client().send(command);

  return {
    contentType: metadata.ContentType || 'application/octet-stream',
    size: metadata.ContentLength || 0,
    lastModified: metadata.LastModified,
    etag: metadata.ETag,
  };
}
