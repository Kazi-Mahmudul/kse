import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';

/**
 * Shared chrome for the auth screens (login / register / forgot password):
 * a full-bleed photograph IS the screen — the form floats directly over it,
 * vertically centred, with no panel behind it. Readability comes from a
 * centre-weighted scrim under the form area plus glass input fills (see
 * `AuthTextField`), not from a card.
 *
 * The overlay palette below is deliberately NOT themed: the photo is the
 * brand surface, so light and dark mode render the exact same composition
 * (only platform text rendering differs).
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.flex}>
      {/* Background photograph — cover with a centre focus so the bridge
          and the graduates stay composed across portrait aspect ratios. */}
      <Image
        source={require('@/assets/images/Graduates Celebrating by the Riverside Bridge.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
        transition={300}
        accessible={false}
      />
      {/* Centre-weighted scrim: strongest where the form sits, lighter at
          the top/bottom so the photo stays clearly visible. */}
      <LinearGradient
        colors={['rgba(8,12,28,0.46)', 'rgba(8,12,28,0.64)', 'rgba(8,12,28,0.58)', 'rgba(8,12,28,0.40)']}
        locations={[0, 0.42, 0.72, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            alwaysBounceVertical={false}
          >
            <View style={styles.column}>
              {/* Header — centred exactly over the middle of the photo. */}
              <View style={styles.header}>
                <View style={styles.logoBadge}>
                  <Ionicons name="school" size={26} color="#ffffff" />
                </View>
                <ThemedText style={styles.title}>{title}</ThemedText>
                <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
              </View>

              {/* Transparent form — no panel, blends into the photo. */}
              <View style={styles.form}>{children}</View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    // Centre the whole block (heading + form) in the middle of the screen;
    // when content is taller than the viewport (small phones / keyboard)
    // flexGrow lets it scroll instead of clipping.
    flexGrow: 1,
    justifyContent: 'center',
  },
  column: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four + 2,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.one + 2,
    marginBottom: Spacing.four,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: Spacing.one,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.4,
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  form: {
    gap: Spacing.three,
  },
});
