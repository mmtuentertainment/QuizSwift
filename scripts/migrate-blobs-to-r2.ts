#!/usr/bin/env npx tsx
/**
 * One-time migration script: Vercel Blob → Cloudflare R2
 *
 * Usage: npx tsx scripts/migrate-blobs-to-r2.ts
 *
 * Prerequisites:
 * - R2 bucket created and configured
 * - Environment variables set (R2_*, CLOUDFLARE_ACCOUNT_ID)
 * - Run AFTER the Prisma migration that renames fileUrl → storageKey
 * - Old Vercel Blob URLs still accessible for reading
 */

import 'dotenv/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Dynamic import to work around TypeScript path alias issues in scripts folder
async function main() {
  // Validate environment variables
  const required = ['CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
  for (const envVar of required) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  // Create R2 client
  const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  const R2_BUCKET = process.env.R2_BUCKET_NAME!;

  // Dynamic import of Prisma client
  const { PrismaClient } = await import('../src/generated/prisma');
  const prisma = new PrismaClient();

  async function migrateDocument(doc: { id: string; storageKey: string }) {
    console.log(`Migrating: ${doc.id}`);

    // Download from Vercel Blob (storageKey currently contains the old URL)
    const response = await fetch(doc.storageKey);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${doc.storageKey}: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/pdf';

    // Extract path from URL to use as key
    // URL format: https://xxx.blob.vercel-storage.com/documents/userId/timestamp-file.pdf
    const url = new URL(doc.storageKey);
    const newStorageKey = url.pathname.slice(1); // Remove leading slash

    // Upload to R2
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: newStorageKey,
        Body: buffer,
        ContentType: contentType,
      })
    );

    // Update document record with R2 storage key
    await prisma.document.update({
      where: { id: doc.id },
      data: { storageKey: newStorageKey },
    });

    console.log(`  ✓ Migrated to: ${newStorageKey}`);
    return newStorageKey;
  }

  console.log('Starting Vercel Blob → R2 migration...\n');

  // Find all documents with Vercel Blob URLs (storageKey contains blob.vercel-storage.com)
  const documents = await prisma.document.findMany({
    where: {
      storageKey: { contains: 'blob.vercel-storage.com' },
    },
    select: { id: true, storageKey: true },
  });

  console.log(`Found ${documents.length} documents to migrate\n`);

  if (documents.length === 0) {
    console.log('No documents need migration.');
    await prisma.$disconnect();
    return;
  }

  let success = 0;
  let failed = 0;

  for (const doc of documents) {
    try {
      await migrateDocument(doc);
      success++;
    } catch (error) {
      console.error(`  ✗ Failed: ${error}`);
      failed++;
    }
  }

  console.log(`\nMigration complete: ${success} succeeded, ${failed} failed`);
  await prisma.$disconnect();
}

main().catch(console.error);
