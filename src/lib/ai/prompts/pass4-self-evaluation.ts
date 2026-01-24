import type { QuestionGeneration, ContentAnalysis } from '../schemas';

export function buildPass4Prompt(
  pass1: ContentAnalysis,
  pass3: QuestionGeneration
): string {
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

## Questions to Evaluate
${JSON.stringify(pass3.questions.map(q => ({
  id: q.id,
  text: q.questionText,
  type: q.questionType,
  bloom: q.bloomLevel,
  answer: q.correctAnswer,
  rationale: q.comprehensionRationale,
})), null, 2)}

## Output
For each question:
1. Provide scores for all 4 criteria
2. Calculate overall score (average)
3. List specific strengths
4. List specific weaknesses
5. If score < 3.5, provide a suggested rewrite
6. Recommend: keep, improve, or discard

Be honest and critical. Low-quality questions should be flagged.`;
}
