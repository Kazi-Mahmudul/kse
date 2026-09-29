import { ConfirmSubmit } from '@/components/confirm-submit';
import { formatDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { RESEARCH_COLLABORATION_LABELS } from '@kse/shared';

import { setResearchProfileStatusAction } from '@/features/hub/actions';

interface ResearchRow {
  id: string;
  research_interest: string;
  discipline: string | null;
  topic: string | null;
  skills: string[];
  collaboration_type: string;
  institution: string | null;
  district: string | null;
  status: string;
  updated_at: string;
  profile?: { full_name?: string | null } | null;
}

/** Research partner profiles overview (spec student-hub §11/§17). */
export default async function HubResearchPage() {
  const admin = createAdminClient();

  const { data: rows_raw } = await admin
    .from('research_profiles')
    .select(
      'id, research_interest, discipline, topic, skills, collaboration_type, ' +
        'institution, district, status, updated_at, ' +
        'profile:profiles!research_profiles_user_id_fkey(full_name)',
    )
    .order('updated_at', { ascending: false })
    .limit(100);

  const rows = (rows_raw ?? []) as unknown as ResearchRow[];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Research Partners
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {rows?.length ?? 0} research profile(s) — students own their profiles;
        hide only for policy violations.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {!rows || rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500 lg:col-span-2">
            No research profiles yet.
          </p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-900">
                    {row.profile?.full_name ?? 'Student'}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {row.institution ?? 'Independent'}
                    {row.district ? ` · ${row.district}` : ''} ·{' '}
                    {RESEARCH_COLLABORATION_LABELS[row.collaboration_type as 'partner'] ?? row.collaboration_type}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {row.status}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-indigo-700">
                {row.research_interest}
              </p>
              {row.topic ? <p className="text-xs text-zinc-500">{row.topic}</p> : null}
              {row.skills?.length > 0 ? (
                <p className="mt-2 text-xs text-zinc-500">{row.skills.join(' · ')}</p>
              ) : null}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-zinc-400">Updated {formatDate(row.updated_at)}</span>
                <form action={setResearchProfileStatusAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={row.status === 'active' ? 'hidden' : 'active'}
                  />
                  <ConfirmSubmit
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      row.status === 'active'
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'
                    }`}
                    label={row.status === 'active' ? 'Hide' : 'Unhide'}
                    message={
                      row.status === 'active'
                        ? 'Hide this research profile from the app?'
                        : 'Make this research profile visible again?'
                    }
                  />
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
