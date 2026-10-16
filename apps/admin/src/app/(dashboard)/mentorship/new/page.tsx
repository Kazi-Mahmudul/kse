import Link from 'next/link';
import { getMentorshipCategories } from '@/features/mentorship/queries';
import { MentorForm } from '@/features/mentorship/mentor-form';

export default async function NewMentorPage() {
  const categories = await getMentorshipCategories();

  return (
    <div className="max-w-4xl space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
          <Link href="/mentorship" className="hover:text-zinc-900 transition">
            Mentorship
          </Link>
          <span>/</span>
          <span className="text-zinc-800">Add New Mentor</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Add New Mentor
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Create and publish a verified mentor profile into the mobile app with complete credentials, tags, and booking settings.
            </p>
          </div>
          <Link
            href="/mentorship"
            className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition"
          >
            ← Back to Mentors
          </Link>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <MentorForm categories={categories} />
    </div>
  );
}
