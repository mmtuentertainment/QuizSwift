/**
 * Re-export Prisma enums for use across the application
 *
 * Client components receive serialized enum values (strings), but these
 * type definitions ensure consistency with the Prisma schema.
 */
import { QuizStatus, ShowResultsOption, AttemptStatus } from '@/generated/prisma/client';

export { QuizStatus, ShowResultsOption, AttemptStatus };

/**
 * String literal types derived from Prisma enums (keeps in sync with schema)
 * Use these for client component interfaces that receive serialized data
 */
export type QuizStatusValue = (typeof QuizStatus)[keyof typeof QuizStatus];
export type ShowResultsOptionValue = (typeof ShowResultsOption)[keyof typeof ShowResultsOption];
export type AttemptStatusValue = (typeof AttemptStatus)[keyof typeof AttemptStatus];

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
