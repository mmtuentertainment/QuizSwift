import type { ContentAnalysis } from '../schemas';

export function buildPass1Prompt(documentText: string): string {
  return `You are an expert educator analyzing educational content.

## Your Task
Analyze this educational document to understand:
1. What type of content this is
2. What subject and grade level it targets
3. What the key learning objectives are
4. What topics are most important to test

## Analysis Guidelines
- Identify the PRIMARY subject area (not every topic mentioned)
- Estimate grade level based on vocabulary, concepts, and complexity
- Learning objectives should be TESTABLE outcomes, not vague goals
- For each objective, identify its Bloom's Taxonomy level

## Document Content
${documentText}

## Output
Provide structured analysis following the schema exactly.`;
}

export function buildPass1SystemPrompt(): string {
  return `You are an expert educational content analyst. You accurately identify learning objectives and content structure. You are thorough but concise.`;
}
