import type {
  QuestionGeneration,
  QuestionEvaluation,
  ContentAnalysis,
  ConceptExtraction,
} from '../schemas';

export function buildPass5Prompt(
  pass1: ContentAnalysis,
  pass2: ConceptExtraction,
  pass3: QuestionGeneration,
  pass4: QuestionEvaluation,
  requestedCount: number
): string {
  const targetPoolSize = requestedCount * 2;

  return `You are making final selections for a teacher's question curation pool.

## Goal
Select the TOP ${targetPoolSize} questions from the evaluated pool.
Teacher will then choose ${requestedCount} from this curated pool.

## Selection Criteria (in priority order)
1. **Quality**: Prefer questions with evaluation score >= 3.5
2. **Bloom's Balance**: Ensure distribution matches targets (40% understand, 30% apply, 20% analyze, 10% evaluate)
3. **Concept Coverage**: Cover as many high-importance concepts as possible
4. **Type Variety**: Mix of question types for engagement
5. **Difficulty Spread**: Include easy, medium, and hard questions

## Question Pool with Evaluations
${pass3.questions.map(q => {
  const evaluation = pass4.evaluations.find(e => e.questionId === q.id);
  return {
    id: q.id,
    text: q.questionText.substring(0, 100) + '...',
    type: q.questionType,
    bloom: q.bloomLevel,
    concept: q.targetConceptId,
    difficulty: q.difficulty,
    score: evaluation?.overallScore ?? 0,
    recommendation: evaluation?.recommendation ?? 'unknown',
  };
}).map(q => JSON.stringify(q)).join('\n')}

## Concept Importance Reference
${pass2.concepts
  .filter(c => c.importance >= 4)
  .map(c => `- ${c.id}: ${c.name} (importance: ${c.importance})`)
  .join('\n')}

## Target Bloom's Distribution for Pool
- Understand: ${Math.round(targetPoolSize * 0.40)} questions
- Apply: ${Math.round(targetPoolSize * 0.30)} questions
- Analyze: ${Math.round(targetPoolSize * 0.20)} questions
- Evaluate: ${Math.round(targetPoolSize * 0.10)} questions

## Output
1. Rank ALL questions by overall quality
2. Select top ${targetPoolSize} for the pool (respecting distribution)
3. For excluded questions, explain why
4. Calculate pool quality metrics
5. Write curator notes explaining the pool to the teacher`;
}
