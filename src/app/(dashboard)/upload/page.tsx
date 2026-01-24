import { UploadForm } from '@/components/upload/upload-form';

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Upload Textbook Chapter</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-6">
          Upload a PDF file to extract quiz questions. The system will analyze
          the content and identify existing questions and testable facts.
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
