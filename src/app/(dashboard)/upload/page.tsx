import { UploadForm } from '@/components/upload/upload-form';

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Upload Textbook Chapter</h1>

      <div className="rounded-lg bg-white p-6 shadow">
        <p className="mb-6 text-gray-600">
          Upload a PDF file to extract quiz questions. Choose how many questions you want, and AI
          will generate twice that number for you to curate and select the best ones.
        </p>

        <UploadForm />

        <div className="mt-6 text-sm text-gray-500">
          <p>Supported: PDF files up to 50MB</p>
          <p>Processing time: 1-5 minutes depending on document size</p>
        </div>
      </div>
    </div>
  );
}
