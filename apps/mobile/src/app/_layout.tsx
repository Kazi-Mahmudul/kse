import {
  HindSiliguri_400Regular,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} from '@expo-google-fonts/hind-siliguri';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  router,
  Stack,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { blurActiveElement } from '@/lib/focus';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

/**
 * Restores the persisted session, keeps the store in sync with Supabase,
 * and gates navigation: unauthenticated users can only reach (auth).
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const setSession = useAuthStore((s) => s.setSession);
  const markReady = useAuthStore((s) => s.markReady);
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      markReady();
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      markReady();
    });
    return () => subscription.unsubscribe();
  }, [setSession, markReady]);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [ready, session, segments]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null; // keep the native splash visible until restored
  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const [client] = useState(() => queryClient);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    HindSiliguri_400Regular,
    HindSiliguri_600SemiBold,
    HindSiliguri_700Bold,
  });

  // Push the user's preference into RN's `Appearance` so internals follow:
  // Alert buttons, `ActivityIndicator` defaults, modal backdrop tint, and
  // keyboard appearance all read this.
  //
  // RN web doesn't ship `Appearance.setColorScheme` (only the read side), so
  // we guard on `Platform.OS`. Web already follows OS via `useRNColorScheme()`
  // inside `use-color-scheme.web.ts`, so skipping is harmless.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // "system" clears the override — but each platform spells that differently:
    // Android's Kotlin module takes a non-null String and crashes on `null`;
    // it restores OS-following via "unspecified" (MODE_NIGHT_FOLLOW_SYSTEM).
    // iOS is the opposite: `null` unsets, "unspecified" is not a value there.
    const next: 'light' | 'dark' | 'unspecified' | null =
      themePreference === 'system'
        ? Platform.OS === 'android'
          ? 'unspecified'
          : null
        : themePreference;
    // `ColorSchemeName` is `'light' | 'dark'` in the typings, but `setColorScheme`
    // accepts more at runtime — cast so we keep the call site honest about intent.
    (Appearance.setColorScheme as (
      s: 'light' | 'dark' | 'unspecified' | null,
    ) => void)(next);
  }, [themePreference]);

  if (!fontsLoaded) return null; // keep splash until Poppins + Hind Siliguri are ready

  return (
    // GestureDetector (home promo carousel) needs the gesture-handler root.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <QueryClientProvider client={client}>
          <AuthGate>
            <Stack
              screenOptions={{ headerShown: false }}
              screenListeners={{
                // Expo-router keeps covered stack screens mounted but marks
                // them `aria-hidden` (its Screen element). On web the button
                // that triggered the navigation keeps DOM focus, so Chrome
                // blocks the hide ("Blocked aria-hidden … descendant retained
                // focus"). Listeners fire during dispatch — before the covered
                // screen commits — so dropping focus here prevents it.
                state: blurActiveElement,
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="create" options={{ presentation: 'modal' }} />
            </Stack>
          </AuthGate>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
