import { describe, it, expect } from 'vitest';
import { gradeAnswer, isAutoGradable, calculateTotalScore } from '../grading';
import type { QuestionOptions, AnswerData, QuestionType } from '../types';

describe('gradeAnswer', () => {
  describe('multiple_choice', () => {
    const mcOptions: QuestionOptions = {
      type: 'multiple_choice',
      choices: [
        { id: 'A', text: 'Option A', isCorrect: true },
        { id: 'B', text: 'Option B', isCorrect: false },
      ],
    };

    it('grades correct answer', () => {
      const answer: AnswerData = { type: 'multiple_choice', selectedChoiceId: 'A' };
      const result = gradeAnswer('multiple_choice', mcOptions, answer);
      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(1);
    });

    it('grades incorrect answer', () => {
      const answer: AnswerData = { type: 'multiple_choice', selectedChoiceId: 'B' };
      const result = gradeAnswer('multiple_choice', mcOptions, answer);
      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });

    it('handles null options', () => {
      const answer: AnswerData = { type: 'multiple_choice', selectedChoiceId: 'A' };
      const result = gradeAnswer('multiple_choice', null, answer);
      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toBe('Invalid question options');
    });
  });

  describe('true_false', () => {
    const tfOptions: QuestionOptions = { type: 'true_false', correctAnswer: true };

    it('grades correct answer', () => {
      const answer: AnswerData = { type: 'true_false', answer: true };
      const result = gradeAnswer('true_false', tfOptions, answer);
      expect(result.isCorrect).toBe(true);
    });

    it('grades incorrect answer', () => {
      const answer: AnswerData = { type: 'true_false', answer: false };
      const result = gradeAnswer('true_false', tfOptions, answer);
      expect(result.isCorrect).toBe(false);
    });
  });

  describe('true_false_justify', () => {
    const tfjOptions: QuestionOptions = { type: 'true_false', correctAnswer: false };

    it('grades true_false_justify type correctly', () => {
      const answer: AnswerData = { type: 'true_false', answer: false };
      const result = gradeAnswer('true_false_justify', tfjOptions, answer);
      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(1);
    });

    it('grades incorrect true_false_justify answer', () => {
      const answer: AnswerData = { type: 'true_false', answer: true };
      const result = gradeAnswer('true_false_justify', tfjOptions, answer);
      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });
  });

  describe('fill_in_blank', () => {
    const fibOptions: QuestionOptions = {
      type: 'fill_in_blank',
      blanks: [
        { index: 0, acceptedAnswers: ['Paris', 'paris'], caseSensitive: false },
        { index: 1, acceptedAnswers: ['France'], caseSensitive: true },
      ],
    };

    it('grades all correct', () => {
      const answer: AnswerData = { type: 'fill_in_blank', blanks: ['PARIS', 'France'] };
      const result = gradeAnswer('fill_in_blank', fibOptions, answer);
      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(1);
    });

    it('gives partial credit', () => {
      const answer: AnswerData = { type: 'fill_in_blank', blanks: ['Paris', 'france'] };
      const result = gradeAnswer('fill_in_blank', fibOptions, answer);
      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0.5);
      expect(result.feedback).toBe('1/2 blanks correct');
    });

    it('respects case sensitivity', () => {
      const answer: AnswerData = { type: 'fill_in_blank', blanks: ['Paris', 'france'] };
      const result = gradeAnswer('fill_in_blank', fibOptions, answer);
      expect(result.pointsEarned).toBe(0.5); // First correct (case insensitive), second wrong (case sensitive)
    });
  });

  describe('fill_blank alias', () => {
    const fibOptions: QuestionOptions = {
      type: 'fill_in_blank',
      blanks: [{ index: 0, acceptedAnswers: ['Paris'], caseSensitive: false }],
    };

    it('grades fill_blank type alias correctly', () => {
      const answer: AnswerData = { type: 'fill_in_blank', blanks: ['Paris'] };
      const result = gradeAnswer('fill_blank', fibOptions, answer);
      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(1);
    });
  });

  describe('matching', () => {
    const matchOptions: QuestionOptions = {
      type: 'matching',
      pairs: [
        { id: '1', left: 'A', right: '1' },
        { id: '2', left: 'B', right: '2' },
      ],
    };

    it('grades all correct pairs', () => {
      const answer: AnswerData = {
        type: 'matching',
        pairs: [{ leftId: '1', rightId: '1' }, { leftId: '2', rightId: '2' }],
      };
      const result = gradeAnswer('matching', matchOptions, answer);
      expect(result.isCorrect).toBe(true);
    });

    it('gives partial credit', () => {
      const answer: AnswerData = {
        type: 'matching',
        pairs: [{ leftId: '1', rightId: '1' }, { leftId: '2', rightId: '1' }],
      };
      const result = gradeAnswer('matching', matchOptions, answer);
      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0.5);
    });

    it('handles all incorrect pairs', () => {
      const answer: AnswerData = {
        type: 'matching',
        pairs: [{ leftId: '1', rightId: '2' }, { leftId: '2', rightId: '1' }],
      };
      const result = gradeAnswer('matching', matchOptions, answer);
      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
      expect(result.feedback).toBe('0/2 pairs correct');
    });
  });

  describe('manual grading types', () => {
    it('essay requires manual grading', () => {
      const answer: AnswerData = { type: 'essay', text: 'My essay', wordCount: 2 };
      const result = gradeAnswer('essay', null, answer);
      expect(result.feedback).toBe('Requires manual grading');
    });

    it('short_answer requires manual grading', () => {
      const answer: AnswerData = { type: 'short_answer', text: 'Short answer', wordCount: 2 };
      const result = gradeAnswer('short_answer', null, answer);
      expect(result.feedback).toBe('Requires manual grading');
    });

    it('show_work requires manual grading', () => {
      const answer: AnswerData = { type: 'show_work', finalAnswer: '42', canvasState: {} };
      const result = gradeAnswer('show_work', null, answer);
      expect(result.feedback).toBe('Requires manual grading');
    });
  });

  describe('custom maxPoints', () => {
    const mcOptions: QuestionOptions = {
      type: 'multiple_choice',
      choices: [
        { id: 'A', text: 'Option A', isCorrect: true },
        { id: 'B', text: 'Option B', isCorrect: false },
      ],
    };

    it('respects custom maxPoints for correct answers', () => {
      const answer: AnswerData = { type: 'multiple_choice', selectedChoiceId: 'A' };
      const result = gradeAnswer('multiple_choice', mcOptions, answer, 5);
      expect(result.pointsEarned).toBe(5);
      expect(result.maxPoints).toBe(5);
    });

    it('returns zero points for incorrect with custom maxPoints', () => {
      const answer: AnswerData = { type: 'multiple_choice', selectedChoiceId: 'B' };
      const result = gradeAnswer('multiple_choice', mcOptions, answer, 5);
      expect(result.pointsEarned).toBe(0);
      expect(result.maxPoints).toBe(5);
    });

    it('calculates partial credit with custom maxPoints', () => {
      const fibOptions: QuestionOptions = {
        type: 'fill_in_blank',
        blanks: [
          { index: 0, acceptedAnswers: ['A'], caseSensitive: false },
          { index: 1, acceptedAnswers: ['B'], caseSensitive: false },
        ],
      };
      const answer: AnswerData = { type: 'fill_in_blank', blanks: ['A', 'wrong'] };
      const result = gradeAnswer('fill_in_blank', fibOptions, answer, 10);
      expect(result.pointsEarned).toBe(5); // 50% of 10 points
      expect(result.maxPoints).toBe(10);
    });
  });

  describe('answer type mismatches', () => {
    const mcOptions: QuestionOptions = {
      type: 'multiple_choice',
      choices: [
        { id: 'A', text: 'A', isCorrect: true },
        { id: 'B', text: 'B', isCorrect: false },
      ],
    };

    it('returns invalid answer format for MC question with TF answer', () => {
      const wrongAnswer: AnswerData = { type: 'true_false', answer: true };
      const result = gradeAnswer('multiple_choice', mcOptions, wrongAnswer);
      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toBe('Invalid answer format');
    });

    it('returns invalid answer format for TF question with MC answer', () => {
      const tfOptions: QuestionOptions = { type: 'true_false', correctAnswer: true };
      const wrongAnswer: AnswerData = { type: 'multiple_choice', selectedChoiceId: 'A' };
      const result = gradeAnswer('true_false', tfOptions, wrongAnswer);
      expect(result.isCorrect).toBe(false);
      expect(result.feedback).toBe('Invalid answer format');
    });
  });

  it('handles null answer', () => {
    const result = gradeAnswer('multiple_choice', null, null);
    expect(result.feedback).toBe('No answer provided');
  });

  it('handles unknown question type', () => {
    // Cast to bypass type checking - this tests the runtime default case
    const result = gradeAnswer('unknown_type' as QuestionType, null, { type: 'multiple_choice', selectedChoiceId: 'A' });
    expect(result.feedback).toContain('Unknown question type');
  });
});

describe('isAutoGradable', () => {
  it('returns true for auto-gradable types', () => {
    expect(isAutoGradable('multiple_choice')).toBe(true);
    expect(isAutoGradable('true_false')).toBe(true);
    expect(isAutoGradable('fill_in_blank')).toBe(true);
    expect(isAutoGradable('matching')).toBe(true);
  });

  it('returns true for type aliases', () => {
    expect(isAutoGradable('true_false_justify')).toBe(true);
    expect(isAutoGradable('fill_blank')).toBe(true);
  });

  it('returns false for manual grading types', () => {
    expect(isAutoGradable('essay')).toBe(false);
    expect(isAutoGradable('short_answer')).toBe(false);
    expect(isAutoGradable('show_work')).toBe(false);
  });
});

describe('calculateTotalScore', () => {
  it('calculates totals correctly', () => {
    const results = [
      { isCorrect: true, pointsEarned: 1, maxPoints: 1 },
      { isCorrect: false, pointsEarned: 0.5, maxPoints: 1 },
      { isCorrect: true, pointsEarned: 2, maxPoints: 2 },
    ];
    const total = calculateTotalScore(results);
    expect(total.totalEarned).toBe(3.5);
    expect(total.totalMax).toBe(4);
    expect(total.percentage).toBe(87.5);
  });

  it('handles empty array', () => {
    const total = calculateTotalScore([]);
    expect(total.totalEarned).toBe(0);
    expect(total.totalMax).toBe(0);
    expect(total.percentage).toBe(0);
  });
});
