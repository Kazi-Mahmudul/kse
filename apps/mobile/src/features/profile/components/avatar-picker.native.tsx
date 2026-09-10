import { Ionicons } from '@expo/vector-icons';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { FontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface AvatarPickerProps {
  url: string | null;
  name: string;
  uploading: boolean;
  /** Called with the cropped local URI and the chosen MIME type. */
  onPicked: (payload: { localUri: string; mimeType: string }) => void;
  /** "Remove photo" affordance — only wired when `url` is non-null. */
  onRemove?: () => void;
}

const AVATAR_SIZE = 96;

/**
 * Centre-crop a local image to a 1:1 square using `expo-image-manipulator`'s
 * SDK 57 chainable API. Returns the cropped URI plus a MIME type that matches
 * the storage bucket's whitelist (`image/jpeg | image/png | image/webp`).
 *
 * The picker already reports `width`/`height`, so we skip the preview render
 * pass — that's the documented short-circuit and avoids a wasted pass on the
 * background thread. HEIC and other formats the system can't decode are
 * coerced to JPEG for parity across iOS / Android.
 */
async function cropToSquare(
  localUri: string,
  width: number,
  height: number,
  sourceMime: string | undefined,
): Promise<{ uri: string; mimeType: string }> {
  // Some pickers (HEIC on older Android) report zero dimensions. Fall back
  // to the manip renderAsync() pass so we have something concrete to crop.
  let w = width;
  let h = height;
  if (!w || !h) {
    const probe = await ImageManipulator.manipulate(localUri).renderAsync();
    w = probe.width;
    h = probe.height;
  }

  const side = Math.min(w, h);
  const originX = Math.floor((w - side) / 2);
  const originY = Math.floor((h - side) / 2);

  const imageRef = await ImageManipulator.manipulate(localUri)
    .crop({ originX, originY, width: side, height: side })
    .resize({ width: AVATAR_SIZE * 2 }) // 2x for retina
    .renderAsync();

  const format = sourceMime === 'image/png' ? SaveFormat.PNG : SaveFormat.JPEG;
  const result = await imageRef.saveAsync({ format, compress: 0.85 });
  return {
    uri: result.uri,
    mimeType: format === SaveFormat.PNG ? 'image/png' : 'image/jpeg',
  };
}

/**
 * Tappable avatar with a small camera badge. Tapping opens the system
 * library picker, crops the result to 1:1, and hands the cropped file off
 * to the parent via `onPicked`. Shows an inline "Remove" link only when an
 * avatar already exists. Stays inert while `uploading` so the badge doesn't
 * flicker during the network round-trip.
 */
export function AvatarPicker({
  url,
  name,
  uploading,
  onPicked,
  onRemove,
}: AvatarPickerProps) {
  const colors = useTheme();
  const [busy, setBusy] = useState(false);

  const pick = useCallback(async () => {
    if (busy || uploading) return;
    setBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photos access needed',
          'Please allow Photos access in Settings to choose a profile photo.',
          [{ text: 'OK' }],
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // we crop with `expo-image-manipulator` for parity
        quality: 1,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const cropped = await cropToSquare(asset.uri, asset.width, asset.height, asset.mimeType);
      onPicked({ localUri: cropped.uri, mimeType: cropped.mimeType });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Something went wrong while preparing the photo. Please try again.';
      Alert.alert('Could not pick image', message, [{ text: 'OK' }]);
    } finally {
      setBusy(false);
    }
  }, [busy, uploading, onPicked]);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={pick}
        disabled={busy || uploading}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        accessibilityHint="Opens your photo library"
        style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}
      >
        <ProfileAvatar name={name} url={url} size={AVATAR_SIZE} ringSize={2} />
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.primary, borderColor: colors.background },
          ]}
        >
          <Ionicons name="camera" size={14} color={colors.onPrimary} />
        </View>
      </Pressable>

      <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
        {uploading ? 'Uploading…' : busy ? 'Preparing…' : 'Tap to change'}
      </ThemedText>

      {url && onRemove ? (
        <Pressable
          onPress={onRemove}
          disabled={busy || uploading}
          accessibilityRole="button"
          accessibilityLabel="Remove profile photo"
          style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
        >
          <ThemedText type="small" style={{ color: colors.danger }}>
            Remove photo
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  avatarWrap: {
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontFamily: FontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  removeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});
