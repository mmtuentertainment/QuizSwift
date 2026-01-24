import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import {
  processPdf,
  extractQuestionsJob,
  curateQuestionsJob,
} from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processPdf,
    extractQuestionsJob,   // Keep for documents without requestedQuestionCount
    curateQuestionsJob,    // New curation pipeline
  ],
});
