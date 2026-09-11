import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type {
  PortfolioAchievementItem,
  PortfolioCertificateItem,
  PortfolioLinkItem,
  PortfolioProjectItem,
  PortfolioResearchItem,
  PortfolioResumeItem,
} from '@kse/types';

import { ThemedText } from '@/components/themed-text';
import { Spacing, type TintKey } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { formatDate } from '@/lib/dates';
import type { IconName } from '@/types/icon';

/**
 * Portfolio item cards, in the app-wide card language (tinted icon badge,
 * bordered surface, soft shadow — same chrome as the opportunity/tutor
 * cards). The card is a plain View and the two icon actions are the only
 * Pressables, so RNW renders no nested buttons (see internship-card.tsx).
 */

interface CardSpec {
  icon: IconName;
  tint: TintKey;
}

const SPECS: Record<PortfolioKind, CardSpec> = {
  project: { icon: 'folder-open-outline', tint: 'indigo' },
  certificate: { icon: 'shield-checkmark-outline', tint: 'cyan' },
  achievement: { icon: 'trophy-outline', tint: 'amber' },
  research: { icon: 'flask-outline', tint: 'emerald' },
  resume: { icon: 'document-text-outline', tint: 'purple' },
  link: { icon: 'link-outline', tint: 'sky' },
};

type PortfolioKind =
  | 'project'
  | 'certificate'
  | 'achievement'
  | 'research'
  | 'resume'
  | 'link';

function CardShell({
  kind,
  title,
  meta,
  onEdit,
  onDelete,
  children,
}: {
  kind: PortfolioKind;
  title: string;
  meta?: string | null;
  onEdit(): void;
  onDelete(): void;
  children?: React.ReactNode;
}) {
  const colors = useTheme();
  const tints = useTints();
  const { icon, tint } = SPECS[kind];
  const palette = tints[tint];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          boxShadow: `0px 1px 6px ${colors.shadow}`,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: palette.bg }]}>
          <Ionicons name={icon} size={18} color={palette.fg} />
        </View>

        <View style={styles.titleBlock}>
          <ThemedText themeColor="heading" style={styles.title} numberOfLines={2}>
            {title}
          </ThemedText>
          {meta ? (
            <ThemedText themeColor="textSecondary" style={styles.meta} numberOfLines={1}>
              {meta}
            </ThemedText>
          ) : null}
        </View>

        <CardActions onEdit={onEdit} onDelete={onDelete} />
      </View>
      {children}
    </View>
  );
}

function CardActions({ onEdit, onDelete }: { onEdit(): void; onDelete(): void }) {
  const colors = useTheme();
  return (
    <View style={styles.actions}>
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Edit item"
        hitSlop={6}
        style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}
      >
        <Ionicons name="create-outline" size={15} color={colors.textSecondary} />
      </Pressable>
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="Remove item"
        hitSlop={6}
        style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}
      >
        <Ionicons name="trash-outline" size={15} color={colors.danger} />
      </Pressable>
    </View>
  );
}

/** Compact tag chip (tech stack / collaborators) — scholarship-card chip scale. */
function TagChip({ label }: { label: string }) {
  const colors = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.tagText, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function UrlRow({ url }: { url: string }) {
  const colors = useTheme();
  return (
    <View style={styles.urlRow}>
      <Ionicons name="link-outline" size={11} color={colors.primary} />
      <Text style={[styles.url, { color: colors.primary }]} numberOfLines={1}>
        {url}
      </Text>
    </View>
  );
}

export function ProjectCard({
  item,
  onEdit,
  onDelete,
}: {
  item: PortfolioProjectItem;
  onEdit(): void;
  onDelete(): void;
}) {
  const range = [formatDate(item.startedOn), formatDate(item.completedOn)]
    .filter(Boolean)
    .join(' → ');

  return (
    <CardShell
      kind="project"
      title={item.title}
      meta={range || null}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      {item.description ? (
        <ThemedText themeColor="textSecondary" style={styles.body} numberOfLines={2}>
          {item.description}
        </ThemedText>
      ) : null}
      {item.techStack.length > 0 && (
        <View style={styles.tagRow}>
          {item.techStack.map((tech, idx) => (
            <TagChip key={`${tech}-${idx}`} label={tech} />
          ))}
        </View>
      )}
      {item.url && <UrlRow url={item.url} />}
    </CardShell>
  );
}

export function CertificateCard({
  item,
  onEdit,
  onDelete,
}: {
  item: PortfolioCertificateItem;
  onEdit(): void;
  onDelete(): void;
}) {
  return (
    <CardShell
      kind="certificate"
      title={item.title}
      meta={[item.issuer, formatDate(item.issuedOn)].filter(Boolean).join(' · ') || null}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      {item.fileUrl && <UrlRow url={item.fileUrl} />}
    </CardShell>
  );
}

export function AchievementCard({
  item,
  onEdit,
  onDelete,
}: {
  item: PortfolioAchievementItem;
  onEdit(): void;
  onDelete(): void;
}) {
  return (
    <CardShell
      kind="achievement"
      title={item.title}
      meta={formatDate(item.achievedOn)}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      {item.description ? (
        <ThemedText themeColor="textSecondary" style={styles.body} numberOfLines={2}>
          {item.description}
        </ThemedText>
      ) : null}
    </CardShell>
  );
}

export function ResearchCard({
  item,
  onEdit,
  onDelete,
}: {
  item: PortfolioResearchItem;
  onEdit(): void;
  onDelete(): void;
}) {
  const published = formatDate(item.publishedOn);
  return (
    <CardShell
      kind="research"
      title={item.title}
      meta={[published ? `Published ${published}` : null, item.role].filter(Boolean).join(' · ') || null}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      {item.abstract ? (
        <ThemedText themeColor="textSecondary" style={styles.body} numberOfLines={3}>
          {item.abstract}
        </ThemedText>
      ) : null}
      {item.collaborators.length > 0 && (
        <View style={styles.tagRow}>
          {item.collaborators.map((c, idx) => (
            <TagChip key={`${c}-${idx}`} label={c} />
          ))}
        </View>
      )}
      {item.url && <UrlRow url={item.url} />}
    </CardShell>
  );
}

export function ResumeCard({
  item,
  onEdit,
  onDelete,
}: {
  item: PortfolioResumeItem;
  onEdit(): void;
  onDelete(): void;
}) {
  return (
    <CardShell
      kind="resume"
      title={item.isPrimary ? 'Primary resume' : 'Resume'}
      meta={item.isPrimary ? 'Shared with applications' : null}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <UrlRow url={item.fileUrl} />
    </CardShell>
  );
}

export function PortfolioLinkCard({
  item,
  onEdit,
  onDelete,
}: {
  item: PortfolioLinkItem;
  onEdit(): void;
  onDelete(): void;
}) {
  return (
    <CardShell
      kind="link"
      title={item.label}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <UrlRow url={item.url} />
    </CardShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three - 4,
    gap: Spacing.two - 2,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + 2,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  meta: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  body: {
    fontSize: 11,
    lineHeight: 15,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  tag: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: 120,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 13,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  url: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
    flexShrink: 1,
  },
});
