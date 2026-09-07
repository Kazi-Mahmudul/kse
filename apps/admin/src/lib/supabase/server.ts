import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSupabaseEnv } from '@/lib/env';

/**
 * Supabase client bound to the request's cookies, for server components
 * and server actions. Token refresh happens in proxy.ts; when this client
 * is used from a server component, cookie writes throw and are ignored.
 */
export async function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a server component — the proxy refreshes sessions.
        }
      },
    },
  });
}
