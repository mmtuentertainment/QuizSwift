/**
 * Tests for quiz server action validation utilities
 *
 * Note: Full server action integration tests require more complex setup
 * with proper Prisma mocking. This file tests the validation layer.
 *
 * For CONT-06 (preview before publish) testing, see:
 * - E2E tests (when implemented)
 * - Manual testing via /documents/[id]/quiz/[quizId]/preview
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { cuidSchema, validateCuid } from '../../lib/action-utils';

// Note: We simulate UpdateQuizSettingsSchema here instead of importing from quiz.ts
// because quiz.ts has server-only dependencies (@/lib/auth, @/lib/prisma, next/cache,
// next/navigation) that cannot be easily mocked in Vitest without mocking the entire
// dependency chain. The simulated schema matches the actual implementation.

describe('cuidSchema', () => {
  it('validates correct CUID format', () => {
    // Standard CUID2 format (starts with 'c')
    expect(cuidSchema.safeParse('cm1abcdef12345678901234').success).toBe(true);
    expect(cuidSchema.safeParse('cm6abc123xyz789def012abc').success).toBe(true);
  });

  it('rejects invalid CUID formats', () => {
    // Too short
    expect(cuidSchema.safeParse('cm1abc').success).toBe(false);
    // Empty string
    expect(cuidSchema.safeParse('').success).toBe(false);
    // Random UUID (not CUID)
    expect(cuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(false);
    // Pure numbers
    expect(cuidSchema.safeParse('12345678901234567890').success).toBe(false);
  });

  it('rejects SQL injection attempts', () => {
    expect(cuidSchema.safeParse("'; DROP TABLE users; --").success).toBe(false);
    expect(cuidSchema.safeParse('1 OR 1=1').success).toBe(false);
  });
});

describe('validateCuid', () => {
  it('returns valid=true for correct CUID', () => {
    const result = validateCuid('cm1abcdef12345678901234', 'Quiz ID');
    expect(result.valid).toBe(true);
  });

  it('returns valid=false with error message for invalid CUID', () => {
    const result = validateCuid('invalid-id', 'Quiz ID');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('Invalid Quiz ID format');
    }
  });

  it('uses default label when not provided', () => {
    const result = validateCuid('invalid');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('Invalid ID format');
    }
  });
});

describe('server action input validation patterns', () => {
  // These tests verify the validation patterns used in server actions
  // Schemas are simulated here to avoid importing server-only dependencies

  it('validates quiz settings update input', () => {
    // Simulates UpdateQuizSettingsSchema from quiz.ts
    // Server action file has server-only deps that require complex mocking
    const UpdateQuizSettingsSchema = z.object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(500).nullable().optional(),
      timeLimit: z.number().int().min(1).max(300).nullable().optional(),
      shuffleQuestions: z.boolean().optional(),
    });

    // Valid input
    expect(UpdateQuizSettingsSchema.safeParse({
      title: 'My Quiz',
      timeLimit: 30,
    }).success).toBe(true);

    // Empty update is valid
    expect(UpdateQuizSettingsSchema.safeParse({}).success).toBe(true);

    // Title too long
    expect(UpdateQuizSettingsSchema.safeParse({
      title: 'a'.repeat(201),
    }).success).toBe(false);

    // Invalid timeLimit
    expect(UpdateQuizSettingsSchema.safeParse({
      timeLimit: 0,
    }).success).toBe(false);
    expect(UpdateQuizSettingsSchema.safeParse({
      timeLimit: 301,
    }).success).toBe(false);
  });

  it('validates question update input', () => {
    // Simulates the UpdateQuestionSchema pattern from questions.ts
    const questionTextSchema = z.string().min(1).max(5000).optional();
    const correctAnswerSchema = z.string().min(1).max(2000).optional();

    // Valid question text
    expect(questionTextSchema.safeParse('What is 2+2?').success).toBe(true);

    // Empty question text rejected
    expect(questionTextSchema.safeParse('').success).toBe(false);

    // Too long question text
    expect(questionTextSchema.safeParse('a'.repeat(5001)).success).toBe(false);

    // Valid answer
    expect(correctAnswerSchema.safeParse('4').success).toBe(true);
  });
});

describe('CUID early rejection pattern', () => {
  /**
   * This test documents the CUID validation pattern used in server actions.
   *
   * Pattern:
   * 1. Validate CUID format BEFORE any database queries
   * 2. Return early with error if invalid
   * 3. This prevents unnecessary database round-trips for malformed IDs
   *
   * Example from publishQuiz:
   * ```
   * const idCheck = cuidSchema.safeParse(quizId);
   * if (!idCheck.success) return { success: false, error: 'Invalid quiz ID format' };
   * // ... then proceed with database query
   * ```
   */
  it('demonstrates early rejection pattern', () => {
    // Simulate server action flow
    function simulatedServerAction(quizId: string) {
      // Step 1: CUID validation (early rejection)
      const idCheck = cuidSchema.safeParse(quizId);
      if (!idCheck.success) {
        return { success: false, error: 'Invalid quiz ID format', dbCalled: false };
      }

      // Step 2: Would normally call database here
      // const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });

      return { success: true, error: null, dbCalled: true };
    }

    // Invalid ID - database NOT called
    const invalid = simulatedServerAction('invalid');
    expect(invalid.success).toBe(false);
    expect(invalid.dbCalled).toBe(false);

    // Valid ID - database would be called
    const valid = simulatedServerAction('cm1abcdef12345678901234');
    expect(valid.success).toBe(true);
    expect(valid.dbCalled).toBe(true);
  });
});
