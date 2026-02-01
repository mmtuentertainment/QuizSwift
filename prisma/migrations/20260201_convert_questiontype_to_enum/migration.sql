-- Convert QuestionType string fields to PostgreSQL enum type
-- This migration follows the same pattern as 20260127_convert_status_to_enums
-- Pattern: Preflight validation → Create enum → Drop defaults → Convert types → Re-add defaults

-- Preflight validation: Ensure all existing values are valid QuestionType options
-- Abort migration if any invalid values found (prevents database corruption)
DO $$
DECLARE
  invalid_extracted_question_type INTEGER;
  invalid_curated_question_type INTEGER;
BEGIN
  -- Check ExtractedQuestion.questionType values
  SELECT COUNT(*) INTO invalid_extracted_question_type
  FROM "ExtractedQuestion"
  WHERE "questionType" NOT IN ('multiple_choice', 'true_false', 'fill_in_blank', 'matching', 'essay', 'short_answer', 'show_work');

  IF invalid_extracted_question_type > 0 THEN
    RAISE EXCEPTION 'Found % ExtractedQuestion records with invalid questionType values. Fix before migration.', invalid_extracted_question_type;
  END IF;

  -- Check CuratedQuestion.questionType values
  SELECT COUNT(*) INTO invalid_curated_question_type
  FROM "CuratedQuestion"
  WHERE "questionType" NOT IN ('multiple_choice', 'true_false', 'fill_in_blank', 'matching', 'essay', 'short_answer', 'show_work');

  IF invalid_curated_question_type > 0 THEN
    RAISE EXCEPTION 'Found % CuratedQuestion records with invalid questionType values. Fix before migration.', invalid_curated_question_type;
  END IF;

  RAISE NOTICE 'Preflight validation passed: all questionType values are valid enum options';
END $$;

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('multiple_choice', 'true_false', 'fill_in_blank', 'matching', 'essay', 'short_answer', 'show_work');

-- AlterTable: Convert ExtractedQuestion.questionType to enum type
-- No default to drop since field is required (NOT NULL without default)
ALTER TABLE "ExtractedQuestion"
  ALTER COLUMN "questionType" TYPE "QuestionType" USING "questionType"::"QuestionType";

-- AlterTable: Convert CuratedQuestion.questionType to enum type
-- No default to drop since field is required (NOT NULL without default)
ALTER TABLE "CuratedQuestion"
  ALTER COLUMN "questionType" TYPE "QuestionType" USING "questionType"::"QuestionType";
