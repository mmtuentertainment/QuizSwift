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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Documents</h1>
        <Link
          href="/upload"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Upload New
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
          No documents yet. Upload a PDF to get started.
        </div>
      ) : (
        <div className="divide-y rounded-lg bg-white shadow">
          {documents.map((doc) => {
            const badge = STATUS_BADGES[doc.status] || STATUS_BADGES.pending;
            return (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="block p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-medium text-gray-900">{doc.fileName}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {doc.totalPages ? `${doc.totalPages} pages` : 'Processing...'}
                      {doc._count.questions > 0 && ` | ${doc._count.questions} questions`}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-400">
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
