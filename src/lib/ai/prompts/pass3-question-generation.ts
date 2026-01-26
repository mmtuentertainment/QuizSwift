import type { ContentAnalysis, ConceptExtraction } from '../schemas';

export function buildPass3Prompt(
  documentText: string,
  pass1: ContentAnalysis,
  pass2: ConceptExtraction,
  requestedCount: number
): string {
  const targetCount = requestedCount * 2;
  const hasMath = pass1.hasMathContent;

  // Calculate Bloom's distribution targets
  const bloomTargets = {
    understand: Math.round(targetCount * 0.4),
    apply: Math.round(targetCount * 0.3),
    analyze: Math.round(targetCount * 0.2),
    evaluate: Math.round(targetCount * 0.1),
  };

  return `You are an expert educator creating COMPREHENSION-BASED quiz questions.

## CRITICAL RULE
Generate questions that test UNDERSTANDING, not just RECALL.
- BAD: "What is the formula for X?" (recall)
- GOOD: "Why does the formula for X include term Y?" (understanding)
- GOOD: "If you changed Z in the formula, what would happen?" (application)

## Context
- Subject: ${pass1.subjectArea}
- Grade Level: ${pass1.gradeLevel}
- Has Math Content: ${hasMath}

## Key Concepts to Test (prioritize importance >= 4)
${pass2.concepts
  .filter((c) => c.importance >= 3)
  .map((c) => `- ${c.name} (${c.category}, importance: ${c.importance}): ${c.definition}`)
  .join('\n')}

## Learning Objectives
${pass1.learningObjectives.map((o) => `- ${o.objective} (${o.bloomLevel})`).join('\n')}

## Your Task
Generate ${targetCount} HIGH-QUALITY questions following this distribution:

**Bloom's Taxonomy Targets:**
- Understand (explain, describe, summarize): ${bloomTargets.understand} questions
- Apply (how would you, demonstrate, solve): ${bloomTargets.apply} questions
- Analyze (compare, contrast, why does): ${bloomTargets.analyze} questions
- Evaluate (justify, assess, which is better): ${bloomTargets.evaluate} questions

**Question Type Mix:**
- Multiple choice: ~30% (test conceptual understanding)
- Short answer: ~25% (explain reasoning)
${hasMath ? '- Show your work: ~20% (demonstrate process)\n' : ''}- True/false with justification: ~15% (identify misconceptions)
- Fill in blank / Matching: ~10% (key terms and relationships)

## What Makes a GOOD Question
1. Tests understanding of WHY, not just WHAT
2. Requires connecting multiple concepts
3. Cannot be answered by keyword matching alone
4. Has a single, defensible correct answer from the source
5. Includes a clear rationale explaining why this tests comprehension

## What to AVOID
- Trivial recall questions ("What color was...?")
- Questions answerable without reading the document
- Ambiguous questions with multiple valid interpretations
- Questions about irrelevant details
- Questions requiring external knowledge

## For show_work Questions (if math content)
Include:
- Clear problem statement with LaTeX for math
- Expected working steps
- Final answer format

## Document Content
${documentText}

## Output
Generate ${targetCount} questions as a structured array.
Each question needs: id, questionText, questionType, bloomLevel, targetConceptId, difficulty, options (if applicable), correctAnswer, explanation, comprehensionRationale, sourceEvidence, workingSteps (if show_work).`;
}
