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
 * Three-layer navigation gate, evaluated in this order:
 *
 *   1. Onboarding: if the user hasn't seen the welcome/opportunities/
 *      community screens yet, route to /onboarding/welcome regardless of
 *      auth state. Tapping Start / Next / Skip sets
 *      `hasCompletedOnboarding` in the persisted settings store and the
 *      next effect pass reroutes out of onboarding.
 *   2. Auth: if onboarding is done and there's no session, push to
 *      /(auth)/login.
 *   3. Auth → tabs: if the user is on an auth screen with a valid session,
 *      push to /(tabs).
 *
 * The gate waits on both `authReady` (Supabase session restored) and
 * `settingsHydrated` (AsyncStorage rehydrated) before it does anything.
 * Without that wait we'd race the gate against the persisted state on
 * cold start and either skip onboarding for existing users or show
 * onboarding twice.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const setSession = useAuthStore((s) => s.setSession);
  const markReady = useAuthStore((s) => s.markReady);
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);
  // `persist.hasHydrated()` is a static API on the persisted store —
  // subscribe to it so the gate waits until AsyncStorage has rehydrated
  // before deciding where to route.
  const [settingsHydrated, setSettingsHydrated] = useState(
    useSettingsStore.persist.hasHydrated(),
  );
  useEffect(() => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => setSettingsHydrated(true));
    // Cover the case where rehydration already finished before this effect
    // ran (e.g. on subsequent renders).
    if (useSettingsStore.persist.hasHydrated()) setSettingsHydrated(true);
    return unsub;
  }, []);
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
    if (!ready || !settingsHydrated) return;

    const inOnboarding = segments[0] === 'onboarding';
    const inAuthGroup = segments[0] === '(auth)';

    if (!hasCompletedOnboarding) {
      // Cold start, never seen onboarding → push to the welcome screen.
      if (!inOnboarding) router.replace('/onboarding/welcome');
      return;
    }

    // Onboarding finished but the user is still parked on an onboarding
    // route (e.g. they hit back from login and we're between renders).
    if (inOnboarding) {
      router.replace(session ? '/(tabs)' : '/(auth)/login');
      return;
    }

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [ready, settingsHydrated, hasCompletedOnboarding, session, segments]);

  useEffect(() => {
    if (ready && settingsHydrated) SplashScreen.hideAsync();
  }, [ready, settingsHydrated]);

  if (!ready || !settingsHydrated) return null; // keep the native splash visible
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
              <Stack.Screen name="onboarding" />
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
