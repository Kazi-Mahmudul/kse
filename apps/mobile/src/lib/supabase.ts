import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Create apps/mobile/.env (see .env.example at the repo root).',
  );
}

/**
 * Auth token storage: encrypted on device via SecureStore; plain localStorage
 * on web (SecureStore is unsupported there). The typeof guards keep static
 * export (SSR) alive — supabase-js touches storage during client init.
 */
const tokenStorage = {
  getItem: (key: string) => {
    if (Platform.OS !== 'web') return SecureStore.getItemAsync(key);
    return Promise.resolve(typeof localStorage === 'undefined' ? null : localStorage.getItem(key));
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS !== 'web') return SecureStore.setItemAsync(key, value);
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (Platform.OS !== 'web') return SecureStore.deleteItemAsync(key);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return Promise.resolve();
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: tokenStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
