import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * Platform-aware confirmation dialog. `Alert.alert` is a silent no-op on
 * react-native-web, so browser builds get `window.confirm` instead —
 * otherwise the confirm callback (e.g. sign out) simply never runs.
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const ok =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(`${options.title}\n\n${options.message}`)
        : false;
    return Promise.resolve(ok);
  }

  return new Promise((resolve) => {
    Alert.alert(options.title, options.message, [
      { text: options.cancelLabel ?? 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: options.confirmLabel ?? 'OK',
        style: options.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export interface AlertOptions {
  title: string;
  message: string;
  dismissLabel?: string;
}

/**
 * Platform-aware informational dialog (no cancel button). Same web fallback
 * reason as `confirmDialog` — `Alert.alert` is a no-op on react-native-web.
 */
export function alertDialog(options: AlertOptions): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${options.title}\n\n${options.message}`);
    }
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    Alert.alert(options.title, options.message, [
      { text: options.dismissLabel ?? 'OK', onPress: () => resolve() },
    ]);
  });
}
