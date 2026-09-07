import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CommunityListItem } from '@kse/types';

interface CommunityCardProps {
  community: CommunityListItem;
}

/** Compact community row: name, university, member count + join badge. */
export function CommunityCard({ community }: CommunityCardProps) {
  const colors = useTheme();

  const open = () =>
    router.push({
      pathname: '/(tabs)/community/[id]',
      params: { id: community.id },
    });

  return (
    <Card onPress={open} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}1A` }]}>
          <Ionicons name="people-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
              {community.name}
            </ThemedText>
            {community.isMember && <Badge label="Joined" tone="success" />}
          </View>
          {community.universityName && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {community.universityName}
            </ThemedText>
          )}
          {community.description && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {community.description}
            </ThemedText>
          )}
        </View>
      </View>
      <View style={styles.footRow}>
        <View style={styles.meta}>
          <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            {community.memberCount}{' '}
            {community.memberCount === 1 ? 'member' : 'members'}
          </ThemedText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  title: {
    flexShrink: 1,
  },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
