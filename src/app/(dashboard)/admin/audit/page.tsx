'use client';

import { useState } from 'react';

interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: string;
  actorId: string | null;
  actorType: string | null;
  oldData: unknown;
  newData: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Audit log viewer with date range filtering.
 * Queries /api/audit endpoint with user-specified parameters.
 */
export default function AuditLogPage() {
  // Default to last 7 days
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [startDate, setStartDate] = useState(weekAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [userId, setUserId] = useState('');
  const [tableName, setTableName] = useState('');
  const [action, setAction] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<AuditResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const fetchLogs = async (newOffset = 0) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: `${startDate}T00:00:00Z`,
        endDate: `${endDate}T23:59:59Z`,
        limit: '50',
        offset: newOffset.toString(),
      });

      if (userId) params.append('userId', userId);
      if (tableName) params.append('tableName', tableName);
      if (action) params.append('action', action);

      const response = await fetch(`/api/audit?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch audit logs');
      }

      const data: AuditResponse = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
      setOffset(newOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Audit Log Viewer</h2>
        <p className="mt-1 text-gray-600">Query system audit logs for FERPA compliance reporting</p>
      </div>

      {/* Filter Form */}
      <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Start Date *
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              End Date *
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
              User ID (optional)
            </label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Filter by actor ID"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="tableName" className="block text-sm font-medium text-gray-700">
              Table (optional)
            </label>
            <select
              id="tableName"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All tables</option>
              <option value="User">User</option>
              <option value="Account">Account</option>
              <option value="Session">Session</option>
            </select>
          </div>

          <div>
            <label htmlFor="action" className="block text-sm font-medium text-gray-700">
              Action (optional)
            </label>
            <select
              id="action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All actions</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="ANONYMIZE">ANONYMIZE</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:bg-blue-400"
            >
              {loading ? 'Loading...' : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      {pagination && (
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="border-b bg-gray-50 px-6 py-3">
            <p className="text-sm text-gray-600">
              Showing {logs.length} of {pagination.total} records
              {pagination.total > 0 && ` (${offset + 1} - ${offset + logs.length})`}
            </p>
          </div>

          {logs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No audit logs found for the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Table
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Record ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Actor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
                        {log.tableName}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            log.action === 'INSERT'
                              ? 'bg-green-100 text-green-800'
                              : log.action === 'UPDATE'
                                ? 'bg-blue-100 text-blue-800'
                                : log.action === 'DELETE'
                                  ? 'bg-red-100 text-red-800'
                                  : log.action === 'ANONYMIZE'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm whitespace-nowrap text-gray-500">
                        {log.recordId.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
                        {log.actorId ? (
                          <span className="font-mono text-xs">
                            {log.actorId === 'system'
                              ? 'system'
                              : `${log.actorId.substring(0, 8)}...`}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                        {log.actorType && (
                          <span className="ml-1 text-xs text-gray-500">({log.actorType})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
                        {log.ipAddress || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.total > 50 && (
            <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-3">
              <button
                onClick={() => fetchLogs(Math.max(0, offset - 50))}
                disabled={offset === 0 || loading}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {Math.floor(offset / 50) + 1} of {Math.ceil(pagination.total / 50)}
              </span>
              <button
                onClick={() => fetchLogs(offset + 50)}
                disabled={!pagination.hasMore || loading}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!pagination && !loading && !error && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-500">Select a date range and click Search to view audit logs</p>
        </div>
      )}
    </div>
  );
}
