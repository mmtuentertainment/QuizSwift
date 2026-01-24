import Link from 'next/link';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';

const STATUS_BADGES: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
  extracting: { color: 'bg-purple-100 text-purple-800', label: 'Extracting' },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
  failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
};

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const documents = await prisma.document.findMany({
    where: { uploadedById: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { questions: true },
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Documents</h1>
        <Link
          href="/upload"
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          Upload New
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No documents yet. Upload a PDF to get started.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y">
          {documents.map((doc) => {
            const badge = STATUS_BADGES[doc.status] || STATUS_BADGES.pending;
            return (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="block p-4 hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-medium text-gray-900">{doc.fileName}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {doc.totalPages ? `${doc.totalPages} pages` : 'Processing...'}
                      {doc._count.questions > 0 && ` | ${doc._count.questions} questions`}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
