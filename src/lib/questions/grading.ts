/**
 * Auto-grading logic for quiz questions
 *
 * Supports automatic grading for:
 * - multiple_choice: Exact match against correct choice
 * - true_false: Boolean comparison
 * - fill_in_blank: Partial credit per blank, case-sensitive option
 * - matching: Partial credit per correct pair
 *
 * Essay, short_answer, and show_work require manual grading.
 */

import type {
  QuestionOptions,
  AnswerData,
  MultipleChoiceOptions,
  TrueFalseOptions,
  FillInBlankOptions,
  MatchingOptions,
  MCAnswer,
  TFAnswer,
  FillBlankAnswer,
  MatchingAnswer,
} from './types';

export interface GradeResult {
  isCorrect: boolean;
  pointsEarned: number;
  maxPoints: number;
  feedback?: string;
}

/**
 * Grade an answer for a given question type
 * Returns partial credit for fill-in-blank and matching
 */
export function gradeAnswer(
  questionType: string,
  options: QuestionOptions | null,
  answerData: AnswerData | null,
  maxPoints: number = 1.0
): GradeResult {
  if (!answerData) {
    return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'No answer provided' };
  }

  switch (questionType) {
    case 'multiple_choice': {
      const opts = options as MultipleChoiceOptions | null;
      const answer = answerData as MCAnswer;

      if (!opts?.choices) {
        return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid question options' };
      }

      const correctChoice = opts.choices.find((c) => c.isCorrect);
      const isCorrect = answer.selectedChoiceId === correctChoice?.id;
      return {
        isCorrect,
        pointsEarned: isCorrect ? maxPoints : 0,
        maxPoints,
      };
    }

    case 'true_false':
    case 'true_false_justify': {
      const opts = options as TrueFalseOptions | null;
      const answer = answerData as TFAnswer;

      if (opts?.correctAnswer === undefined) {
        return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid question options' };
      }

      const isCorrect = answer.answer === opts.correctAnswer;
      return {
        isCorrect,
        pointsEarned: isCorrect ? maxPoints : 0,
        maxPoints,
      };
    }

    case 'fill_in_blank':
    case 'fill_blank': {
      const opts = options as FillInBlankOptions | null;
      const answer = answerData as FillBlankAnswer;

      if (!opts?.blanks || !answer?.blanks) {
        return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid answer format' };
      }

      let correctCount = 0;
      const totalBlanks = opts.blanks.length;

      opts.blanks.forEach((blank, idx) => {
        const studentAnswer = (answer.blanks[idx] || '').trim();
        const isMatch = blank.acceptedAnswers.some((accepted) => {
          if (blank.caseSensitive) {
            return studentAnswer === accepted.trim();
          }
          return studentAnswer.toLowerCase() === accepted.trim().toLowerCase();
        });
        if (isMatch) correctCount++;
      });

      const isCorrect = correctCount === totalBlanks;
      const pointsEarned = totalBlanks > 0
        ? (correctCount / totalBlanks) * maxPoints
        : 0;

      return {
        isCorrect,
        pointsEarned,
        maxPoints,
        feedback: isCorrect ? undefined : `${correctCount}/${totalBlanks} blanks correct`,
      };
    }

    case 'matching': {
      const opts = options as MatchingOptions | null;
      const answer = answerData as MatchingAnswer;

      if (!opts?.pairs || !answer?.pairs) {
        return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid answer format' };
      }

      let correctCount = 0;
      const totalPairs = opts.pairs.length;

      // Matching is correct when leftId === rightId (since pairs share the same id)
      answer.pairs.forEach((match) => {
        if (match.leftId === match.rightId) {
          correctCount++;
        }
      });

      const isCorrect = correctCount === totalPairs;
      const pointsEarned = totalPairs > 0
        ? (correctCount / totalPairs) * maxPoints
        : 0;

      return {
        isCorrect,
        pointsEarned,
        maxPoints,
        feedback: isCorrect ? undefined : `${correctCount}/${totalPairs} pairs correct`,
      };
    }

    case 'essay':
    case 'short_answer':
    case 'show_work':
      // These require manual grading
      return {
        isCorrect: false,
        pointsEarned: 0,
        maxPoints,
        feedback: 'Requires manual grading',
      };

    default:
      return {
        isCorrect: false,
        pointsEarned: 0,
        maxPoints,
        feedback: `Unknown question type: ${questionType}`,
      };
  }
}

/**
 * Check if a question type can be auto-graded
 */
export function isAutoGradable(questionType: string): boolean {
  return [
    'multiple_choice',
    'true_false',
    'true_false_justify',
    'fill_in_blank',
    'fill_blank',
    'matching',
  ].includes(questionType);
}

/**
 * Calculate the total score for a set of graded answers
 */
export function calculateTotalScore(
  gradeResults: GradeResult[]
): { totalEarned: number; totalMax: number; percentage: number } {
  const totalEarned = gradeResults.reduce((sum, r) => sum + r.pointsEarned, 0);
  const totalMax = gradeResults.reduce((sum, r) => sum + r.maxPoints, 0);
  const percentage = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

  return { totalEarned, totalMax, percentage };
}
