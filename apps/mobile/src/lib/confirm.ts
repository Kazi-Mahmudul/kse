import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /**
   * Optional list of reason buttons (e.g. report-this-listing reasons).
   * When provided, the dialog renders one button per entry plus the cancel
   * button. Each entry's `onPress` is invoked when the user picks it; the
   * returned promise resolves to `true` after the chosen `onPress` returns.
   */
  buttons?: { text: string; onPress: () => void | Promise<void> }[];
}

/**
 * Platform-aware confirmation dialog. `Alert.alert` is a silent no-op on
 * react-native-web, so browser builds get `window.confirm` instead —
 * otherwise the confirm callback (e.g. sign out) simply never runs.
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (options.buttons && options.buttons.length > 0) {
      // Web has no multi-button dialog — fall back to the cancel path with
      // an explanatory note. The user should retry from the native app to
      // actually choose a reason.
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(
        `${options.title}\n\n${options.message}\n\n(Reason picker only available in the mobile app.)`,
      );
    }
      return Promise.resolve(false);
    }
    const ok =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(`${options.title}\n\n${options.message}`)
        : false;
    return Promise.resolve(ok);
  }

  if (options.buttons && options.buttons.length > 0) {
    const reasonButtons = options.buttons;
    return new Promise<boolean>((resolve) => {
      const buttons = [
        ...reasonButtons.map((button) => ({
          text: button.text,
          style: 'default' as const,
          onPress: async () => {
            await button.onPress();
            resolve(true);
          },
        })),
        {
          text: options.cancelLabel ?? 'Cancel',
          style: 'cancel' as const,
          onPress: () => resolve(false),
        },
      ];
      Alert.alert(options.title, options.message, buttons);
    });
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
