import type { ContentAnalysis } from '../schemas';

export function buildPass2Prompt(
  documentText: string,
  pass1: ContentAnalysis
): string {
  return `You are extracting testable concepts from educational content.

## Context from Previous Analysis
- Subject: ${pass1.subjectArea}
- Grade Level: ${pass1.gradeLevel}
- Key Topics: ${pass1.keyTopics.join(', ')}
- Learning Objectives:
${pass1.learningObjectives.map(o => `  - ${o.objective} (${o.bloomLevel})`).join('\n')}

## Your Task
Extract TESTABLE concepts from this document. For each concept:
1. Give it a unique ID (concept_1, concept_2, etc.)
2. Provide a clear definition FROM THE DOCUMENT
3. Rate importance 1-5 (5 = core concept students must know)
4. Identify what type of concept it is
5. Note any prerequisite concepts

## Concept Types
- definition: A term with a specific meaning
- process: A sequence of steps or procedure
- relationship: How two or more things connect
- example: An illustrative case
- rule: A principle or guideline
- formula: A mathematical or scientific expression

## Focus On
- Concepts that can be TESTED with questions
- Facts that students commonly get wrong
- Relationships between ideas
- Core concepts with importance >= 4

## Document Content
${documentText}

## Output
Provide structured concept extraction following the schema.`;
}
