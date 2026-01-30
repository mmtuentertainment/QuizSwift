'use client';

/**
 * ImageUpload Component
 *
 * Handles image uploads for questions with:
 * - Client-side validation (type, size)
 * - Preview display
 * - Direct upload to R2 via presigned URL
 * - Remove functionality
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';

// Local constants to avoid server import in client component
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface ImageUploadProps {
  /** Current image URL for preview (can be R2 storage key or full URL) */
  currentImageUrl?: string | null;
  /** Callback when image is successfully uploaded */
  onUpload: (storageKey: string) => void;
  /** Callback when image is removed */
  onRemove: () => void;
  /** Optional className for container */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function ImageUpload({
  currentImageUrl,
  onUpload,
  onRemove,
  className = '',
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  // Track mount state for async cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync preview state when currentImageUrl prop changes (external system sync)
  useEffect(() => {
    setPreview(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);
      setUploadProgress(0);

      // Client-side type validation
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError('Please select a valid image (JPEG, PNG, GIF, or WebP)');
        return;
      }

      // Client-side size validation
      if (file.size > MAX_IMAGE_SIZE) {
        setError(`Image must be smaller than ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
        return;
      }

      // Show preview immediately for better UX
      const reader = new FileReader();
      reader.onload = (e) => {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setPreview(e.target?.result as string);
        }
      };
      reader.onerror = () => {
        if (isMountedRef.current) {
          setError('Failed to read file');
        }
      };
      reader.readAsDataURL(file);

      setUploading(true);
      setUploadProgress(10);

      try {
        // Step 1: Get presigned URL from our API
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size,
          }),
        });

        setUploadProgress(30);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to get upload URL');
        }

        const { uploadUrl, storageKey } = await response.json();
        setUploadProgress(50);

        // Step 2: Upload directly to R2
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        setUploadProgress(90);

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image to storage');
        }

        setUploadProgress(100);
        onUpload(storageKey);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        // Revert preview on error
        setPreview(currentImageUrl || null);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [currentImageUrl, onUpload]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove();
  }, [onRemove]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled || uploading) return;

      const file = e.dataTransfer.files?.[0];
      if (file && fileInputRef.current) {
        // Create a DataTransfer to set files on input
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(event);
      }
    },
    [disabled, uploading]
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">Question Image (optional)</label>

      {error && (
        <div
          className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {preview ? (
        <div className="relative inline-block">
          <Image
            src={preview}
            alt="Question image preview"
            width={200}
            height={200}
            className="max-h-48 w-auto rounded border border-gray-300 object-contain"
            unoptimized
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Remove image"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded bg-white/75">
              <div className="text-sm text-gray-600">Uploading...</div>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`relative ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
            id="question-image-upload"
          />

          <label
            htmlFor="question-image-upload"
            className={`flex h-32 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
              disabled || uploading
                ? 'cursor-not-allowed border-gray-200 bg-gray-50'
                : 'cursor-pointer border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center">
                <svg className="h-8 w-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="mt-2 text-sm text-gray-600">Uploading... {uploadProgress}%</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="mt-2 text-sm text-gray-600">Click or drag to upload image</span>
                <span className="mt-1 text-xs text-gray-500">Max 5MB. JPEG, PNG, GIF, WebP</span>
              </div>
            )}
          </label>
        </div>
      )}
    </div>
  );
}
