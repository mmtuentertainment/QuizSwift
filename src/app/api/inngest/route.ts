import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { processPdf, extractQuestionsJob, curateQuestionsJob } from '@/inngest/functions';

// Allow up to 5 minutes per step execution for AI-intensive operations
// Each step is a separate request, so this covers individual AI passes
// Total function duration is unlimited (steps are checkpointed)
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processPdf,
    extractQuestionsJob, // Keep for documents without requestedQuestionCount
    curateQuestionsJob, // New curation pipeline
  ],
});
