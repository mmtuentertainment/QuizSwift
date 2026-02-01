-- Convert status string fields to PostgreSQL enum types
-- This migration requires manual USING clauses because Prisma cannot auto-generate them
-- Also requires dropping defaults before type conversion, then re-adding them

-- Preflight validation: Ensure all existing values are valid enum options
-- Abort migration if any invalid values found (prevents database corruption)
DO $$
DECLARE
  invalid_quiz_status INTEGER;
  invalid_show_results INTEGER;
  invalid_attempt_status INTEGER;
BEGIN
  -- Check Quiz.status values
  SELECT COUNT(*) INTO invalid_quiz_status
  FROM "Quiz"
  WHERE "status" NOT IN ('draft', 'preview_required', 'published', 'archived');

  IF invalid_quiz_status > 0 THEN
    RAISE EXCEPTION 'Found % Quiz records with invalid status values. Fix before migration.', invalid_quiz_status;
  END IF;

  -- Check Quiz.showResults values
  SELECT COUNT(*) INTO invalid_show_results
  FROM "Quiz"
  WHERE "showResults" NOT IN ('after_submit', 'after_due', 'manual');

  IF invalid_show_results > 0 THEN
    RAISE EXCEPTION 'Found % Quiz records with invalid showResults values. Fix before migration.', invalid_show_results;
  END IF;

  -- Check QuizAttempt.status values
  SELECT COUNT(*) INTO invalid_attempt_status
  FROM "QuizAttempt"
  WHERE "status" NOT IN ('in_progress', 'submitted', 'graded');

  IF invalid_attempt_status > 0 THEN
    RAISE EXCEPTION 'Found % QuizAttempt records with invalid status values. Fix before migration.', invalid_attempt_status;
  END IF;

  RAISE NOTICE 'Preflight validation passed: all status values are valid enum options';
END $$;

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('draft', 'preview_required', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ShowResultsOption" AS ENUM ('after_submit', 'after_due', 'manual');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('in_progress', 'submitted', 'graded');

-- Drop existing string defaults before type conversion
ALTER TABLE "Quiz"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "showResults" DROP DEFAULT;

ALTER TABLE "QuizAttempt"
  ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable: Convert Quiz status fields to enum types
ALTER TABLE "Quiz"
  ALTER COLUMN "status" TYPE "QuizStatus" USING "status"::"QuizStatus",
  ALTER COLUMN "showResults" TYPE "ShowResultsOption" USING "showResults"::"ShowResultsOption";

-- AlterTable: Convert QuizAttempt status field to enum type
ALTER TABLE "QuizAttempt"
  ALTER COLUMN "status" TYPE "AttemptStatus" USING "status"::"AttemptStatus";

-- Re-add default values for the enum columns
ALTER TABLE "Quiz"
  ALTER COLUMN "status" SET DEFAULT 'draft'::"QuizStatus",
  ALTER COLUMN "showResults" SET DEFAULT 'after_submit'::"ShowResultsOption";

ALTER TABLE "QuizAttempt"
  ALTER COLUMN "status" SET DEFAULT 'in_progress'::"AttemptStatus";
