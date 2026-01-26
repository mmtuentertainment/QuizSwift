-- Rename fileUrl column to storageKey for R2 migration
-- This supports the transition from Vercel Blob (full URLs) to Cloudflare R2 (storage keys)

ALTER TABLE "Document" RENAME COLUMN "fileUrl" TO "storageKey";
