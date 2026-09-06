import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

interface AuthState {
  /** Current session; null when signed out. */
  session: Session | null;
  /** True once the persisted session has been restored from storage. */
  ready: boolean;
  setSession: (session: Session | null) => void;
  markReady: () => void;
}

/**
 * Session state only (CLAUDE.md rule 12). Server data — profile, roles,
 * opportunities — belongs to TanStack Query, not this store.
 */
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  ready: false,
  setSession: (session) => set({ session }),
  markReady: () => set({ ready: true }),
}));
