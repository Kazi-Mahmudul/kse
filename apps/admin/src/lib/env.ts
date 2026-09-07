/**
 * Server/browser environment access with fail-fast validation.
 * Only NEXT_PUBLIC_* values live here — the service-role key is read
 * directly where used and never imported from this module.
 */

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to apps/admin/.env.local and fill them in.',
    );
  }

  return { url, anonKey };
}
