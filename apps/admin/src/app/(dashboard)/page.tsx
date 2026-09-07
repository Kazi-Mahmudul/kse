import { createClient } from '@/lib/supabase/server';

/** Admin dashboard home — real counts arrive with steps 7+ (content to count). */
export default async function DashboardPage() {
  const supabase = await createClient();

  // Counts that exist today; more cards land with their roadmap steps.
  const [profiles, communities, tutors] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('communities').select('*', { count: 'exact', head: true }),
    supabase.from('tutors').select('*', { count: 'exact', head: true }),
  ]);

  const cards = [
    { label: 'Registered students', value: profiles.count ?? 0, step: null },
    { label: 'Opportunities', value: null, step: 7 },
    { label: 'Tutors', value: tutors.count ?? 0, step: null },
    { label: 'Communities', value: communities.count ?? 0, step: null },
  ] as const;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Platform overview. Content management grows here over the next steps.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {card.label}
            </p>
            {card.value === null ? (
              <p className="mt-2 text-sm text-zinc-400">Step {card.step}</p>
            ) : (
              <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
                {card.value}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-8">
        <h2 className="text-sm font-semibold text-zinc-900">Next: opportunity management</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Creating, editing and publishing internships, scholarships, events and
          workshops lands in step 7 — the session and staff gate you are using
          right now is step 6.
        </p>
      </div>
    </div>
  );
}
