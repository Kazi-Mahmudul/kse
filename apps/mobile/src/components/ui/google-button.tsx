import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/**
 * Social auth chrome for the (auth) screens: a hairline "OR" divider and the
 * Google outline button. Rendered only on native — the Google SDK has no web
 * implementation — so screens wrap the pair in a `Platform.OS !== 'web'` guard.
 */

interface GoogleButtonProps {
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  /**
   * Glass treatment for the auth screens, where the button floats directly
   * on the photograph: translucent fill + white border/label, identical in
   * light and dark mode (the photo is the surface). Default keeps the
   * themed solid treatment for any other context.
   */
  glass?: boolean;
}

/** Google brand "G" (official multi-color marks; brand-asset paths). */
function GoogleMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

export function GoogleButton({
  loading = false,
  disabled = false,
  onPress,
  glass = false,
}: GoogleButtonProps) {
  const colors = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityLabel="Continue with Google"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        glass
          ? styles.buttonGlass
          : {
              backgroundColor: colors.background,
              borderColor: colors.backgroundSelected,
            },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <View style={styles.spinnerRow}>
          <ActivityIndicator size="small" color={glass ? '#ffffff' : colors.text} />
        </View>
      ) : (
        <>
          <GoogleMark size={18} />
          <Text
            style={[styles.label, glass ? styles.labelGlass : { color: colors.heading }]}
          >
            Continue with Google
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Hairline divider with a centered "OR" between primary and social auth. */
export function AuthDivider({ glass = false }: { glass?: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.divider} pointerEvents="none">
      <View
        style={[
          styles.dividerLine,
          glass
            ? styles.dividerLineGlass
            : { backgroundColor: colors.backgroundSelected },
        ]}
      />
      <Text
        style={[styles.dividerText, glass ? styles.dividerTextGlass : { color: colors.textMuted }]}
      >
        OR
      </Text>
      <View
        style={[
          styles.dividerLine,
          glass
            ? styles.dividerLineGlass
            : { backgroundColor: colors.backgroundSelected },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Mirrors PrimaryButton's `regular` geometry so the auth CTAs align.
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    minHeight: 46,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  spinnerRow: {
    minHeight: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonGlass: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderColor: 'rgba(255,255,255,0.38)',
  },
  labelGlass: {
    color: '#ffffff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dividerLineGlass: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dividerTextGlass: {
    color: 'rgba(255,255,255,0.75)',
  },
});

// Re-export so consumers can branch on platform without importing react-native.
export const googleSignInSupported = Platform.OS !== 'web';
