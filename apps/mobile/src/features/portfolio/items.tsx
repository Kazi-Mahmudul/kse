import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CERTIFICATE_TYPE_LABELS,
  EDUCATION_BOARD_LABELS,
  EDUCATION_LEVEL_LABELS,
  POSTGRAD_DEGREE_LABELS,
  PROJECT_TYPE_LABELS,
  STUDY_GROUP_LABELS,
  UNDERGRAD_DEGREE_LABELS,
} from '@kse/shared';
import type {
  CertificateType,
  EducationBoard,
  PostgradDegreeType,
  ProjectType,
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
import { FontFamilies, Spacing, type TintKey } from '@/constants/theme';
import { openPortfolioFile } from '@/features/portfolio/queries';
import { isStoragePath } from '@/features/portfolio/service';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { formatDate } from '@/lib/dates';
import type { IconName } from '@/types/icon';

/**
 * Portfolio item cards — the app-wide card language (tinted hero strip
 * with a large kind icon, soft body surface, footer actions). The title
 * is its own Pressable that opens the detail sheet; Edit / Delete /
 * optional View live as siblings in the footer so RNW never sees nested
 * buttons (see internship-card.tsx).
 *
 * The hero strip and tag chips use the kind's pastel tint pair so each
 * section reads at a glance even when the list is long.
 */

interface CardSpec {
  icon: IconName;
  tint: TintKey;
  /** Friendly noun shown in the hero kicker line. */
  noun: string;
}

const SPECS: Record<PortfolioKind, CardSpec> = {
  education: { icon: 'school-outline', tint: 'teal', noun: 'Education' },
  project: { icon: 'folder-open-outline', tint: 'indigo', noun: 'Project' },
  certificate: { icon: 'shield-checkmark-outline', tint: 'cyan', noun: 'Certificate' },
  achievement: { icon: 'trophy-outline', tint: 'amber', noun: 'Achievement' },
  research: { icon: 'flask-outline', tint: 'emerald', noun: 'Research' },
  resume: { icon: 'document-text-outline', tint: 'purple', noun: 'Resume' },
  link: { icon: 'link-outline', tint: 'sky', noun: 'Link' },
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
  onOpen,
  children,
}: {
  kind: PortfolioKind;
  title: string;
  meta?: string | null;
  onEdit(): void;
  onDelete(): void;
  /** Present when the item has an attached file/link worth opening. */
  onView?(): void;
  /** Opens the full-detail bottom sheet for this card. */
  onOpen?(): void;
  children?: React.ReactNode;
}) {
  const colors = useTheme();
  const tints = useTints();
  const { icon, tint, noun } = SPECS[kind];
  const palette = tints[tint];
  // Soft danger tint for the Remove button — reuses the fuchsia pair so
  // it's already calibrated for light AND dark surfaces.
  const dangerSoft = tints.fuchsia;

  return (
    <View
      style={[
        styles.card,
        {
          // surfaceMuted (#F8FAFC light, #1A1B1E dark) keeps the card
          // visually distinct from the screen — on dark mode the screen
          // bg is pure black, so the card needs a slightly lifted surface
          // to remain readable.
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
          // RNW requires boxShadow string format — synthesise a soft
          // shadow tinted with the theme's shadow color.
          boxShadow: `0px 4px 16px ${colors.shadow}`,
        },
      ]}
    >
      {/* Hero strip: tinted background, large kind icon, kicker + title.
       * The whole strip is a single Pressable so any tap on it (icon,
       * kicker, or title) opens the detail sheet. */}
      <Pressable
        onPress={onOpen}
        disabled={!onOpen}
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={onOpen ? `Open ${title} details` : undefined}
        style={({ pressed }) => [
          styles.hero,
          { backgroundColor: palette.bg, borderBottomColor: palette.border },
          pressed && onOpen && styles.pressed,
        ]}
      >
        <View style={[styles.heroIconWrap, { backgroundColor: palette.bg }]}>
          <Ionicons name={icon} size={28} color={palette.fg} />
        </View>
        <View style={styles.heroText}>
          <Text
            style={[styles.heroKicker, { color: palette.fg }]}
            numberOfLines={1}
          >
            {noun.toUpperCase()}
          </Text>
          <Text
            style={[styles.heroTitle, { color: colors.heading }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {meta ? (
            <Text
              style={[styles.heroMeta, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {meta}
            </Text>
          ) : null}
        </View>
        {onOpen ? (
          <View style={styles.heroChevron}>
            <Ionicons name="chevron-forward" size={18} color={palette.fg} />
          </View>
        ) : null}
      </Pressable>

      {/* Body: optional children (description, tags, links) */}
      {children ? <View style={styles.body}>{children}</View> : null}

      {/* Footer action row */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {onView ? (
          <Pressable
            onPress={onView}
            accessibilityRole="button"
            accessibilityLabel="View attached file"
            style={({ pressed }) => [
              styles.footerAction,
              { backgroundColor: colors.backgroundElement },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="eye-outline" size={14} color={colors.text} />
            <Text style={[styles.footerActionLabel, { color: colors.text }]}>View</Text>
          </Pressable>
        ) : (
          <View style={styles.footerActionSpacer} />
        )}
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel="Edit item"
          style={({ pressed }) => [
            styles.footerAction,
            { backgroundColor: colors.backgroundElement },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="create-outline" size={14} color={colors.text} />
          <Text style={[styles.footerActionLabel, { color: colors.text }]}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Remove item"
          style={({ pressed }) => [
            styles.footerAction,
            { backgroundColor: dangerSoft.bg, borderWidth: 1, borderColor: dangerSoft.border },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="trash-outline" size={14} color={colors.danger} />
          <Text style={[styles.footerActionLabel, { color: colors.danger }]}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Compact tag chip (tech stack / collaborators) — pastel pair from the
 *  card's tint family so the chips blend with the hero strip. */
function TagChip({
  label,
  tint = 'slate',
}: {
  label: string;
  tint?: TintKey;
}) {
  const colors = useTheme();
  const tints = useTints();
  const palette = tints[tint];
  return (
    <View style={[styles.tag, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.tagText, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function UrlRow({ url, label }: { url: string; label?: string }) {
  const colors = useTheme();
  return (
    <View style={styles.urlRow}>
      <Ionicons name="link-outline" size={12} color={colors.primary} />
      <Text style={[styles.url, { color: colors.primary }]} numberOfLines={1}>
        {label ? `${label} · ${url}` : url}
      </Text>
    </View>
  );
}

/** Theme-aware body copy — uses textSecondary so it reads on light AND
 *  dark surfaces (replaces the old hardcoded slate-600 which vanished on
 *  the black background). */
function BodyText({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: any;
  numberOfLines?: number;
}) {
  const colors = useTheme();
  return (
    <Text
      style={[styles.bodyText, { color: colors.textSecondary }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

/** Theme-aware body meta — stronger contrast than BodyText (bodyStrong)
 *  but still flips correctly between light and dark schemes. */
function BodyMeta({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: any;
  numberOfLines?: number;
}) {
  const colors = useTheme();
  return (
    <Text
      style={[styles.bodyMeta, { color: colors.bodyStrong }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

export function ProjectCard({
  item,
  onEdit,
  onDelete,
  onOpen,
}: {
  item: PortfolioProjectItem;
  onEdit(): void;
  onDelete(): void;
  onOpen?(): void;
}) {
  const range = [formatDate(item.startedOn), formatDate(item.completedOn)]
    .filter(Boolean)
    .join(' → ');
  const typeLabel = item.projectType
    ? PROJECT_TYPE_LABELS[item.projectType as ProjectType]
    : null;
  // Spec display line: "Project Type · Institution/Organization" (dates stay
  // as the fallback meta when neither is filled in).
  const meta =
    [typeLabel, item.organization].filter(Boolean).join(' · ') || range || null;
  const attachment = item.coverUrl ?? item.documentUrl;

  return (
    <CardShell
      kind="project"
      title={item.title}
      meta={meta}
      onEdit={onEdit}
      onDelete={onDelete}
      onView={attachment ? () => void openPortfolioFile(attachment) : undefined}
      onOpen={onOpen}
    >
      {item.description ? (
        <BodyText numberOfLines={3}>{item.description}</BodyText>
      ) : null}
      {(item.role || range) && (
        <BodyMeta numberOfLines={1}>
          {[item.role ? `Role: ${item.role}` : null, range || null]
            .filter(Boolean)
            .join('  ·  ')}
        </BodyMeta>
      )}
      {(item.isTeam || item.courseName || item.techStack.length > 0) && (
        <View style={styles.tagRow}>
          {item.isTeam ? (
            <TagChip
              tint="indigo"
              label={
                item.teamMembers.length > 0
                  ? `Team · ${item.teamMembers.length}`
                  : 'Team project'
              }
            />
          ) : null}
          {item.courseName ? <TagChip tint="slate" label={item.courseName} /> : null}
          {item.techStack.map((tech, idx) => (
            <TagChip key={`${tech}-${idx}`} tint="indigo" label={tech} />
          ))}
          {item.teamMembers.map((member, idx) => (
            <TagChip key={`member-${member}-${idx}`} tint="slate" label={member} />
          ))}
        </View>
      )}
      {(item.url || item.repoUrl || item.demoUrl) ? (
        <View style={styles.linkStack}>
          {item.url ? <UrlRow url={item.url} label="Website" /> : null}
          {item.repoUrl ? <UrlRow url={item.repoUrl} label="GitHub" /> : null}
          {item.demoUrl ? <UrlRow url={item.demoUrl} label="Demo" /> : null}
        </View>
      ) : null}
    </CardShell>
  );
}

// ── Education ────────────────────────────────────────────────────────────────

/** Degree-type label across both pools ("BSc", "MSc"…); null when unset/other. */
export function degreeTypeLabel(item: PortfolioEducationItem): string | null {
  if (!item.degreeType) return null;
  const label =
    UNDERGRAD_DEGREE_LABELS[item.degreeType as UndergradDegreeType] ??
    POSTGRAD_DEGREE_LABELS[item.degreeType as PostgradDegreeType];
  return label && label !== 'Other' ? label : null;
}

/** Human title for a qualification, e.g. "BSc in Computer Science & Engineering",
 *  "HSC (Science)", "MPhil — Machine Learning". */
export function educationTitle(item: PortfolioEducationItem): string {
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
export function educationYears(item: PortfolioEducationItem): string | null {
  const { startYear, passingYear, isOngoing } = item;
  if (startYear != null && passingYear != null) {
    return `${startYear} – ${passingYear}${isOngoing ? ' (expected)' : ''}`;
  }
  if (startYear != null) return `${startYear} – ${isOngoing ? 'Present' : ''}`.trim();
  return passingYear != null ? String(passingYear) : null;
}

/** "GPA 5.00", "CGPA 3.76", "85%", "First Class", or a research status. */
export function educationResult(item: PortfolioEducationItem): string | null {
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
  onOpen,
}: {
  item: PortfolioEducationItem;
  onEdit(): void;
  onDelete(): void;
  onOpen?(): void;
}) {
  const board = item.board
    ? EDUCATION_BOARD_LABELS[item.board as EducationBoard] ?? item.board
    : null;
  const years = educationYears(item);
  const result = educationResult(item);
  const meta = [item.institution, item.campus, board].filter(Boolean).join(' · ') || null;

  return (
    <CardShell
      kind="education"
      title={educationTitle(item)}
      meta={meta}
      onEdit={onEdit}
      onDelete={onDelete}
      onView={item.documentUrl ? () => void openPortfolioFile(item.documentUrl) : undefined}
      onOpen={onOpen}
    >
      {(years || result) && (
        <BodyMeta numberOfLines={1}>
          {[years, result].filter(Boolean).join('  ·  ')}
        </BodyMeta>
      )}
      {(item.level === 'mphil' || item.level === 'phd') && item.thesisTitle ? (
        <BodyText numberOfLines={3}>
          Thesis: {item.thesisTitle}
          {item.supervisor ? ` · Supervisor: ${item.supervisor}` : ''}
        </BodyText>
      ) : null}
      {(item.rollNumber || item.registrationNumber) && (
        <View style={styles.tagRow}>
          {item.rollNumber ? <TagChip tint="teal" label={`Roll ${item.rollNumber}`} /> : null}
          {item.registrationNumber ? (
            <TagChip tint="teal" label={`Reg ${item.registrationNumber}`} />
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
  onOpen,
}: {
  item: PortfolioCertificateItem;
  onEdit(): void;
  onDelete(): void;
  onOpen?(): void;
}) {
  const typeLabel = item.certificateType
    ? CERTIFICATE_TYPE_LABELS[item.certificateType as CertificateType] ?? null
    : null;
  const meta = [
    item.issuer,
    item.issuedOn ? formatDate(item.issuedOn) : null,
    item.expiresOn ? `Expires ${formatDate(item.expiresOn)}` : null,
  ]
    .filter(Boolean)
    .join(' · ') || null;

  return (
    <CardShell
      kind="certificate"
      title={item.title}
      meta={meta}
      onEdit={onEdit}
      onDelete={onDelete}
      onView={item.fileUrl ? () => void openPortfolioFile(item.fileUrl) : undefined}
      onOpen={onOpen}
    >
      {(typeLabel || item.programName || item.credentialId) && (
        <View style={styles.tagRow}>
          {typeLabel ? <TagChip tint="cyan" label={typeLabel} /> : null}
          {item.programName ? <TagChip tint="cyan" label={item.programName} /> : null}
          {item.credentialId ? (
            <TagChip tint="cyan" label={`ID ${item.credentialId}`} />
          ) : null}
        </View>
      )}
      {item.description ? (
        <BodyText numberOfLines={3}>{item.description}</BodyText>
      ) : null}
      {(item.credentialUrl || item.verificationUrl) ? (
        <View style={styles.linkStack}>
          {item.credentialUrl ? <UrlRow url={item.credentialUrl} label="Credential" /> : null}
          {item.verificationUrl ? <UrlRow url={item.verificationUrl} label="Verify" /> : null}
        </View>
      ) : null}
    </CardShell>
  );
}

export function AchievementCard({
  item,
  onEdit,
  onDelete,
  onOpen,
}: {
  item: PortfolioAchievementItem;
  onEdit(): void;
  onDelete(): void;
  onOpen?(): void;
}) {
  return (
    <CardShell
      kind="achievement"
      title={item.title}
      meta={item.achievedOn ? formatDate(item.achievedOn) : null}
      onEdit={onEdit}
      onDelete={onDelete}
      onOpen={onOpen}
    >
      {item.description ? (
        <BodyText numberOfLines={3}>{item.description}</BodyText>
      ) : null}
    </CardShell>
  );
}

export function ResearchCard({
  item,
  onEdit,
  onDelete,
  onOpen,
}: {
  item: PortfolioResearchItem;
  onEdit(): void;
  onDelete(): void;
  onOpen?(): void;
}) {
  const published = formatDate(item.publishedOn);
  return (
    <CardShell
      kind="research"
      title={item.title}
      meta={[published ? `Published ${published}` : null, item.role]
        .filter(Boolean)
        .join(' · ') || null}
      onEdit={onEdit}
      onDelete={onDelete}
      onOpen={onOpen}
    >
      {item.abstract ? (
        <BodyText numberOfLines={4}>{item.abstract}</BodyText>
      ) : null}
      {item.collaborators.length > 0 && (
        <View style={styles.tagRow}>
          {item.collaborators.map((c, idx) => (
            <TagChip key={`${c}-${idx}`} tint="emerald" label={c} />
          ))}
        </View>
      )}
      {item.url ? (
        <View style={styles.linkStack}>
          <UrlRow url={item.url} label="Paper" />
        </View>
      ) : null}
    </CardShell>
  );
}

export function ResumeCard({
  item,
  onEdit,
  onDelete,
  onOpen,
}: {
  item: PortfolioResumeItem;
  onEdit(): void;
  onDelete(): void;
  onOpen?(): void;
}) {
  const uploaded = isStoragePath(item.fileUrl);
  const meta = [
    item.isPrimary ? 'Primary' : 'Secondary',
    `Updated ${formatDate(item.updatedAt)}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <CardShell
      kind="resume"
      title={item.fileName ?? (uploaded ? 'Resume' : 'Resume link')}
      meta={meta}
      onEdit={onEdit}
      onDelete={onDelete}
      onView={() => void openPortfolioFile(item.fileUrl)}
      onOpen={onOpen}
    >
      {uploaded ? (
        <BodyText numberOfLines={2}>
          PDF · stored privately in your portfolio
        </BodyText>
      ) : (
        <View style={styles.linkStack}>
          <UrlRow url={item.fileUrl} />
        </View>
      )}
    </CardShell>
  );
}

export function PortfolioLinkCard({
  item,
  onEdit,
  onDelete,
  onOpen,
}: {
  item: PortfolioLinkItem;
  onEdit(): void;
  onDelete(): void;
  onOpen?(): void;
}) {
  return (
    <CardShell
      kind="link"
      title={item.label}
      meta={item.url.replace(/^https?:\/\//, '').split('/')[0] ?? null}
      onEdit={onEdit}
      onDelete={onDelete}
      onView={() => void openPortfolioFile(item.url)}
      onOpen={onOpen}
    >
      <View style={styles.linkStack}>
        <UrlRow url={item.url} />
      </View>
    </CardShell>
  );
}

const styles = StyleSheet.create({
  // Card chrome — soft shadow, generous radius, no harsh borders.
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 0,
  },
  pressed: {
    opacity: 0.85,
  },

  // Hero strip — tinted background, big icon, kicker + title + chevron.
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three + 2,
    paddingHorizontal: Spacing.three + 2,
    borderBottomWidth: 1,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  heroKicker: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  heroTitle: {
    fontFamily: FontFamilies.bold,
    fontSize: 16,
    lineHeight: 21,
  },
  heroMeta: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  heroChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Body region — descriptions, tags, links.
  body: {
    paddingHorizontal: Spacing.three + 2,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bodyMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },

  // Footer action row — pill buttons, even spacing.
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.three + 2,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
  },
  footerAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two - 2,
    borderRadius: 10,
  },
  footerActionSpacer: {
    flex: 1,
  },
  footerActionLabel: {
    fontSize: 12,
    fontFamily: FontFamilies.semiBold,
  },

  // Tag chips — pastel pair with thin border for definition.
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    maxWidth: 160,
  },
  tagText: {
    fontSize: 11,
    fontFamily: FontFamilies.semiBold,
    lineHeight: 14,
  },

  // Link stack — separate from body to add visual breathing room.
  linkStack: {
    gap: 6,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  url: {
    fontSize: 12,
    fontFamily: FontFamilies.medium,
    lineHeight: 16,
    flexShrink: 1,
  },
});
