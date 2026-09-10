import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { FontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface AvatarPickerProps {
  url: string | null;
  name: string;
  uploading: boolean;
  onPicked: (payload: { localUri: string; mimeType: string }) => void;
  onRemove?: () => void;
}

const AVATAR_SIZE = 96;

/**
 * Web fallback for `avatar-picker.native.tsx`. The native picker
 * (`expo-image-picker` + `expo-image-manipulator`) doesn't ship a web
 * build, so on web we render a read-only avatar with a tooltip explaining
 * the limitation. The mobile app is the supported target — this stub
 * exists so the web preview boots cleanly for design review.
 */
export function AvatarPicker({ url, name, uploading: _uploading }: AvatarPickerProps) {
  const colors = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.avatarWrap}>
        <ProfileAvatar name={name} url={url} size={AVATAR_SIZE} ringSize={2} />
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.primary, borderColor: colors.background },
          ]}
        >
          <Ionicons name="camera" size={14} color={colors.onPrimary} />
        </View>
      </View>
      <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
        Tap to change (mobile only)
      </ThemedText>
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
});
