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
  QuestionType,
} from './types';

import {
  isMultipleChoiceOptions,
  isTrueFalseOptions,
  isFillInBlankOptions,
  isMatchingOptions,
  isMCAnswer,
  isTFAnswer,
  isFillBlankAnswer,
  isMatchingAnswer,
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
  questionType: QuestionType,
  options: QuestionOptions | null,
  answerData: AnswerData | null,
  maxPoints: number = 1.0
): GradeResult {
  if (!answerData) {
    return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'No answer provided' };
  }

  switch (questionType) {
    case 'multiple_choice': {
      // Use type guards for safe type narrowing
      if (!options || !isMultipleChoiceOptions(options)) {
        return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid question options' };
      }
      if (!isMCAnswer(answerData)) {
        return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid answer format' };
      }

      const correctChoice = options.choices.find((c) => c.isCorrect);
      const isCorrect = answerData.selectedChoiceId === correctChoice?.id;
      return {
        isCorrect,
        pointsEarned: isCorrect ? maxPoints : 0,
        maxPoints,
      };
    }

    case 'true_false':
    case 'true_false_justify': {
      // Use type guards for safe type narrowing
      if (!options || !isTrueFalseOptions(options)) {
        return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid question options' };
      }
      if (!isTFAnswer(answerData)) {
        return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid answer format' };
      }

      const isCorrect = answerData.answer === options.correctAnswer;
      return {
        isCorrect,
        pointsEarned: isCorrect ? maxPoints : 0,
        maxPoints,
      };
    }

    case 'fill_in_blank':
    case 'fill_blank': {
      // Use type guards for safe type narrowing
      if (!options || !isFillInBlankOptions(options)) {
        return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid question options' };
      }
      if (!isFillBlankAnswer(answerData)) {
        return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid answer format' };
      }

      let correctCount = 0;
      const totalBlanks = options.blanks.length;

      options.blanks.forEach((blank, idx) => {
        const studentAnswer = (answerData.blanks[idx] || '').trim();
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
      // Use type guards for safe type narrowing
      if (!options || !isMatchingOptions(options)) {
        return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid question options' };
      }
      if (!isMatchingAnswer(answerData)) {
        return { isCorrect: false, pointsEarned: 0, maxPoints, feedback: 'Invalid answer format' };
      }

      let correctCount = 0;
      const totalPairs = options.pairs.length;

      // Matching pairs use the same id for both left and right items in the correct answer.
      // A student's match is correct when they pair items that share the same id (leftId === rightId).
      // This approach simplifies grading since we don't need a separate mapping structure.
      answerData.pairs.forEach((match) => {
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
export function isAutoGradable(questionType: QuestionType): boolean {
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
