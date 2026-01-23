/**
 * Inngest client stub for Plan 02-01
 *
 * This is a minimal stub that allows the upload API to compile.
 * The full Inngest client implementation will be created in Plan 02-03.
 *
 * TODO(02-03): Replace with full Inngest client setup
 */

// Event type definitions for PDF processing
export interface PdfUploadedEvent {
  name: 'pdf/uploaded';
  data: {
    documentId: string;
    fileUrl: string;
    fileName: string;
    userId: string;
  };
}

// Stub Inngest client that logs events for now
// Will be replaced with real Inngest client in Plan 02-03
export const inngest = {
  send: async (event: PdfUploadedEvent) => {
    console.log('[Inngest Stub] Event queued:', event.name, {
      documentId: event.data.documentId,
      fileName: event.data.fileName,
    });
    // In Plan 02-03, this will actually send to Inngest
    return { ids: [`stub-${Date.now()}`] };
  },
};
