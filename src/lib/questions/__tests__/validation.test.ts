import { describe, it, expect } from 'vitest';
import {
  multipleChoiceOptionsSchema,
  trueFalseOptionsSchema,
  fillInBlankOptionsSchema,
  matchingOptionsSchema,
  essayOptionsSchema,
  questionOptionsSchema,
  mcAnswerSchema,
  tfAnswerSchema,
  fillBlankAnswerSchema,
  matchingAnswerSchema,
} from '../validation';

describe('Question Options Schemas', () => {
  describe('multipleChoiceOptionsSchema', () => {
    it('validates correct structure', () => {
      const valid = {
        type: 'multiple_choice',
        choices: [
          { id: 'A', text: 'Option A', isCorrect: true },
          { id: 'B', text: 'Option B', isCorrect: false },
        ],
      };
      expect(multipleChoiceOptionsSchema.safeParse(valid).success).toBe(true);
    });

    it('requires exactly one correct choice', () => {
      const invalid = {
        type: 'multiple_choice',
        choices: [
          { id: 'A', text: 'Option A', isCorrect: true },
          { id: 'B', text: 'Option B', isCorrect: true },
        ],
      };
      expect(multipleChoiceOptionsSchema.safeParse(invalid).success).toBe(false);
    });

    it('requires 2-6 choices', () => {
      const tooFew = {
        type: 'multiple_choice',
        choices: [{ id: 'A', text: 'Only one', isCorrect: true }],
      };
      expect(multipleChoiceOptionsSchema.safeParse(tooFew).success).toBe(false);
    });
  });

  describe('trueFalseOptionsSchema', () => {
    it('validates correct structure', () => {
      expect(trueFalseOptionsSchema.safeParse({ type: 'true_false', correctAnswer: true }).success).toBe(true);
      expect(trueFalseOptionsSchema.safeParse({ type: 'true_false', correctAnswer: false }).success).toBe(true);
    });
  });

  describe('fillInBlankOptionsSchema', () => {
    it('validates correct structure', () => {
      const valid = {
        type: 'fill_in_blank',
        blanks: [{ index: 0, acceptedAnswers: ['answer1'], caseSensitive: false }],
      };
      expect(fillInBlankOptionsSchema.safeParse(valid).success).toBe(true);
    });

    it('requires non-empty acceptedAnswers', () => {
      const invalid = {
        type: 'fill_in_blank',
        blanks: [{ index: 0, acceptedAnswers: [], caseSensitive: false }],
      };
      expect(fillInBlankOptionsSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('matchingOptionsSchema', () => {
    it('requires minimum 2 pairs', () => {
      const tooFew = { type: 'matching', pairs: [{ id: '1', left: 'A', right: 'B' }] };
      expect(matchingOptionsSchema.safeParse(tooFew).success).toBe(false);
    });

    it('validates 2+ pairs', () => {
      const valid = {
        type: 'matching',
        pairs: [
          { id: '1', left: 'A', right: 'B' },
          { id: '2', left: 'C', right: 'D' },
        ],
      };
      expect(matchingOptionsSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('essayOptionsSchema', () => {
    it('allows optional word limits', () => {
      expect(essayOptionsSchema.safeParse({ type: 'essay' }).success).toBe(true);
      expect(essayOptionsSchema.safeParse({ type: 'essay', minWords: 100, maxWords: 500 }).success).toBe(true);
    });
  });

  describe('questionOptionsSchema discriminated union', () => {
    it('narrows type based on discriminant', () => {
      const mc = { type: 'multiple_choice', choices: [{ id: 'A', text: 'A', isCorrect: true }, { id: 'B', text: 'B', isCorrect: false }] };
      const tf = { type: 'true_false', correctAnswer: true };

      expect(questionOptionsSchema.safeParse(mc).success).toBe(true);
      expect(questionOptionsSchema.safeParse(tf).success).toBe(true);
    });
  });
});

describe('Answer Schemas', () => {
  describe('mcAnswerSchema', () => {
    it('validates selected choice', () => {
      expect(mcAnswerSchema.safeParse({ selectedChoiceId: 'A' }).success).toBe(true);
      expect(mcAnswerSchema.safeParse({ selectedChoiceId: '' }).success).toBe(false);
    });
  });

  describe('tfAnswerSchema', () => {
    it('validates boolean answer', () => {
      expect(tfAnswerSchema.safeParse({ answer: true }).success).toBe(true);
      expect(tfAnswerSchema.safeParse({ answer: false }).success).toBe(true);
      expect(tfAnswerSchema.safeParse({ answer: 'true' }).success).toBe(false);
    });
  });

  describe('fillBlankAnswerSchema', () => {
    it('validates blanks array', () => {
      expect(fillBlankAnswerSchema.safeParse({ blanks: ['a', 'b'] }).success).toBe(true);
      expect(fillBlankAnswerSchema.safeParse({ blanks: [] }).success).toBe(true);
    });
  });

  describe('matchingAnswerSchema', () => {
    it('validates pairs array', () => {
      const valid = { pairs: [{ leftId: '1', rightId: '2' }] };
      expect(matchingAnswerSchema.safeParse(valid).success).toBe(true);
    });
  });
});
