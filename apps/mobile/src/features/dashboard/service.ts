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
  const { data, error } = await supabase
    .from('community_members')
    .select('community:communities!inner(id, name)')
    .order('joined_at', { ascending: false });

  if (error) throw new DashboardError(`Could not load communities: ${error.message}`);
  return ((data ?? []) as unknown as { community: { id: string; name: string } | null }[])
    .map((row) => row.community)
    .filter((community): community is MyCommunity => Boolean(community));
}
