-- Fix vector column dimensions for mxbai-embed-large (1024 dimensions)
-- This migration changes from OpenAI's 1536 to Ollama's 1024 dimensions

-- Drop the existing embedding column and recreate with correct dimensions
ALTER TABLE "SourceChunk" DROP COLUMN IF EXISTS embedding;
ALTER TABLE "SourceChunk" ADD COLUMN embedding vector(1024);

-- Recreate the vector index for similarity search
DROP INDEX IF EXISTS "SourceChunk_embedding_idx";
CREATE INDEX "SourceChunk_embedding_idx" ON "SourceChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
