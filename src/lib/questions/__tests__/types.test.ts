import { describe, it, expect } from 'vitest';
import {
  normalizeQuestionType,
  isValidQuestionType,
  isValidCanonicalQuestionType,
  QUESTION_TYPES,
  CANONICAL_QUESTION_TYPES,
} from '../types';

describe('normalizeQuestionType', () => {
  it('returns fill_in_blank for fill_blank input', () => {
    expect(normalizeQuestionType('fill_blank')).toBe('fill_in_blank');
  });

  it('returns true_false for true_false_justify input', () => {
    expect(normalizeQuestionType('true_false_justify')).toBe('true_false');
  });

  it('returns input unchanged for canonical types', () => {
    expect(normalizeQuestionType('multiple_choice')).toBe('multiple_choice');
    expect(normalizeQuestionType('essay')).toBe('essay');
    expect(normalizeQuestionType('short_answer')).toBe('short_answer');
    expect(normalizeQuestionType('matching')).toBe('matching');
    expect(normalizeQuestionType('true_false')).toBe('true_false');
    expect(normalizeQuestionType('fill_in_blank')).toBe('fill_in_blank');
    expect(normalizeQuestionType('show_work')).toBe('show_work');
  });

  it('returns input unchanged for unrecognized types', () => {
    expect(normalizeQuestionType('unknown_type')).toBe('unknown_type');
    expect(normalizeQuestionType('')).toBe('');
    expect(normalizeQuestionType('MULTIPLE_CHOICE')).toBe('MULTIPLE_CHOICE');
  });
});

describe('isValidQuestionType', () => {
  it('returns true for all QUESTION_TYPES values', () => {
    for (const type of QUESTION_TYPES) {
      expect(isValidQuestionType(type)).toBe(true);
    }
  });

  it('returns true for legacy aliases', () => {
    expect(isValidQuestionType('fill_blank')).toBe(true);
    expect(isValidQuestionType('true_false_justify')).toBe(true);
  });

  it('returns false for invalid strings', () => {
    expect(isValidQuestionType('invalid')).toBe(false);
    expect(isValidQuestionType('')).toBe(false);
    expect(isValidQuestionType('MULTIPLE_CHOICE')).toBe(false);
    expect(isValidQuestionType('MultipleChoice')).toBe(false);
  });
});

describe('isValidCanonicalQuestionType', () => {
  it('returns true for all CANONICAL_QUESTION_TYPES values', () => {
    for (const type of CANONICAL_QUESTION_TYPES) {
      expect(isValidCanonicalQuestionType(type)).toBe(true);
    }
  });

  it('returns false for legacy aliases', () => {
    expect(isValidCanonicalQuestionType('fill_blank')).toBe(false);
    expect(isValidCanonicalQuestionType('true_false_justify')).toBe(false);
  });

  it('returns false for invalid strings', () => {
    expect(isValidCanonicalQuestionType('invalid')).toBe(false);
    expect(isValidCanonicalQuestionType('')).toBe(false);
    expect(isValidCanonicalQuestionType('ESSAY')).toBe(false);
  });
});

describe('QUESTION_TYPES constant', () => {
  it('contains all 9 types (7 canonical + 2 legacy)', () => {
    expect(QUESTION_TYPES).toHaveLength(9);
  });

  it('includes legacy aliases fill_blank and true_false_justify', () => {
    expect(QUESTION_TYPES).toContain('fill_blank');
    expect(QUESTION_TYPES).toContain('true_false_justify');
  });
});

describe('CANONICAL_QUESTION_TYPES constant', () => {
  it('contains exactly 7 canonical types', () => {
    expect(CANONICAL_QUESTION_TYPES).toHaveLength(7);
  });

  it('does not include legacy aliases', () => {
    expect(CANONICAL_QUESTION_TYPES).not.toContain('fill_blank');
    expect(CANONICAL_QUESTION_TYPES).not.toContain('true_false_justify');
  });
});
