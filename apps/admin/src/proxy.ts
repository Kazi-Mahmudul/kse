import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

/** Next.js 16 proxy (formerly middleware): session refresh + login gate. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // All routes except Next internals and static assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
