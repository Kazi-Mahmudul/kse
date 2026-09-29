import { router, useNavigation, type Href } from 'expo-router';
import { useCallback } from 'react';

/**
 * Back navigation that never triggers the "GO_BACK was not handled" warning.
 *
 * `router.back()` (and `router.canGoBack()`) follow the merged browser
 * history on web, which can claim there is somewhere to go back to while the
 * focused navigator actually holds a single screen — dispatching GO_BACK then
 * logs the unhandled-action warning. This checks the real navigator instead:
 * pop it when it can pop, otherwise replace onto `fallback`.
 */
export function useSmartBack(fallback: Href = '/') {
  const navigation = useNavigation();
  return useCallback(() => {
    if (navigation?.canGoBack()) navigation.goBack();
    else router.replace(fallback);
  }, [fallback, navigation]);
}
