'use client';

import { useEffect, useState } from 'react';

interface UploadProgressProps {
  documentId: string;
  onComplete?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Queued for processing...',
  processing: 'Extracting text from PDF...',
  extracting: 'AI analyzing content...',
  completed: 'Processing complete!',
  failed: 'Processing failed',
};

const STATUS_PROGRESS: Record<string, number> = {
  pending: 10,
  processing: 40,
  extracting: 70,
  completed: 100,
  failed: 0,
};

export function UploadProgress({ documentId, onComplete }: UploadProgressProps) {
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}`);
        if (!response.ok) throw new Error('Failed to fetch status');

        const data = await response.json();

        if (!isMounted) return;

        setStatus(data.status);

        if (data.errorMessage && data.status === 'failed') {
          setError(data.errorMessage);
        }

        if (data.status === 'completed' && onComplete) {
          onComplete();
        }

        // Keep polling unless completed or failed
        if (data.status !== 'completed' && data.status !== 'failed') {
          setTimeout(pollStatus, 2000);
        }
      } catch (err) {
        console.error('Status poll error:', err);
        if (isMounted) {
          setTimeout(pollStatus, 5000); // Retry with longer delay on error
        }
      }
    };

    pollStatus();

    return () => {
      isMounted = false;
    };
  }, [documentId, onComplete]);

  const progress = STATUS_PROGRESS[status] || 0;
  const label = STATUS_LABELS[status] || status;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            status === 'failed' ? 'bg-red-500' :
            status === 'completed' ? 'bg-green-500' : 'bg-blue-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
