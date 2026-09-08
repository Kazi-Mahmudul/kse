import { supabase } from '@/lib/supabase';

/**
 * Dashboard reads (step 11). Everything else on the screen reuses the
 * profile and saved-opportunity hooks; only joined communities is new.
 */

export interface MyCommunity {
  id: string;
  name: string;
}

export class DashboardError extends Error {}

/** Communities the current user belongs to (newest membership first). */
export async function listMyCommunities(): Promise<MyCommunity[]> {
  // community_members is world-readable by design (public rosters), so the
  // current user must be filtered app-side — unlike saved_opportunities etc.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new DashboardError(`Could not load communities: ${userError.message}`);
  if (!user) throw new DashboardError('You need to sign in first');

  const { data, error } = await supabase
    .from('community_members')
    .select('community:communities!inner(id, name)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  if (error) throw new DashboardError(`Could not load communities: ${error.message}`);
  return ((data ?? []) as unknown as { community: { id: string; name: string } | null }[])
    .map((row) => row.community)
    .filter((community): community is MyCommunity => Boolean(community));
}
