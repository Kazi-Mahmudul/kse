import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { supabase } from '@/lib/supabase';

/**
 * Auth service (spec §9): email + password + Google sign-in (google.ts).
 * Screens stay thin — all Supabase calls and error translation live here.
 */

export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (message.includes('Password should be at least')) {
    return 'Password must be at least 8 characters.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email first — check your inbox.';
  }
  if (message.includes('Sign in with google') || message.includes('provider is disabled')) {
    return "Google sign-in isn't enabled for this app yet.";
  }
  if (message.includes('ID token') || message.includes('audience') || message.includes('invalid claim')) {
    return "We couldn't verify your Google sign-in. Please try again.";
  }
  if (message.includes('rate limit') || message.includes('Too many')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (message.includes('fetch') || message.includes('network')) {
    return 'Network problem. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export class AuthError extends Error {}

/** Throws a user-friendly AuthError when Supabase reports one. */
function fail(error: { message: string } | null | undefined): void {
  if (error) throw new AuthError(friendlyError(error));
}

export interface SignInParams {
  email: string;
  password: string;
}

export async function signIn({ email, password }: SignInParams) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  fail(error);
  return data;
}

export interface SignUpParams {
  full_name: string;
  email: string;
  password: string;
}

/**
 * Returns true when the user is signed in immediately (email confirmation
 * disabled); false when a confirmation email was sent instead.
 */
export async function signUp({ full_name, email, password }: SignUpParams): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });
  fail(error);
  return data.session !== null;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  fail(error);
  // Clear the native Google session too (best effort) so the account picker
  // reappears on the next Google sign-in instead of the last account.
  if (Platform.OS !== 'web') {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Never signed in with Google — nothing to clear.
    }
  }
}

export async function requestPasswordReset(email: string) {
  // TODO (step 4): pass `redirectTo` with the app's deep link once configured.
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  fail(error);
}
