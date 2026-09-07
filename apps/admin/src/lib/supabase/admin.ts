import { createClient } from '@supabase/supabase-js';

/**
 * Privileged Supabase client (service role). Bypasses RLS — import ONLY
 * from server actions / server components, never from anything reachable
 * by the browser (CLAUDE.md §10). Opportunity writes have no staff RLS
 * policies by design; they go through this client after the action has
 * verified the caller's session and staff role.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to apps/admin/.env.local ' +
        'and set it (locally: `npx supabase status -o env`).',
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
