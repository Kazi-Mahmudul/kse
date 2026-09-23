import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { FontFamilies, Spacing } from '@/constants/theme';
import { CommunityAvatar } from './community-avatar';
import { formatMemberCount } from '@/features/communities/format';
import { useTheme } from '@/hooks/use-theme';
import type { CommunityListItem } from '@kse/types';

/**
 * List-style community card for the Following / Discover / Recommended lists
 * (spec §Discovery). Press navigates to the community page.
 */
export function CommunityListCard({ community }: { community: CommunityListItem }) {
  const colors = useTheme();
  const router = useRouter();

  const scope = community.departmentName ?? community.universityName;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: '/(tabs)/community/[id]', params: { id: community.id } })
      }
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          boxShadow: `0px 1px 6px ${colors.shadow}`,
        },
        pressed && styles.pressed,
      ]}
    >
      {community.coverImageUrl ? (
        <Image
          source={{ uri: community.coverImageUrl }}
          style={styles.cover}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <CommunityAvatar slug={community.slug} name={community.name} size={48} radius={14} />
      )}
      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {community.name}
        </ThemedText>
        <View style={styles.metaRow}>
          {community.categoryName ? (
            <ThemedText type="small" themeColor="primary" style={styles.category}>
              {community.categoryName}
            </ThemedText>
          ) : null}
          {scope ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {scope}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={10} color={colors.textMuted} />
          <ThemedText type="small" themeColor="textMuted">
            {formatMemberCount(community.memberCount)}{' '}
            {community.memberCount === 1 ? 'member' : 'members'}
          </ThemedText>
        </View>
      </View>
      {community.isMember && <Badge label="Joined" tone="success" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three - 4,
    elevation: 1,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  category: {
    fontFamily: FontFamilies.semiBold,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.8,
  },
});
