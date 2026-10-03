import type { ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { blurActiveElement } from '@/lib/focus';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Bottom sheet for quick flows (add bazar item, exchange duty, pickers).
 * Tap the scrim to dismiss.
 *
 * Web uses `animationType="none"`: react-native-web's Modal only unmounts
 * after an `animationend` event that never fires in some browsers, leaving
 * an invisible full-screen node in the accessibility tree. Native keeps
 * the slide animation.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'web' ? 'none' : 'slide'}
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.scrim }]}
        onPress={() => {
          blurActiveElement();
          onClose();
        }}
      >
        <ThemedView
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} />
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          {children}
        </ThemedView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    opacity: 0.25,
    backgroundColor: '#8E8E93',
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    marginBottom: Spacing.three,
  },
});
