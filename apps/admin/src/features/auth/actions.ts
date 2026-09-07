'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@kse/validation';

import type { AuthActionState } from './types';

/** Maps Supabase auth errors to copy that is safe to show in the UI. */
function friendlyAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (message.includes('Email not confirmed')) {
    return 'This email has not been confirmed yet.';
  }
  if (message.includes('rate limit') || message.includes('Too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return 'Could not sign in. Please try again.';
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  // redirect() throws — keep it outside try/catch.
  redirect('/');
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
