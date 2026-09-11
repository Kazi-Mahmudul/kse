import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { CommunityAvatar } from '@/features/communities/components/community-avatar';
import { formatMemberCount } from '@/features/communities/format';
import { useTheme } from '@/hooks/use-theme';
import type { CommunityListItem } from '@kse/types';

interface CommunityTileCardProps {
  community: CommunityListItem;
}

/**
 * Compact community card for the Community tab "Your Communities"
 * 2x2 grid (spec 09._community_kse).
 *
 * Chrome is delegated to the shared `<Card tint="background">` so dark mode
 * + border + elevation all resolve from the theme tokens automatically. The
 * 36×36 colored avatar is the only piece of *data* — it stays fixed so each
 * community reads the same regardless of color scheme.
 *
 * Layout:
 *   ┌────────────────────┐
 *   │ [AA]  Title        │
 *   │        Subtitle    │
 *   │ ─────────────────  │
 *   │ 1.2K Members       │
 *   └────────────────────┘
 */
export function CommunityTileCard({ community }: CommunityTileCardProps) {
  const colors = useTheme();

  const open = () =>
    router.push({
      pathname: '/(tabs)/community/[id]',
      params: { id: community.id },
    });

  return (
    <Card
      tint="background"
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`Open ${community.name}`}
      style={[
        styles.tile,
        {
          borderColor: colors.border,
          boxShadow: `0px 4px 8px ${colors.shadow}`,
        },
      ]}
    >
      <View style={styles.head}>
        <CommunityAvatar slug={community.slug} name={community.name} size={36} radius={12} />
      </View>
      <View style={styles.body}>
        <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
          {community.name}
        </ThemedText>
        {community.universityName ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={1}
            style={styles.subtitle}
          >
            {community.universityName}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.memberLine}>
          {formatMemberCount(community.memberCount)} Members
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 132,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'space-between',
    elevation: 1,
  },
  head: {
    marginBottom: Spacing.two,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 12,
    lineHeight: 16,
  },
  subtitle: {
    fontSize: 10,
    lineHeight: 14,
  },
  footer: {
    marginTop: Spacing.two,
  },
  memberLine: {
    fontSize: 10,
    lineHeight: 14,
  },
});
