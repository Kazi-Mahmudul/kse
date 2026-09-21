import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CERTIFICATE_TYPE_LABELS,
  EDUCATION_BOARD_LABELS,
  EDUCATION_LEVEL_LABELS,
  POSTGRAD_DEGREE_LABELS,
  STUDY_GROUP_LABELS,
  UNDERGRAD_DEGREE_LABELS,
} from '@kse/shared';
import type {
  CertificateType,
  EducationBoard,
  PostgradDegreeType,
  StudyGroup,
  UndergradDegreeType,
  PortfolioAchievementItem,
  PortfolioCertificateItem,
  PortfolioEducationItem,
  PortfolioLinkItem,
  PortfolioProjectItem,
  PortfolioResearchItem,
  PortfolioResumeItem,
} from '@kse/types';

import { ThemedText } from '@/components/themed-text';
import { Spacing, type TintKey } from '@/constants/theme';
import { openPortfolioFile } from '@/features/portfolio/queries';
import { isStoragePath } from '@/features/portfolio/service';
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
  education: { icon: 'school-outline', tint: 'teal' },
  project: { icon: 'folder-open-outline', tint: 'indigo' },
  certificate: { icon: 'shield-checkmark-outline', tint: 'cyan' },
  achievement: { icon: 'trophy-outline', tint: 'amber' },
  research: { icon: 'flask-outline', tint: 'emerald' },
  resume: { icon: 'document-text-outline', tint: 'purple' },
  link: { icon: 'link-outline', tint: 'sky' },
};

type PortfolioKind =
  | 'education'
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
  onView,
  children,
}: {
  kind: PortfolioKind;
  title: string;
  meta?: string | null;
  onEdit(): void;
  onDelete(): void;
  /** Present when the item has an attached file/link worth opening. */
  onView?(): void;
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

        <CardActions onEdit={onEdit} onDelete={onDelete} onView={onView} />
      </View>
      {children}
    </View>
  );
}

function CardActions({
  onEdit,
  onDelete,
  onView,
}: {
  onEdit(): void;
  onDelete(): void;
  onView?(): void;
}) {
  const colors = useTheme();
  return (
    <View style={styles.actions}>
      {onView ? (
        <Pressable
          onPress={onView}
          accessibilityRole="button"
          accessibilityLabel="View attached file"
          hitSlop={6}
          style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}
        >
          <Ionicons name="eye-outline" size={15} color={colors.textSecondary} />
        </Pressable>
      ) : null}
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

// ── Education ────────────────────────────────────────────────────────────────

/** Degree-type label across both pools ("BSc", "MSc"…); null when unset/other. */
function degreeTypeLabel(item: PortfolioEducationItem): string | null {
  if (!item.degreeType) return null;
  const label =
    UNDERGRAD_DEGREE_LABELS[item.degreeType as UndergradDegreeType] ??
    POSTGRAD_DEGREE_LABELS[item.degreeType as PostgradDegreeType];
  return label && label !== 'Other' ? label : null;
}

/** Human title for a qualification, e.g. "BSc in Computer Science & Engineering",
 *  "HSC (Science)", "MPhil — Machine Learning". */
function educationTitle(item: PortfolioEducationItem): string {
  const levelLabel = EDUCATION_LEVEL_LABELS[item.level];
  switch (item.level) {
    case 'ssc':
    case 'hsc': {
      const group =
        item.studyGroup && item.studyGroup !== 'other'
          ? STUDY_GROUP_LABELS[item.studyGroup as StudyGroup]
          : null;
      return group ? `${levelLabel} (${group})` : levelLabel;
    }
    case 'diploma':
      return item.programName ?? 'Diploma';
    case 'bachelor':
    case 'masters': {
      const degree = degreeTypeLabel(item);
      if (!degree) return item.programName ?? levelLabel;
      return item.programName ? `${degree} in ${item.programName}` : degree;
    }
    case 'mphil':
    case 'phd':
      return item.researchArea ? `${levelLabel} — ${item.researchArea}` : levelLabel;
    default:
      return item.programName ?? levelLabel;
  }
}

/** "2025 – Present", "2025 – 2029 (expected)", "2024"… */
function educationYears(item: PortfolioEducationItem): string | null {
  const { startYear, passingYear, isOngoing } = item;
  if (startYear != null && passingYear != null) {
    return `${startYear} – ${passingYear}${isOngoing ? ' (expected)' : ''}`;
  }
  if (startYear != null) return `${startYear} – ${isOngoing ? 'Present' : ''}`.trim();
  return passingYear != null ? String(passingYear) : null;
}

/** "GPA 5.00", "CGPA 3.76", "85%", "First Class", or a research status. */
function educationResult(item: PortfolioEducationItem): string | null {
  if (!item.result) return null;
  switch (item.resultType) {
    case 'gpa':
      return `GPA ${item.result}`;
    case 'cgpa':
      return `CGPA ${item.result}`;
    case 'percentage':
      return `${item.result}%`;
    default:
      return item.result;
  }
}

export function EducationCard({
  item,
  onEdit,
  onDelete,
}: {
  item: PortfolioEducationItem;
  onEdit(): void;
  onDelete(): void;
}) {
  const board = item.board
    ? EDUCATION_BOARD_LABELS[item.board as EducationBoard] ?? item.board
    : null;
  const years = educationYears(item);
  const result = educationResult(item);

  return (
    <CardShell
      kind="education"
      title={educationTitle(item)}
      meta={[item.institution, item.campus, board].filter(Boolean).join(' · ') || null}
      onEdit={onEdit}
      onDelete={onDelete}
      onView={item.documentUrl ? () => void openPortfolioFile(item.documentUrl) : undefined}
    >
      {(years || result) && (
        <ThemedText themeColor="bodyStrong" style={styles.resultRow} numberOfLines={1}>
          {[years, result].filter(Boolean).join('  ·  ')}
        </ThemedText>
      )}
      {(item.level === 'mphil' || item.level === 'phd') && item.thesisTitle ? (
        <ThemedText themeColor="textSecondary" style={styles.body} numberOfLines={2}>
          Thesis: {item.thesisTitle}
          {item.supervisor ? ` · Supervisor: ${item.supervisor}` : ''}
        </ThemedText>
      ) : null}
      {(item.rollNumber || item.registrationNumber) && (
        <View style={styles.tagRow}>
          {item.rollNumber ? <TagChip label={`Roll ${item.rollNumber}`} /> : null}
          {item.registrationNumber ? (
            <TagChip label={`Reg ${item.registrationNumber}`} />
          ) : null}
        </View>
      )}
    </CardShell>
  );
}

// ── Certificates ─────────────────────────────────────────────────────────────

export function CertificateCard({
  item,
  onEdit,
  onDelete,
}: {
  item: PortfolioCertificateItem;
  onEdit(): void;
  onDelete(): void;
}) {
  const typeLabel = item.certificateType
    ? CERTIFICATE_TYPE_LABELS[item.certificateType as CertificateType] ?? null
    : null;
  return (
    <CardShell
      kind="certificate"
      title={item.title}
      meta={[
        item.issuer,
        item.issuedOn ? formatDate(item.issuedOn) : null,
        item.expiresOn ? `Expires ${formatDate(item.expiresOn)}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || null}
      onEdit={onEdit}
      onDelete={onDelete}
      onView={item.fileUrl ? () => void openPortfolioFile(item.fileUrl) : undefined}
    >
      {(typeLabel || item.programName || item.credentialId) && (
        <View style={styles.tagRow}>
          {typeLabel ? <TagChip label={typeLabel} /> : null}
          {item.programName ? <TagChip label={item.programName} /> : null}
          {item.credentialId ? <TagChip label={`ID ${item.credentialId}`} /> : null}
        </View>
      )}
      {item.description ? (
        <ThemedText themeColor="textSecondary" style={styles.body} numberOfLines={2}>
          {item.description}
        </ThemedText>
      ) : null}
      {item.credentialUrl && <UrlRow url={item.credentialUrl} />}
      {item.verificationUrl && <UrlRow url={item.verificationUrl} />}
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
      meta={item.achievedOn ? formatDate(item.achievedOn) : null}
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
  const uploaded = isStoragePath(item.fileUrl);
  return (
    <CardShell
      kind="resume"
      title={item.fileName ?? (uploaded ? 'Resume' : 'Resume link')}
      meta={[
        item.isPrimary ? 'Primary · shared with applications' : null,
        `Updated ${formatDate(item.updatedAt)}`,
      ]
        .filter(Boolean)
        .join(' · ') || null}
      onEdit={onEdit}
      onDelete={onDelete}
      onView={() => void openPortfolioFile(item.fileUrl)}
    >
      {uploaded ? (
        <ThemedText themeColor="textSecondary" style={styles.body} numberOfLines={1}>
          PDF · stored privately in your portfolio
        </ThemedText>
      ) : (
        <UrlRow url={item.fileUrl} />
      )}
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
  resultRow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
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
