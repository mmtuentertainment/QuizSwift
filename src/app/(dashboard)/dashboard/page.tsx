import { auth } from '@/lib/auth';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function DashboardPage() {
  const session = await auth();

  // Get recent documents for quick access
  const recentDocs = await prisma.document.findMany({
    where: { uploadedById: session?.user?.id },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      _count: { select: { questions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome back!</h2>
        <p className="text-gray-600">You&apos;re signed in as {session?.user?.email}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href="/upload"
          className="rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-6 transition-colors hover:border-blue-500 hover:bg-blue-100"
        >
          <h3 className="text-lg font-semibold text-blue-900">Upload PDF</h3>
          <p className="mt-2 text-blue-700">
            Upload a textbook chapter to extract quiz questions using AI.
          </p>
        </Link>

        <Link
          href="/documents"
          className="rounded-lg border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h3 className="text-lg font-semibold text-gray-900">My Documents</h3>
          <p className="mt-2 text-gray-600">View all uploaded documents and extracted questions.</p>
        </Link>
      </div>

      {recentDocs.length > 0 && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Documents</h3>
          <div className="space-y-3">
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="block rounded-md border p-3 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{doc.fileName}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      doc.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : doc.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
                {doc._count.questions > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    {doc._count.questions} questions extracted
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
