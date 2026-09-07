import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type {
  PortfolioAchievementItem,
  PortfolioCertificateItem,
  PortfolioLinkItem,
  PortfolioProjectItem,
  PortfolioResearchItem,
  PortfolioResumeItem,
} from '@kse/types';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { formatDate } from '@/lib/dates';

interface EditAction {
  edit(): void;
  remove(): void;
}

function RowActions({ edit, remove }: EditAction) {
  const colors = useTheme();
  return (
    <View style={styles.rowActions}>
      <Text
        accessibilityRole="button"
        onPress={edit}
        style={[styles.actionLabel, { color: colors.primary }]}
      >
        Edit
      </Text>
      <Text
        accessibilityRole="button"
        onPress={remove}
        style={[styles.actionLabel, { color: colors.danger }]}
      >
        Remove
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
  const colors = useTheme();
  return (
    <Card>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold">{item.title}</ThemedText>
        <RowActions edit={onEdit} remove={onDelete} />
      </View>
      {item.description && (
        <ThemedText type="small" themeColor="textSecondary">
          {item.description}
        </ThemedText>
      )}
      {(item.startedOn || item.completedOn) && (
        <ThemedText type="small" themeColor="textSecondary">
          {[formatDate(item.startedOn), formatDate(item.completedOn)]
            .filter(Boolean)
            .join(' → ')}
        </ThemedText>
      )}
      {item.techStack.length > 0 && (
        <View style={styles.chipRow}>
          {item.techStack.map((tech, idx) => (
            <Chip key={`${tech}-${idx}`} label={tech} />
          ))}
        </View>
      )}
      {item.url && (
        <Text style={[styles.metaUrl, { color: colors.primary }]} numberOfLines={1}>
          {item.url}
        </Text>
      )}
    </Card>
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
  const colors = useTheme();
  return (
    <Card>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold">{item.title}</ThemedText>
        <RowActions edit={onEdit} remove={onDelete} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {[item.issuer, formatDate(item.issuedOn)].filter(Boolean).join(' · ')}
      </ThemedText>
      {item.fileUrl && (
        <Text style={[styles.metaUrl, { color: colors.primary }]} numberOfLines={1}>
          {item.fileUrl}
        </Text>
      )}
    </Card>
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
    <Card>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold">{item.title}</ThemedText>
        <RowActions edit={onEdit} remove={onDelete} />
      </View>
      {item.achievedOn && (
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(item.achievedOn)}
        </ThemedText>
      )}
      {item.description && (
        <ThemedText type="small" themeColor="textSecondary">
          {item.description}
        </ThemedText>
      )}
    </Card>
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
  const colors = useTheme();
  return (
    <Card>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold">{item.title}</ThemedText>
        <RowActions edit={onEdit} remove={onDelete} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Published {formatDate(item.publishedOn) || '—'}
        {item.role ? ` · ${item.role}` : ''}
      </ThemedText>
      {item.abstract && (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
          {item.abstract}
        </ThemedText>
      )}
      {item.collaborators.length > 0 && (
        <View style={styles.chipRow}>
          {item.collaborators.map((c, idx) => (
            <Chip key={`${c}-${idx}`} label={c} />
          ))}
        </View>
      )}
      {item.url && (
        <Text style={[styles.metaUrl, { color: colors.primary }]} numberOfLines={1}>
          {item.url}
        </Text>
      )}
    </Card>
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
  const colors = useTheme();
  return (
    <Card>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold">
          {item.isPrimary ? 'Primary resume' : 'Resume'}
        </ThemedText>
        <RowActions edit={onEdit} remove={onDelete} />
      </View>
      <Text style={[styles.metaUrl, { color: colors.primary }]} numberOfLines={1}>
        {item.fileUrl}
      </Text>
    </Card>
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
  const colors = useTheme();
  return (
    <Card>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold">{item.label}</ThemedText>
        <RowActions edit={onEdit} remove={onDelete} />
      </View>
      <Text style={[styles.metaUrl, { color: colors.primary }]} numberOfLines={1}>
        {item.url}
      </Text>
    </Card>
  );
}

// re-export icon import for tree-shake safety; keep UI imports stable.
export const _icon = Ionicons;

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  metaUrl: {
    fontSize: 13,
    marginTop: Spacing.one,
  },
});
