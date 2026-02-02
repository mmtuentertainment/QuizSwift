/**
 * Normalizes question options from legacy array format to structured format.
 *
 * The AI generates options as simple string arrays: ["A", "B", "C", "D"]
 * But renderers/validators expect structured objects with type discriminators.
 *
 * This utility transforms legacy formats on-read for backward compatibility.
 */

import type {
  QuestionOptions,
  MultipleChoiceOptions,
  TrueFalseOptions,
  FillInBlankOptions,
  MatchingOptions,
  EssayOptions,
  ShowWorkOptions,
  ShortAnswerOptions,
} from './types';

/**
 * Checks if options are already in the correct structured format
 */
function isStructuredOptions(options: unknown): options is QuestionOptions {
  return (
    typeof options === 'object' &&
    options !== null &&
    !Array.isArray(options) &&
    'type' in options &&
    typeof (options as { type: unknown }).type === 'string'
  );
}

/**
 * Normalizes question options from various formats to the expected structured format.
 *
 * @param questionType - The type of question (multiple_choice, fill_in_blank, etc.)
 * @param options - The raw options from the database (could be array or object)
 * @param correctAnswer - The correct answer string (used to determine which choice is correct)
 * @returns Normalized QuestionOptions or null if normalization fails
 */
export function normalizeQuestionOptions(
  questionType: string,
  options: unknown,
  correctAnswer?: string | null
): QuestionOptions | null {
  // Handle null/undefined
  if (options === null || options === undefined) {
    return createDefaultOptions(questionType, correctAnswer);
  }

  // Already in correct format - return as-is
  if (isStructuredOptions(options)) {
    return options;
  }

  // Transform array format to structured format
  if (Array.isArray(options)) {
    return transformArrayToStructured(questionType, options, correctAnswer);
  }

  // Handle legacy object formats that might be missing the type field
  if (typeof options === 'object' && options !== null) {
    return addTypeToOptions(questionType, options as Record<string, unknown>);
  }

  // Unable to normalize - return default
  return createDefaultOptions(questionType, correctAnswer);
}

/**
 * Transforms array-based options to structured format
 */
function transformArrayToStructured(
  questionType: string,
  options: unknown[],
  correctAnswer?: string | null
): QuestionOptions | null {
  switch (questionType) {
    case 'multiple_choice':
      return transformToMultipleChoice(options, correctAnswer);

    case 'true_false':
    case 'true_false_justify':
      return transformToTrueFalse(correctAnswer);

    case 'fill_in_blank':
    case 'fill_blank':
      return transformToFillInBlank(options, correctAnswer);

    case 'matching':
      return transformToMatching(options);

    case 'short_answer':
      return createShortAnswerOptions();

    case 'essay':
      return createEssayOptions();

    case 'show_work':
      return createShowWorkOptions(options);

    default:
      return null;
  }
}

/**
 * Transforms array options to MultipleChoiceOptions
 * Matches actual type: { type, choices: [{id, text, isCorrect}] }
 */
function transformToMultipleChoice(
  options: unknown[],
  correctAnswer?: string | null
): MultipleChoiceOptions {
  const choices = options.map((text, index) => {
    const id = String.fromCharCode(65 + index); // A, B, C, D, ...
    const textStr = String(text);

    // Determine if this choice is correct by matching:
    // 1. ID matches (e.g., "A")
    // 2. Full text matches
    // 3. Text matches case-insensitively
    // 4. Index matches (e.g., "0")
    const isCorrect = correctAnswer
      ? id === correctAnswer ||
        textStr === correctAnswer ||
        textStr.toLowerCase() === correctAnswer.toLowerCase() ||
        index.toString() === correctAnswer
      : index === 0; // Default first option as correct if no answer provided

    return {
      id,
      text: textStr,
      isCorrect,
    };
  });

  return {
    type: 'multiple_choice' as const,
    choices,
  };
}

/**
 * Transforms to TrueFalseOptions
 * Matches actual type: { type, correctAnswer: boolean, justification?: string }
 */
function transformToTrueFalse(correctAnswer?: string | null): TrueFalseOptions {
  let answer = true; // Default

  if (correctAnswer) {
    const lower = correctAnswer.toLowerCase().trim();
    answer = lower === 'true' || lower === 't' || lower === 'yes' || lower === '1';
  }

  return {
    type: 'true_false' as const,
    correctAnswer: answer,
  };
}

/**
 * Transforms array options to FillInBlankOptions
 * Matches actual type: { type, blanks: [{index, acceptedAnswers, caseSensitive}] }
 */
function transformToFillInBlank(
  options: unknown[],
  correctAnswer?: string | null
): FillInBlankOptions {
  // If options array has items, use them as accepted answers for blanks
  // Otherwise, use the correctAnswer field
  const blanks =
    options.length > 0
      ? options.map((answer, index) => ({
          index,
          acceptedAnswers: [String(answer)],
          caseSensitive: false,
        }))
      : correctAnswer
        ? [
            {
              index: 0,
              acceptedAnswers: [correctAnswer],
              caseSensitive: false,
            },
          ]
        : [
            {
              index: 0,
              acceptedAnswers: [],
              caseSensitive: false,
            },
          ];

  return {
    type: 'fill_in_blank' as const,
    blanks,
  };
}

/**
 * Transforms array options to MatchingOptions
 * Matches actual type: { type, pairs: [{id, left, right}] }
 */
function transformToMatching(options: unknown[]): MatchingOptions {
  // Assume options alternate between left (term) and right (definition)
  const pairs: { id: string; left: string; right: string }[] = [];

  for (let i = 0; i < options.length; i += 2) {
    pairs.push({
      id: String(Math.floor(i / 2)),
      left: String(options[i] || ''),
      right: String(options[i + 1] || options[i] || ''),
    });
  }

  return {
    type: 'matching' as const,
    pairs,
  };
}

/**
 * Creates ShortAnswerOptions
 * Matches actual type: { type } (empty interface)
 */
function createShortAnswerOptions(): ShortAnswerOptions {
  return {
    type: 'short_answer' as const,
  };
}

/**
 * Creates EssayOptions
 * Matches actual type: { type, minWords?, maxWords?, rubric?, guidelines? }
 */
function createEssayOptions(): EssayOptions {
  return {
    type: 'essay' as const,
  };
}

/**
 * Creates ShowWorkOptions from array or defaults
 * Matches actual type: { type, workingSteps: string[] }
 */
function createShowWorkOptions(options?: unknown[]): ShowWorkOptions {
  const workingSteps =
    options && options.length > 0 ? options.map((s) => String(s)) : [];

  return {
    type: 'show_work' as const,
    workingSteps,
  };
}

/**
 * Adds type field to legacy object options
 */
function addTypeToOptions(
  questionType: string,
  options: Record<string, unknown>
): QuestionOptions | null {
  // Normalize legacy type aliases
  const typeMap: Record<string, QuestionOptions['type']> = {
    multiple_choice: 'multiple_choice',
    true_false: 'true_false',
    true_false_justify: 'true_false',
    fill_in_blank: 'fill_in_blank',
    fill_blank: 'fill_in_blank',
    matching: 'matching',
    short_answer: 'short_answer',
    essay: 'essay',
    show_work: 'show_work',
  };

  const optionsType = typeMap[questionType];
  if (!optionsType) return null;

  return {
    type: optionsType,
    ...options,
  } as QuestionOptions;
}

/**
 * Creates default options for a question type when no options are provided
 */
function createDefaultOptions(
  questionType: string,
  correctAnswer?: string | null
): QuestionOptions | null {
  switch (questionType) {
    case 'multiple_choice':
      return {
        type: 'multiple_choice' as const,
        choices: [],
      };

    case 'true_false':
    case 'true_false_justify':
      return transformToTrueFalse(correctAnswer);

    case 'fill_in_blank':
    case 'fill_blank':
      return {
        type: 'fill_in_blank' as const,
        blanks: [
          {
            index: 0,
            acceptedAnswers: correctAnswer ? [correctAnswer] : [],
            caseSensitive: false,
          },
        ],
      };

    case 'short_answer':
      return createShortAnswerOptions();

    case 'essay':
      return createEssayOptions();

    case 'show_work':
      return createShowWorkOptions();

    case 'matching':
      return {
        type: 'matching' as const,
        pairs: [],
      };

    default:
      return null;
  }
}

/**
 * Batch normalize options for multiple questions
 */
export function normalizeQuestionsOptions<
  T extends {
    questionType: string;
    options: unknown;
    correctAnswer?: string | null;
  },
>(questions: T[]): (T & { normalizedOptions: QuestionOptions | null })[] {
  return questions.map((q) => ({
    ...q,
    normalizedOptions: normalizeQuestionOptions(
      q.questionType,
      q.options,
      q.correctAnswer
    ),
  }));
}
