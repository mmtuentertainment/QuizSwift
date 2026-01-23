import { put, del, head } from '@vercel/blob';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['application/pdf'];

export interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
}

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
  const pathname = `documents/${userId}/${timestamp}-${safeName}`;

  const blob = await put(pathname, file, {
    access: 'public',
    contentType: file.type,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: file.type,
    size: file.size,
  };
}

export async function deletePdf(url: string): Promise<void> {
  await del(url);
}

export async function getPdfMetadata(url: string) {
  return head(url);
}
