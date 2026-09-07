import { supabase } from '@/lib/supabase';
import type { OpportunitySummary } from '@kse/types';

/**
 * Bookmarks (spec §10: student can save their own rows only — RLS
 * saved_opportunities_all_own). All calls require an authenticated session.
 */

export class SavedError extends Error {}

function fail(context: string, message: string): never {
  throw new SavedError(`${context}: ${message}`);
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) fail('Could not save', error.message);
  if (!user) fail('Could not save', 'You need to sign in first');
  return user.id;
}

const SUMMARY_SELECT =
  'id, type, title, organization_name, summary, image_url, location, opportunity_mode, deadline, featured, verified';

/** Ids of everything the current user saved (toggle state for cards). */
export async function listSavedOpportunityIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_opportunities')
    .select('opportunity_id')
    .order('saved_at', { ascending: false });

  if (error) fail('Could not load saved opportunities', error.message);
  return (data ?? []).map((row) => row.opportunity_id);
}

export interface SavedOpportunityRow {
  saved_at: string;
  opportunity: OpportunitySummary;
}

/** Newest-first saved list; !inner drops rows whose listing is no longer published. */
export async function listSavedOpportunities(): Promise<SavedOpportunityRow[]> {
  const { data, error } = await supabase
    .from('saved_opportunities')
    .select(`saved_at, opportunity:opportunities!inner(${SUMMARY_SELECT})`)
    .order('saved_at', { ascending: false });

  if (error) fail('Could not load saved opportunities', error.message);
  return (data ?? []) as unknown as SavedOpportunityRow[];
}

/** Idempotent save — re-tapping Save on an already-saved row is a no-op. */
export async function saveOpportunity(opportunityId: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('saved_opportunities')
    .upsert(
      { user_id: userId, opportunity_id: opportunityId },
      { onConflict: 'user_id,opportunity_id', ignoreDuplicates: true },
    );
  if (error) fail('Could not save', error.message);
}

export async function unsaveOpportunity(opportunityId: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('saved_opportunities')
    .delete()
    .eq('user_id', userId)
    .eq('opportunity_id', opportunityId);
  if (error) fail('Could not remove bookmark', error.message);
}
