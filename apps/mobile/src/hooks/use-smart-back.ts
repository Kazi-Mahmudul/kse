import { router, useNavigation, usePathname, type Href } from 'expo-router';
import { useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * Derives a sensible hierarchical parent route from the current pathname
 * for cold opens or deep links where no navigation history exists yet.
 */
export function getDefaultParentRoute(pathname?: string | null): Href {
  if (!pathname) return '/(tabs)';

  // Strip query parameters and trailing slashes
  const clean = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  // Normalize by removing leading /(tabs) if present
  const normalized = clean.replace(/^\/\(tabs\)/, '') || '/';

  // Sub-routes under explore/mentorship
  if (normalized.startsWith('/explore/mentorship/chat/')) return '/(tabs)/explore/mentorship/chat' as Href;
  if (normalized === '/explore/mentorship/chat') return '/(tabs)/explore/mentorship' as Href;
  if (normalized === '/explore/mentorship/discussion') return '/(tabs)/explore/mentorship/community' as Href;
  if (normalized === '/explore/mentorship/edit-profile') return '/(tabs)/explore/mentorship/mentor-portal' as Href;
  if (normalized === '/explore/mentorship/filter') return '/(tabs)/explore/mentorship/listing' as Href;
  if (normalized.startsWith('/explore/mentorship/')) return '/(tabs)/explore/mentorship' as Href;
  if (normalized === '/explore/mentorship') return '/(tabs)/explore' as Href;

  // Sub-routes under explore/tolet
  if (normalized.startsWith('/explore/tolet/')) return '/(tabs)/explore/tolet' as Href;
  if (normalized === '/explore/tolet') return '/(tabs)/explore' as Href;

  // Other explore sections
  if (normalized.startsWith('/explore/')) return '/(tabs)/explore' as Href;
  if (normalized === '/explore') return '/(tabs)' as Href;

  // Tuition
  if (normalized === '/tuition-requests' || normalized === '/tuition-request') return '/(tabs)/explore/tuition' as Href;

  // Profile
  if (normalized.startsWith('/profile/')) return '/(tabs)/profile' as Href;
  if (normalized === '/profile') return '/(tabs)' as Href;

  // Portfolio
  if (normalized.startsWith('/portfolio/')) return '/(tabs)/profile' as Href;
  if (normalized === '/portfolio') return '/(tabs)/profile' as Href;

  // Community
  if (normalized.startsWith('/community/') && normalized.includes('/create-')) {
    const match = normalized.match(/^(\/community\/[^/]+)/);
    if (match) return `/(tabs)${match[1]}` as Href;
    return '/(tabs)/community' as Href;
  }
  if (normalized.startsWith('/community/')) return '/(tabs)/community' as Href;
  if (normalized === '/community') return '/(tabs)' as Href;

  // Mess
  if (normalized.match(/^\/mess\/[^/]+\/bazar\/(duty|add)/)) {
    const match = normalized.match(/^(\/mess\/[^/]+)/);
    return match ? (`${match[1]}/bazar` as Href) : ('/mess' as Href);
  }
  if (normalized.match(/^\/mess\/[^/]+\/[^/]+/)) {
    const match = normalized.match(/^(\/mess\/[^/]+)/);
    return match ? (match[1] as Href) : ('/mess' as Href);
  }
  if (normalized.startsWith('/mess/')) return '/mess' as Href;
  if (normalized === '/mess') return '/(tabs)' as Href;

  // Student Hub
  if (normalized.startsWith('/hub/listing/')) return '/hub' as Href;
  if (normalized.startsWith('/hub/book-exchange/')) return '/hub/book-exchange' as Href;
  if (normalized === '/hub/book-exchange') return '/hub' as Href;
  if (normalized.startsWith('/hub/research/')) return '/hub/research' as Href;
  if (normalized === '/hub/research') return '/hub' as Href;
  if (normalized.startsWith('/hub/')) return '/hub' as Href;
  if (normalized === '/hub') return '/(tabs)' as Href;

  // Top-level modals and utility screens
  if (normalized === '/create') return '/(tabs)' as Href;
  if (normalized === '/search' || normalized === '/saved' || normalized === '/notifications') return '/(tabs)' as Href;

  // Fallback: strip last path segment if multi-segment
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length > 1) {
    segments.pop();
    return `/(tabs)/${segments.join('/')}` as Href;
  }

  return '/(tabs)' as Href;
}

/**
 * Smart back navigation hook.
 *
 * Guarantees that users return to their real previous page or state:
 * 1. Checks local navigator canGoBack() (pops stacks or tabs with history).
 * 2. Checks global router canGoBack() across all parent navigators.
 * 3. On web, checks session browser history depth.
 * 4. Only falls back to hierarchical parent route when no previous state exists
 *    (preventing the app-wide bug where users get dumped at the homepage).
 */
export function useSmartBack(fallback?: Href) {
  const navigation = useNavigation();
  const pathname = usePathname();

  return useCallback(() => {
    // 1. If local navigator can go back, pop it
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    // 2. If the global Expo router can go back, pop root or parent navigators
    if (router.canGoBack()) {
      router.back();
      return;
    }

    // 3. On web, if the browser history stack has prior entries in this session
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const historyIdx = (window.history.state as { idx?: number } | null)?.idx;
      if (typeof historyIdx === 'number' && historyIdx > 0) {
        window.history.back();
        return;
      }
    }

    // 4. Truly no history exists (direct URL cold load or page refresh).
    // Calculate sensible parent route rather than defaulting to '/' (home).
    const resolvedFallback =
      fallback && fallback !== '/' && fallback !== '/(tabs)'
        ? fallback
        : getDefaultParentRoute(pathname);

    router.replace(resolvedFallback);
  }, [fallback, navigation, pathname]);
}
