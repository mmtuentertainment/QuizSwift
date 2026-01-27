/**
 * Question Components Barrel Export
 *
 * This module exports all question type components and the dispatcher.
 * Import from '@/components/questions' for cleaner imports.
 */

// Question type components
export { MultipleChoice, type MultipleChoiceOptions as MCComponentOptions } from './types/multiple-choice';
export { TrueFalse, type TrueFalseOptions as TFComponentOptions } from './types/true-false';
export { FillInBlank, type FillInBlankOptions as FIBComponentOptions } from './types/fill-in-blank';
export { Essay, type EssayOptions as EssayComponentOptions } from './types/essay';
export { Matching } from './types/matching';

// Image upload component
export { ImageUpload } from './image-upload';

// Dispatcher component
export { QuestionRenderer, type AnswerData } from './question-renderer';

// Re-export types from lib for convenience
export type {
  // Options types (from database schema)
  MatchingOptions,
  MultipleChoiceOptions,
  TrueFalseOptions,
  FillInBlankOptions,
  EssayOptions,
  ShowWorkOptions,
  QuestionOptions,
  // Answer types
  MatchingAnswer,
  MCAnswer,
  TFAnswer,
  FillBlankAnswer,
  EssayAnswer,
  ShowWorkAnswer,
  AnswerData as LibAnswerData,
  // Question type
  QuestionType,
} from '@/lib/questions/types';

// Re-export type guards and constants
export {
  isMatchingOptions,
  isMultipleChoiceOptions,
  isTrueFalseOptions,
  isFillInBlankOptions,
  isEssayOptions,
  isShowWorkOptions,
  isValidQuestionType,
  QUESTION_TYPES,
} from '@/lib/questions/types';
