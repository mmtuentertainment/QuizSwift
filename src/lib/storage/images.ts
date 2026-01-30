/**
 * Image Upload Utilities for Question Images (QUES-07)
 *
 * Provides presigned URL generation for client-side image uploads to R2.
 * Validates file types and sizes before generating upload URLs.
 */

import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getR2Bucket } from './r2-client';

// Configuration
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;
const UPLOAD_URL_EXPIRY = 60 * 5; // 5 minutes
const DOWNLOAD_URL_EXPIRY = 60 * 60 * 24; // 24 hours

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export interface ImageUploadResult {
  uploadUrl: string;
  storageKey: string;
}

/**
 * Validate that a content type is an allowed image type
 */
export function isAllowedImageType(
  contentType: string
): contentType is AllowedImageType {
  return ALLOWED_IMAGE_TYPES.includes(contentType as AllowedImageType);
}

/**
 * Sanitize filename to prevent path traversal attacks
 * - Removes all path separators (/, \)
 * - Removes .. patterns
 * - Keeps only alphanumeric, single dots, hyphens, underscores
 */
function sanitizeFileName(fileName: string): string {
  // Extract just the filename (remove any path components)
  const baseName = fileName.split(/[/\\]/).pop() || 'file';

  // Remove any .. patterns (path traversal attempts)
  const noDotDot = baseName.replace(/\.\./g, '');

  // Keep only safe characters, but preserve single dots for extension
  const safeName = noDotDot.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Collapse multiple consecutive dots/underscores
  const collapsed = safeName.replace(/\.{2,}/g, '.').replace(/_{2,}/g, '_');

  return collapsed || 'file';
}

/**
 * Generate presigned URL for client-side image upload
 *
 * @param userId - The user uploading the image
 * @param fileName - Original filename
 * @param contentType - MIME type
 * @param fileSize - File size in bytes
 * @returns Presigned upload URL and storage key
 * @throws Error if content type or file size is invalid
 */
export async function getImageUploadUrl(
  userId: string,
  fileName: string,
  contentType: string,
  fileSize: number
): Promise<ImageUploadResult> {
  // Validate content type
  if (!isAllowedImageType(contentType)) {
    throw new Error(
      `Invalid image type: ${contentType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
    );
  }

  // Validate file extension matches allowed image types
  if (!isValidImageExtension(fileName)) {
    throw new Error(
      'Invalid file extension. Allowed: .jpg, .jpeg, .png, .gif, .webp'
    );
  }

  // Validate file size
  if (fileSize > MAX_IMAGE_SIZE) {
    throw new Error(
      `Image too large: ${(fileSize / 1024 / 1024).toFixed(1)}MB. Maximum is ${MAX_IMAGE_SIZE / 1024 / 1024}MB.`
    );
  }

  // Validate file size is positive
  if (fileSize <= 0) {
    throw new Error('File size must be greater than 0');
  }

  // Create unique path: questions/images/{userId}/{timestamp}-{filename}
  const timestamp = Date.now();
  const safeName = sanitizeFileName(fileName);
  const storageKey = `questions/images/${userId}/${timestamp}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: storageKey,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  const uploadUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: UPLOAD_URL_EXPIRY,
  });

  return {
    uploadUrl,
    storageKey,
  };
}

/**
 * Generate presigned download URL for an image
 *
 * @param storageKey - The R2 storage key
 * @returns Presigned URL for viewing the image
 */
export async function getImageDownloadUrl(storageKey: string): Promise<string> {
  if (!storageKey) {
    throw new Error('Storage key is required');
  }

  const command = new GetObjectCommand({
    Bucket: getR2Bucket(),
    Key: storageKey,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: DOWNLOAD_URL_EXPIRY,
  });
}

/**
 * Get public URL for an image (if R2 bucket has public access configured)
 * Falls back to error if no public URL configured - use getImageDownloadUrl instead.
 *
 * @param storageKey - The R2 storage key
 * @returns Public URL for the image
 * @throws Error if R2_PUBLIC_URL is not configured
 */
export function getImagePublicUrl(storageKey: string): string {
  if (!storageKey) {
    throw new Error('Storage key is required');
  }

  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) {
    // Remove trailing slash if present
    const baseUrl = publicUrl.replace(/\/$/, '');
    return `${baseUrl}/${storageKey}`;
  }
  // No public URL - caller should use getImageDownloadUrl for presigned URLs
  throw new Error(
    'R2_PUBLIC_URL not configured. Use getImageDownloadUrl for presigned URLs.'
  );
}

/**
 * Check if a file extension is valid for images
 */
export function isValidImageExtension(fileName: string): boolean {
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return validExtensions.includes(ext);
}

/**
 * Resolve image URL from storage key or absolute URL.
 * Returns null if imageUrl is a storage key but R2 public URL is not configured.
 *
 * Use this for client-side image rendering where you need to convert storage keys
 * to full URLs. For server-side use, prefer getImageDownloadUrl() for presigned URLs.
 *
 * @example
 * ```typescript
 * const resolved = resolveImageUrl(question.imageUrl);
 * if (resolved) {
 *   <Image src={resolved} alt="..." />
 * }
 * ```
 */
export function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;

  const r2BaseUrl = process.env.NEXT_PUBLIC_R2_URL;
  if (!r2BaseUrl) return null;

  return `${r2BaseUrl}/${imageUrl}`;
}
