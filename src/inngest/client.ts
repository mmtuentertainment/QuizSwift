import { Inngest } from 'inngest';

// Create Inngest client
export const inngest = new Inngest({
  id: 'quizswift',
  // Event types for type safety
});

// Event type definitions
export interface PdfUploadedEvent {
  name: 'pdf/uploaded';
  data: {
    documentId: string;
    fileName: string;
    userId: string;
    requestedQuestionCount: number;
    // fileUrl removed - fetch from DB using documentId
  };
}

export interface PdfProcessingCompleteEvent {
  name: 'pdf/processing.complete';
  data: {
    documentId: string;
    chunksCreated: number;
    totalPages: number;
  };
}

export interface PdfProcessingFailedEvent {
  name: 'pdf/processing.failed';
  data: {
    documentId: string;
    error: string;
  };
}

export type QuizSwiftEvent =
  | PdfUploadedEvent
  | PdfProcessingCompleteEvent
  | PdfProcessingFailedEvent;
