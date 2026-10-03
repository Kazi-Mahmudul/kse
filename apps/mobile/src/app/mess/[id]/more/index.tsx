/**
 * More — the fifth mess tab (spec §19): everything that shouldn't crowd
 * the main tab bar. Members, Expenses, Settlement, Payments, Duty
 * Calendar, Announcements and Settings.
 */

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMessAnnouncements, useMessDetail } from '@/features/mess/queries';
import { MessScreen } from '@/features/mess/components/mess-screen';
import { SectionLabel } from '@/features/mess/components/section-label';
import { formatDayMonth } from '@/features/mess/lib/dates';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const LINKS: { label: string; icon: IoniconName; path: string; description: string }[] = [
  { label: 'Members', icon: 'people-outline', path: '/mess/[id]/members', description: 'Who lives here and join requests' },
  { label: 'Expenses', icon: 'receipt-outline', path: '/mess/[id]/expenses', description: 'Rent, bills and shared costs' },
  { label: 'Settlement', icon: 'document-text-outline', path: '/mess/[id]/settlement', description: 'Monthly closing and balances' },
  { label: 'Payments', icon: 'cash-outline', path: '/mess/[id]/finance', description: 'Your balance and payment history' },
  { label: 'Duty Calendar', icon: 'calendar-outline', path: '/mess/[id]/bazar/duty', description: 'Who buys on which day' },
  { label: 'Settings', icon: 'settings-outline', path: '/mess/[id]/settings', description: 'Mess info, meal cut-offs, announcements' },
];

export default function MessMoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const messId = String(id ?? '');

  const { data: mess } = useMessDetail(messId);
  const { data: announcements } = useMessAnnouncements(messId);

  return (
    <MessScreen messId={messId} active="more">
      {/* Mess identity card */}
      <View style={[styles.card, { backgroundColor: `${colors.primary}0F`, borderColor: `${colors.primary}33` }]}>
        <ThemedText type="subtitle" numberOfLines={1}>
          {mess?.name ?? 'Mess'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {[mess?.location, mess?.code ? `Code ${mess.code}` : null].filter(Boolean).join(' · ')}
        </ThemedText>
      </View>

      {/* Announcements (§17 — lightweight list, not a feed) */}
      {announcements && announcements.length > 0 ? (
        <View style={styles.announcements}>
          <SectionLabel>ANNOUNCEMENTS</SectionLabel>
          {announcements.slice(0, 3).map((a) => (
            <View key={a.id} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.announceHead}>
                <Ionicons name="megaphone-outline" size={14} color={colors.primary} />
                <ThemedText type="smallBold" numberOfLines={1} style={styles.announceTitle}>
                  {a.title}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {a.content}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {formatDayMonth(a.created_at.slice(0, 10))}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      {/* Section links */}
      <SectionLabel>MESS SECTIONS</SectionLabel>
      <View style={styles.links}>
        {LINKS.map((link) => (
          <Pressable
            key={link.path}
            onPress={() => router.push({ pathname: link.path, params: { id: messId } } as never)}
            accessibilityRole="button"
            accessibilityLabel={link.label}
            style={({ pressed }) => [
              styles.link,
              { backgroundColor: colors.background, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.linkIcon, { backgroundColor: `${colors.primary}14` }]}>
              <Ionicons name={link.icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.linkMeta}>
              <ThemedText type="smallBold">{link.label}</ThemedText>
              <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
                {link.description}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </MessScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 4,
  },
  announcements: {
    gap: Spacing.three - 6,
  },
  announceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  announceTitle: {
    flex: 1,
    fontFamily: FontFamilies.semiBold,
  },
  links: {
    gap: Spacing.three - 6,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  linkIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkMeta: {
    flex: 1,
    gap: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
