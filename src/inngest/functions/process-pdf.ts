// Placeholder - will be implemented in Task 2
import { inngest } from '../client';

export const processPdf = inngest.createFunction(
  { id: 'process-pdf' },
  { event: 'pdf/uploaded' },
  async ({ event, step }) => {
    // Placeholder implementation
    return { documentId: event.data.documentId };
  }
);
