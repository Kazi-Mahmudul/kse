/**
 * Cross-platform dialogs.
 *
 * react-native-web's `Alert` is a silent no-op stub — callbacks passed to
 * `Alert.alert(...)` never run on web, which would dead-end every
 * confirmation flow (delete bazar, lock month, reject exchange…).
 * These wrappers fall back to native browser dialogs on web and keep the
 * real `Alert` API on iOS/Android.
 */

import { Alert, Platform } from 'react-native';

export interface DialogOption {
  label: string;
  onPress?: () => void;
  destructive?: boolean;
}

/** Informational dialog with a single OK action. */
export function alertInfo(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** Error dialog: title + server/app message. */
export function alertError(title: string, message: string): void {
  alertInfo(title, message);
}

/**
 * Confirmation dialog with Cancel + one action.
 * The action runs only when confirmed.
 */
export function alertConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  options: { confirmLabel?: string; destructive?: boolean } = {},
): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: options.confirmLabel ?? 'Confirm',
      style: options.destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}

/**
 * Action sheet: several labelled options (plus Cancel). On web this uses a
 * prompt-style fallback; the first option is the suggested action.
 */
export function alertChoice(title: string, options: DialogOption[]): void {
  if (Platform.OS === 'web') {
    const menu = options.map((o, i) => `${i + 1}. ${o.label}`).join('\n');
    const answer = window.prompt(`${title}\n\n${menu}\n\nEnter a number:`);
    const idx = parseInt(answer ?? '', 10) - 1;
    if (Number.isInteger(idx) && idx >= 0 && idx < options.length) {
      options[idx].onPress?.();
    }
    return;
  }
  Alert.alert(title, undefined, [
    ...options.map((o) => ({
      text: o.label,
      style: o.destructive ? ('destructive' as const) : ('default' as const),
      onPress: o.onPress,
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}
