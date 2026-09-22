import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { supabase } from '@/lib/supabase';
import { AuthError, friendlyError } from '@/features/auth/service';

/**
 * Google sign-in (spec §9): native account picker mints a Google ID token,
 * which Supabase verifies via signInWithIdToken. The session lands in the
 * auth store through onAuthStateChange exactly like email + password.
 */

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  if (!webClientId) {
    throw new AuthError(
      'Google sign-in is missing its client ID. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in apps/mobile/.env.',
    );
  }
  GoogleSignin.configure({
    webClientId,
    // We only need the identity; no server-side Google API access.
    offlineAccess: false,
  });
  configured = true;
}

/** Translates native Google SDK failures into user-facing AuthErrors. */
function friendlyNativeError(error: unknown): AuthError {
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.IN_PROGRESS) {
      return new AuthError('A Google sign-in is already in progress.');
    }
    // Classic misconfiguration: the build's SHA-1 fingerprint or client ID
    // doesn't match what's registered in Google Cloud Console.
    if (/DEVELOPER_ERROR/i.test(`${error.code} ${error.message}`)) {
      return new AuthError(
        "Google sign-in isn't set up for this app build (SHA-1 fingerprint).",
      );
    }
  }
  return new AuthError('Google sign-in failed. Please try again.');
}

/**
 * Runs the native Google sign-in flow and exchanges the ID token for a
 * Supabase session. Returns false when the user dismisses the account
 * picker — that's a cancel, not an error.
 */
export async function signInWithGoogle(): Promise<boolean> {
  ensureConfigured();

  const playServicesAvailable = await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: false,
  }).catch(() => false);
  if (!playServicesAvailable) {
    throw new AuthError('Google Play Services is required for Google sign-in.');
  }

  let idToken: string | null;
  try {
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return false;
    idToken = response.data.idToken;
  } catch (error) {
    throw friendlyNativeError(error);
  }

  if (!idToken) {
    throw new AuthError('Google sign-in did not return a token. Please try again.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw new AuthError(friendlyError(error));
  return true;
}
