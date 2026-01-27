-- Convert status string fields to PostgreSQL enum types
-- This migration requires manual USING clauses because Prisma cannot auto-generate them

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('draft', 'preview_required', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ShowResultsOption" AS ENUM ('after_submit', 'after_due', 'manual');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('in_progress', 'submitted', 'graded');

-- AlterTable: Convert Quiz status fields to enum types
ALTER TABLE "Quiz"
  ALTER COLUMN "status" TYPE "QuizStatus" USING "status"::"QuizStatus",
  ALTER COLUMN "showResults" TYPE "ShowResultsOption" USING "showResults"::"ShowResultsOption";

-- AlterTable: Convert QuizAttempt status field to enum type
ALTER TABLE "QuizAttempt"
  ALTER COLUMN "status" TYPE "AttemptStatus" USING "status"::"AttemptStatus";

-- Set default values for the enum columns
ALTER TABLE "Quiz"
  ALTER COLUMN "status" SET DEFAULT 'draft'::"QuizStatus",
  ALTER COLUMN "showResults" SET DEFAULT 'after_submit'::"ShowResultsOption";

ALTER TABLE "QuizAttempt"
  ALTER COLUMN "status" SET DEFAULT 'in_progress'::"AttemptStatus";
