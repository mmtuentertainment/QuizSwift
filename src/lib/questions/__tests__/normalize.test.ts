import { describe, it, expect } from 'vitest';
import { normalizeQuestionOptions } from '../normalize';

describe('normalizeQuestionOptions', () => {
  describe('multiple_choice', () => {
    it('transforms string array to structured format', () => {
      const options = ['Paris', 'London', 'Berlin', 'Madrid'];
      const result = normalizeQuestionOptions('multiple_choice', options, 'Paris');

      expect(result).toEqual({
        type: 'multiple_choice',
        choices: [
          { id: 'A', text: 'Paris', isCorrect: true },
          { id: 'B', text: 'London', isCorrect: false },
          { id: 'C', text: 'Berlin', isCorrect: false },
          { id: 'D', text: 'Madrid', isCorrect: false },
        ],
      });
    });

    it('matches correct answer by letter ID', () => {
      const options = ['Option A', 'Option B', 'Option C'];
      const result = normalizeQuestionOptions('multiple_choice', options, 'B');

      expect(result).toEqual({
        type: 'multiple_choice',
        choices: [
          { id: 'A', text: 'Option A', isCorrect: false },
          { id: 'B', text: 'Option B', isCorrect: true },
          { id: 'C', text: 'Option C', isCorrect: false },
        ],
      });
    });

    it('matches correct answer by full text (case insensitive)', () => {
      const options = ['True', 'False'];
      const result = normalizeQuestionOptions('multiple_choice', options, 'true');

      expect(result).toEqual({
        type: 'multiple_choice',
        choices: [
          { id: 'A', text: 'True', isCorrect: true },
          { id: 'B', text: 'False', isCorrect: false },
        ],
      });
    });

    it('returns structured format as-is', () => {
      const options = {
        type: 'multiple_choice' as const,
        choices: [
          { id: 'A', text: 'Answer A', isCorrect: true },
          { id: 'B', text: 'Answer B', isCorrect: false },
        ],
      };
      const result = normalizeQuestionOptions('multiple_choice', options);

      expect(result).toEqual(options);
    });

    it('creates empty choices when null', () => {
      const result = normalizeQuestionOptions('multiple_choice', null, 'Answer');

      expect(result).toEqual({
        type: 'multiple_choice',
        choices: [],
      });
    });

    it('defaults first option as correct when no answer provided', () => {
      const options = ['First', 'Second'];
      const result = normalizeQuestionOptions('multiple_choice', options);

      expect(result).toEqual({
        type: 'multiple_choice',
        choices: [
          { id: 'A', text: 'First', isCorrect: true },
          { id: 'B', text: 'Second', isCorrect: false },
        ],
      });
    });
  });

  describe('true_false', () => {
    it('creates structured format with correctAnswer boolean', () => {
      const result = normalizeQuestionOptions('true_false', null, 'True');

      expect(result).toEqual({
        type: 'true_false',
        correctAnswer: true,
      });
    });

    it('handles false answer', () => {
      const result = normalizeQuestionOptions('true_false', null, 'False');

      expect(result).toEqual({
        type: 'true_false',
        correctAnswer: false,
      });
    });

    it('returns structured format as-is', () => {
      const options = {
        type: 'true_false' as const,
        correctAnswer: false,
      };
      const result = normalizeQuestionOptions('true_false', options);

      expect(result).toEqual(options);
    });

    it('handles legacy true_false_justify type', () => {
      const result = normalizeQuestionOptions('true_false_justify', null, 'true');

      expect(result).toEqual({
        type: 'true_false',
        correctAnswer: true,
      });
    });
  });

  describe('fill_in_blank', () => {
    it('creates structured format from null with correctAnswer', () => {
      const result = normalizeQuestionOptions('fill_in_blank', null, 'answer');

      expect(result).toEqual({
        type: 'fill_in_blank',
        blanks: [{ index: 0, acceptedAnswers: ['answer'], caseSensitive: false }],
      });
    });

    it('transforms array of answers to blanks', () => {
      const options = ['answer1', 'answer2'];
      const result = normalizeQuestionOptions('fill_in_blank', options);

      expect(result).toEqual({
        type: 'fill_in_blank',
        blanks: [
          { index: 0, acceptedAnswers: ['answer1'], caseSensitive: false },
          { index: 1, acceptedAnswers: ['answer2'], caseSensitive: false },
        ],
      });
    });

    it('returns structured format as-is', () => {
      const options = {
        type: 'fill_in_blank' as const,
        blanks: [{ index: 0, acceptedAnswers: ['test'], caseSensitive: true }],
      };
      const result = normalizeQuestionOptions('fill_in_blank', options);

      expect(result).toEqual(options);
    });

    it('handles legacy fill_blank type', () => {
      const result = normalizeQuestionOptions('fill_blank', null, 'answer');

      expect(result).toEqual({
        type: 'fill_in_blank',
        blanks: [{ index: 0, acceptedAnswers: ['answer'], caseSensitive: false }],
      });
    });
  });

  describe('matching', () => {
    it('creates empty pairs from null', () => {
      const result = normalizeQuestionOptions('matching', null);

      expect(result).toEqual({
        type: 'matching',
        pairs: [],
      });
    });

    it('transforms alternating array to pairs', () => {
      const options = ['Term A', 'Definition 1', 'Term B', 'Definition 2'];
      const result = normalizeQuestionOptions('matching', options);

      expect(result).toEqual({
        type: 'matching',
        pairs: [
          { id: '0', left: 'Term A', right: 'Definition 1' },
          { id: '1', left: 'Term B', right: 'Definition 2' },
        ],
      });
    });

    it('returns structured format as-is', () => {
      const options = {
        type: 'matching' as const,
        pairs: [{ id: '0', left: 'A', right: 'B' }],
      };
      const result = normalizeQuestionOptions('matching', options);

      expect(result).toEqual(options);
    });
  });

  describe('short_answer', () => {
    it('creates minimal structured format', () => {
      const result = normalizeQuestionOptions('short_answer', null);

      expect(result).toEqual({
        type: 'short_answer',
      });
    });

    it('returns structured format as-is', () => {
      const options = {
        type: 'short_answer' as const,
      };
      const result = normalizeQuestionOptions('short_answer', options);

      expect(result).toEqual(options);
    });
  });

  describe('show_work', () => {
    it('creates structured format with empty workingSteps', () => {
      const result = normalizeQuestionOptions('show_work', null);

      expect(result).toEqual({
        type: 'show_work',
        workingSteps: [],
      });
    });

    it('transforms array to workingSteps', () => {
      const options = ['Step 1', 'Step 2'];
      const result = normalizeQuestionOptions('show_work', options);

      expect(result).toEqual({
        type: 'show_work',
        workingSteps: ['Step 1', 'Step 2'],
      });
    });

    it('returns structured format as-is', () => {
      const options = {
        type: 'show_work' as const,
        workingSteps: ['a', 'b'],
      };
      const result = normalizeQuestionOptions('show_work', options);

      expect(result).toEqual(options);
    });
  });

  describe('essay', () => {
    it('creates minimal structured format', () => {
      const result = normalizeQuestionOptions('essay', null);

      expect(result).toEqual({
        type: 'essay',
      });
    });

    it('returns structured format as-is', () => {
      const options = {
        type: 'essay' as const,
        minWords: 50,
        maxWords: 500,
      };
      const result = normalizeQuestionOptions('essay', options);

      expect(result).toEqual(options);
    });
  });

  describe('edge cases', () => {
    it('handles undefined options', () => {
      const result = normalizeQuestionOptions('multiple_choice', undefined);

      expect(result).toEqual({
        type: 'multiple_choice',
        choices: [],
      });
    });

    it('handles unknown question type', () => {
      const result = normalizeQuestionOptions('unknown_type', ['a', 'b'], 'a');

      expect(result).toBeNull();
    });

    it('handles empty array options for multiple choice', () => {
      const result = normalizeQuestionOptions('multiple_choice', []);

      expect(result).toEqual({
        type: 'multiple_choice',
        choices: [],
      });
    });

    it('adds type field to legacy objects missing type', () => {
      const options = { choices: [{ id: 'A', text: 'Test', isCorrect: true }] };
      const result = normalizeQuestionOptions('multiple_choice', options);

      expect(result).toEqual({
        type: 'multiple_choice',
        choices: [{ id: 'A', text: 'Test', isCorrect: true }],
      });
    });
  });
});
