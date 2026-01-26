/**
 * Question component types for quiz rendering
 * These types define the shape of options and answers for each question type
 */

// =============================================================================
// Matching Question Types
// =============================================================================

export interface MatchingPair {
  id: string;
  left: string;  // Term (fixed position)
  right: string; // Definition (can be reordered)
}

export interface MatchingOptions {
  pairs: MatchingPair[];
}

export interface MatchingAnswerPair {
  leftId: string;
  rightId: string;
}

export interface MatchingAnswer {
  pairs: MatchingAnswerPair[];
}

// =============================================================================
// Multiple Choice Types
// =============================================================================

export interface MultipleChoiceOption {
  id: string;
  text: string;
}

export interface MultipleChoiceOptions {
  choices: MultipleChoiceOption[];
  allowMultiple?: boolean;
}

export interface MultipleChoiceAnswer {
  selectedIds: string[];
}

// =============================================================================
// Short Answer Types
// =============================================================================

export interface ShortAnswerOptions {
  maxLength?: number;
  placeholder?: string;
}

export interface ShortAnswerAnswer {
  text: string;
}

// =============================================================================
// True/False with Justification Types
// =============================================================================

export interface TrueFalseJustifyOptions {
  statement: string;
}

export interface TrueFalseJustifyAnswer {
  value: boolean;
  justification: string;
}

// =============================================================================
// Fill in the Blank Types
// =============================================================================

export interface FillBlankOptions {
  textWithBlanks: string; // Use {{1}}, {{2}} for blanks
  blankCount: number;
}

export interface FillBlankAnswer {
  blanks: Record<string, string>; // key is blank number "1", "2", etc.
}

// =============================================================================
// Show Your Work Types
// =============================================================================

export interface ShowWorkOptions {
  workingSteps?: string[];
  allowDrawing?: boolean;
}

export interface ShowWorkAnswer {
  text?: string;
  drawingData?: string; // Serialized tldraw canvas
}

// =============================================================================
// Union Types for Generic Handling
// =============================================================================

export type QuestionOptions =
  | MatchingOptions
  | MultipleChoiceOptions
  | ShortAnswerOptions
  | TrueFalseJustifyOptions
  | FillBlankOptions
  | ShowWorkOptions;

export type QuestionAnswer =
  | MatchingAnswer
  | MultipleChoiceAnswer
  | ShortAnswerAnswer
  | TrueFalseJustifyAnswer
  | FillBlankAnswer
  | ShowWorkAnswer;
