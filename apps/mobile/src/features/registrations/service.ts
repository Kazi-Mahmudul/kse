import { supabase } from '@/lib/supabase';
import { SUMMARY_SELECT } from '@/features/opportunities/service';
import type { OpportunitySummary } from '@kse/types';

/**
 * In-app event/workshop registration (spec §6 Events). Rows live in
 * event_registrations with own-row RLS; there is no DELETE policy, so
 * cancelling flips the status enum back and forth instead of removing rows.
 */

export class RegistrationError extends Error {}

function fail(context: string, message: string): never {
  throw new RegistrationError(`${context}: ${message}`);
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) fail('Could not register', error.message);
  if (!user) fail('Could not register', 'You need to sign in first');
  return user.id;
}

/** Ids the current user is actively registered for (toggle state). */
export async function listRegisteredOpportunityIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('opportunity_id')
    .eq('status', 'registered');

  if (error) fail('Could not load registrations', error.message);
  return (data ?? []).map((row) => row.opportunity_id);
}

export interface RegisteredEventRow {
  registered_at: string;
  opportunity: OpportunitySummary;
}

/** Active registrations with the embedded published listing (dashboard). */
export async function listMyRegistrations(): Promise<RegisteredEventRow[]> {
  const { data, error } = await supabase
    .from('event_registrations')
    .select(`registered_at, opportunity:opportunities!inner(${SUMMARY_SELECT})`)
    .eq('status', 'registered')
    .order('registered_at', { ascending: false });

  if (error) fail('Could not load registrations', error.message);
  return (data ?? []) as unknown as RegisteredEventRow[];
}

/** Register (or re-register after cancelling) — upsert keeps the PK row. */
export async function registerForEvent(opportunityId: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('event_registrations')
    .upsert(
      { user_id: userId, opportunity_id: opportunityId, status: 'registered' },
      { onConflict: 'user_id,opportunity_id' },
    );
  if (error) fail('Could not register', error.message);
}

export async function cancelRegistration(opportunityId: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('event_registrations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('opportunity_id', opportunityId);
  if (error) fail('Could not cancel registration', error.message);
}
