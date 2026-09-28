/**
 * Mess Management — Admin List Page
 * Shows all messes in the system
 */

import Link from 'next/link';
import { getAllMesses } from '@/features/mess/actions';

export default async function MessListPage() {
  const messes = await getAllMesses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mess Management</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage all messes in the KSE platform
          </p>
        </div>
      </div>

      {/* Mess List */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Mess
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Manager
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Members
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {messes?.map((mess) => (
              <tr key={mess.id} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-4 py-3">
                  <Link
                    href={`/mess/${mess.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-900"
                  >
                    {mess.name}
                  </Link>
                  {mess.location && (
                    <p className="text-sm text-zinc-500">{mess.location}</p>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600">
                  {mess.manager?.full_name ?? 'Unknown'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600">
                  {mess.member_count?.count ?? 0}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono">
                    {mess.code}
                  </code>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-500">
                  {new Date(mess.created_at).toLocaleDateString('en-GB')}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      mess.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {mess.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {(!messes || messes.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  No messes found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
