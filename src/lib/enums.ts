/**
 * Re-export Prisma enums for use across the application
 *
 * Client components receive serialized enum values (strings), but these
 * type definitions ensure consistency with the Prisma schema.
 */
export { QuizStatus, ShowResultsOption, AttemptStatus } from '@/generated/prisma';

/**
 * String literal types matching the Prisma enum values
 * Use these for client component interfaces that receive serialized data
 */
export type QuizStatusValue = 'draft' | 'preview_required' | 'published' | 'archived';
export type ShowResultsOptionValue = 'after_submit' | 'after_due' | 'manual';
export type AttemptStatusValue = 'in_progress' | 'submitted' | 'graded';

/**
 * Labels for displaying status values in UI
 */
export const QUIZ_STATUS_LABELS: Record<QuizStatusValue, string> = {
  draft: 'Draft',
  preview_required: 'Preview Required',
  published: 'Published',
  archived: 'Archived',
};

export const SHOW_RESULTS_LABELS: Record<ShowResultsOptionValue, string> = {
  after_submit: 'After Submission',
  after_due: 'After Due Date',
  manual: 'Manual Release',
};

export const ATTEMPT_STATUS_LABELS: Record<AttemptStatusValue, string> = {
  in_progress: 'In Progress',
  submitted: 'Submitted',
  graded: 'Graded',
};
