import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { processPdf } from '@/inngest/functions/process-pdf';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processPdf],
});
