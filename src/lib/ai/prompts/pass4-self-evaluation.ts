import type { QuestionGeneration, ContentAnalysis } from '../schemas';

/**
 * Builds a comprehensive evaluator prompt that instructs a reviewer to critically assess generated quiz questions.
 *
 * The prompt defines five evaluation criteria (Comprehension Depth, Clarity, Answerability, Difficulty Appropriateness, and Format Compliance),
 * includes per-type format requirements and examples, embeds a JSON "Questions to Evaluate" derived from `pass3.questions` (fields: `id`, `text`, `type`, `bloom`, `answer`, `rationale`),
 * and specifies the required output for each question (scores for all 5 criteria, overall average, strengths, weaknesses, optional rewrite when score < 3.5, and a final recommendation).
 *
 * @param pass1 - Content analysis metadata; `gradeLevel` and `subjectArea` are used to contextualize the Difficulty Appropriateness criterion.
 * @param pass3 - Question generation output; `questions` are serialized into the embedded JSON and must contain fields used in the evaluation block.
 * @returns A prompt string that directs a critical evaluation of each generated quiz question, ready to be sent to an evaluator or LLM.
 */
export function buildPass4Prompt(pass1: ContentAnalysis, pass3: QuestionGeneration): string {
  return `You are a critical evaluator of educational quiz questions.

## Your Task
Evaluate EACH generated question for quality. Be CRITICAL - it's better to flag issues now than have poor questions reach students.

## Evaluation Criteria

### 1. Comprehension Depth (1-5)
Does this question test understanding or just recall?
- 1: Pure memorization (what, when, who, list)
- 2: Simple recall with minor application
- 3: Basic comprehension (explain, describe)
- 4: Application or analysis required
- 5: Deep understanding (synthesis, evaluation)

### 2. Clarity (1-5)
Is the question unambiguous?
- 1: Multiple interpretations possible, confusing wording
- 2: Somewhat unclear, students might misunderstand
- 3: Reasonably clear but could be improved
- 4: Clear question, minor ambiguity
- 5: Crystal clear, no possible misinterpretation

### 3. Answerability (1-5)
Can this be answered from the source document?
- 1: Requires significant external knowledge
- 2: Requires some external knowledge
- 3: Mostly answerable, minor gaps
- 4: Fully answerable with reasonable inference
- 5: Directly answerable from document content

### 4. Difficulty Appropriateness (1-5)
Is this appropriate for ${pass1.gradeLevel} level ${pass1.subjectArea}?
- 1: Trivially easy or impossibly hard
- 2: Slightly misaligned with grade level
- 3: Acceptable difficulty
- 4: Well-calibrated challenge
- 5: Perfectly pitched for target audience

### 5. Format Compliance (1-5)
Does the question format match its declared type?
- 1: Format completely wrong for question type
- 2: Format has significant issues
- 3: Format mostly correct with minor issues
- 4: Format correct with room for improvement
- 5: Format perfectly matches question type requirements

Format Requirements by Type:
- fill_in_blank: MUST have ___ or [BLANK] marker in question text
- true_false: MUST be a declarative statement answerable with True/False (NOT comparison, preference, or opinion)
- multiple_choice: MUST have 3-5 distinct options with exactly one correct
- matching: MUST have clear left and right column items
- short_answer: MUST have clear expected answer format
- show_work: MUST require step-by-step solution
- essay: MUST be open-ended requiring extended response

## Format Examples (Reference)

fill_in_blank correct: "The capital of France is ___."
fill_in_blank WRONG: "What is the capital of France?"

true_false correct: "Water boils at 100 degrees Celsius at sea level."
true_false WRONG: "Which is better, water or juice?"
true_false WRONG: "Compare the boiling points of water and ethanol."

## Questions to Evaluate
${JSON.stringify(
  pass3.questions.map((q) => ({
    id: q.id,
    text: q.questionText,
    type: q.questionType,
    bloom: q.bloomLevel,
    answer: q.correctAnswer,
    rationale: q.comprehensionRationale,
  })),
  null,
  2
)}

## Output
For each question:
1. Provide scores for all 5 criteria (Comprehension, Clarity, Answerability, Difficulty, Format Compliance)
2. Calculate overall score (average of all 5)
3. List specific strengths
4. List specific weaknesses
5. If score < 3.5, provide a suggested rewrite
6. Recommend: keep, improve, or discard

Be honest and critical. Low-quality questions should be flagged.`;
}