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
import { useEffect, useRef, useState } from 'react';
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
 *
 * Flicker suppression: Supabase's `onAuthStateChange` callback can fire
 * with a transient `null` session during token refresh (the listener is
 * invoked before the refreshed session object arrives). Without a guard
 * those nulls leak into the auth store, the gate re-runs, and
 * `router.replace('/(auth)/login')` teleports the user out of whatever
 * screen they were on — that's the "back button takes me to home" bug.
 * We track the last known stable session in a ref and only treat a null
 * as a genuine sign-out when the event is `SIGNED_OUT`. Ordinary back
 * navigation (a `segments` change without an auth change) is allowed to
 * pass through unmolested.
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
    // onFinishHydration fires once rehydration finishes. If it already
    // finished before mount, the lazy `useState` initializer above picked
    // up `hasHydrated() === true`, so we don't need to re-check here.
    return useSettingsStore.persist.onFinishHydration(() =>
      setSettingsHydrated(true),
    );
  }, []);

  const segments = useSegments();

  // Last session we believe is "really" valid — used to distinguish a
  // genuine sign-out from a Supabase token-refresh flicker.
  const lastStableSessionRef = useRef<typeof session>(null);

  useEffect(() => {
    let firstEvent = true;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) lastStableSessionRef.current = data.session;
      markReady();
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // `INITIAL_SESSION` from `getSession` already delivered the real
      // session above; the listener firing with the same value is fine.
      // Skip the first listener fire so we don't double-update.
      if (firstEvent) {
        firstEvent = false;
        // ...but still seed the stable-session ref if the listener is
        // the one that delivered the first real session.
        if (nextSession) lastStableSessionRef.current = nextSession;
        return;
      }
      // SIGNED_OUT is the only event that genuinely clears the session.
      // A null session alongside TOKEN_REFRESHED / USER_UPDATED / etc.
      // is a flicker — keep the previous session alive.
      if (event === 'SIGNED_OUT') {
        lastStableSessionRef.current = null;
        setSession(null);
        markReady();
        return;
      }
      if (!nextSession && lastStableSessionRef.current) {
        // Transient null while we still believe the user is signed in.
        // Ignore — the next event will deliver the refreshed session.
        return;
      }
      if (nextSession) lastStableSessionRef.current = nextSession;
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

    // Genuine sign-out (no stable session AND no flicker in progress)
    // → force-login. If `lastStableSessionRef.current` is set, the null
    // is a flicker and we leave the user where they are.
    if (!session && !lastStableSessionRef.current && !inAuthGroup) {
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
