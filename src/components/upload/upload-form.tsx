'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface UploadFormProps {
  onUploadComplete?: (documentId: string) => void;
}

export function UploadForm({ onUploadComplete }: UploadFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(15);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);

    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File must be under 50MB');
        return;
      }
      setFile(selectedFile);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('questionCount', questionCount.toString());

      setProgress(30);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      setProgress(100);

      if (onUploadComplete) {
        onUploadComplete(data.document.id);
      }

      // Redirect to document page
      router.push(`/documents/${data.document.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-800">
          {file ? file.name : 'Click to select a PDF file'}
        </label>
        {file && (
          <p className="mt-2 text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        )}
      </div>

      {file && (
        <div className="space-y-2">
          <label htmlFor="question-count" className="block text-sm font-medium text-gray-700">
            How many questions do you want?
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              id="question-count"
              min={5}
              max={50}
              step={5}
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              disabled={uploading}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600"
            />
            <span className="w-12 text-center font-medium text-gray-900">{questionCount}</span>
          </div>
          <p className="text-xs text-gray-500">
            AI will generate {questionCount * 2} questions. You&apos;ll select the best{' '}
            {questionCount}.
          </p>
        </div>
      )}

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {uploading && (
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {uploading ? 'Uploading...' : 'Upload PDF'}
      </button>
    </div>
  );
}
