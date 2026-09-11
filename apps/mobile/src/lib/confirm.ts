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
