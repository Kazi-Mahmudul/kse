import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/primary-button';
import {
  CERTIFICATE_TYPE_LABELS,
  EDUCATION_BOARD_LABELS,
  EDUCATION_LEVEL_LABELS,
  POSTGRAD_DEGREE_LABELS,
  PROJECT_TYPE_LABELS,
  STUDY_GROUP_LABELS,
  UNDERGRAD_DEGREE_LABELS,
} from '@kse/shared';
import { FontFamilies, Spacing, type TintKey } from '@/constants/theme';
import {
  type PortfolioAchievementItem,
  type PortfolioCertificateItem,
  type PortfolioEducationItem,
  type PortfolioLinkItem,
  type PortfolioProjectItem,
  type PortfolioResearchItem,
  type PortfolioResumeItem,
} from '@kse/types';

import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';
import { formatDate } from '@/lib/dates';
import { openPortfolioFile } from '@/features/portfolio/queries';
import type { IconName } from '@/types/icon';

import {
  degreeTypeLabel,
  educationResult,
  educationTitle,
  educationYears,
} from './items';

/**
 * Detail-sheet payload — discriminated by `kind` so each renderer can pull
 * the right strongly-typed item. The list screens track the open state in
 * a single piece of parent state and pass the active row here.
 */
export type PortfolioDetailItem =
  | { kind: 'education'; item: PortfolioEducationItem }
  | { kind: 'project'; item: PortfolioProjectItem }
  | { kind: 'certificate'; item: PortfolioCertificateItem }
  | { kind: 'achievement'; item: PortfolioAchievementItem }
  | { kind: 'research'; item: PortfolioResearchItem }
  | { kind: 'resume'; item: PortfolioResumeItem }
  | { kind: 'link'; item: PortfolioLinkItem };

const KIND_SPEC: Record<
  PortfolioDetailItem['kind'],
  { icon: IconName; tint: TintKey; label: string }
> = {
  education: { icon: 'school-outline', tint: 'teal', label: 'Education' },
  project: { icon: 'folder-open-outline', tint: 'indigo', label: 'Project' },
  certificate: { icon: 'shield-checkmark-outline', tint: 'cyan', label: 'Certificate' },
  achievement: { icon: 'trophy-outline', tint: 'amber', label: 'Achievement' },
  research: { icon: 'flask-outline', tint: 'emerald', label: 'Research' },
  resume: { icon: 'document-text-outline', tint: 'purple', label: 'Resume' },
  link: { icon: 'link-outline', tint: 'sky', label: 'Link' },
};

/**
 * Portfolio detail sheet — opens when the user taps any portfolio card on
 * the hub screen (spec §6/§18). Renders an attractive, scrollable view with
 * the kind-appropriate fields, action buttons for Edit / View file, and a
 * graceful empty state.
 */
export function PortfolioDetailSheet({
  value,
  onClose,
  onEdit,
}: {
  value: PortfolioDetailItem | null;
  onClose(): void;
  onEdit(value: PortfolioDetailItem): void;
}) {
  const colors = useTheme();
  const tints = useTints();
  const insets = useSafeAreaInsets();

  if (!value) return null;

  const spec = KIND_SPEC[value.kind];
  const palette = tints[spec.tint];
  const viewableUrl = firstViewableUrl(value);

  return (
    <Modal
      visible={Boolean(value)}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Same backdrop pattern as the institution picker: plain View + a
       * sibling Pressable behind the sheet so taps inside the sheet never
       * bubble up and close the modal. */}
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <Pressable style={styles.scrimTap} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: palette.bg }]}>
              <Ionicons name={spec.icon} size={22} color={palette.fg} />
            </View>
            <View style={styles.headerText}>
              <ThemedText themeColor="textMuted" type="smallBold" style={styles.kicker}>
                {spec.label.toUpperCase()}
              </ThemedText>
              <ThemedText
                themeColor="heading"
                style={styles.title}
                numberOfLines={3}
              >
                {detailTitle(value)}
              </ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close details"
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: colors.backgroundElement },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {renderFields(value, colors)}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {viewableUrl ? (
              <PrimaryButton
                label="View file"
                variant="outline"
                onPress={() => {
                  void openPortfolioFile(viewableUrl);
                }}
                style={styles.footerButton}
              />
            ) : null}
            <PrimaryButton
              label="Edit"
              onPress={() => {
                onClose();
                onEdit(value);
              }}
              style={styles.footerButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Detail renderer ─────────────────────────────────────────────────────────

function detailTitle(value: PortfolioDetailItem): string {
  switch (value.kind) {
    case 'education':
      return educationTitle(value.item);
    case 'project':
      return value.item.title;
    case 'certificate':
      return value.item.title;
    case 'achievement':
      return value.item.title;
    case 'research':
      return value.item.title;
    case 'resume':
      return value.item.fileName ?? 'Resume';
    case 'link':
      return value.item.label;
  }
}

/** First storage path or external URL we can hand to `openPortfolioFile`. */
function firstViewableUrl(value: PortfolioDetailItem): string | null {
  switch (value.kind) {
    case 'education':
      return value.item.documentUrl;
    case 'project':
      return value.item.coverUrl ?? value.item.documentUrl;
    case 'certificate':
      return value.item.fileUrl;
    case 'achievement':
      return null;
    case 'research':
      return null;
    case 'resume':
      return value.item.fileUrl;
    case 'link':
      return value.item.url;
  }
}

function renderFields(value: PortfolioDetailItem, colors: ReturnType<typeof useTheme>) {
  switch (value.kind) {
    case 'education':
      return renderEducation(value.item, colors);
    case 'project':
      return renderProject(value.item, colors);
    case 'certificate':
      return renderCertificate(value.item, colors);
    case 'achievement':
      return renderAchievement(value.item, colors);
    case 'research':
      return renderResearch(value.item, colors);
    case 'resume':
      return renderResume(value.item, colors);
    case 'link':
      return renderLink(value.item, colors);
  }
}

// ── Per-kind field sets ─────────────────────────────────────────────────────

function renderEducation(item: PortfolioEducationItem, colors: ReturnType<typeof useTheme>) {
  const board = item.board ? EDUCATION_BOARD_LABELS[item.board as keyof typeof EDUCATION_BOARD_LABELS] ?? item.board : null;
  const years = educationYears(item);
  const result = educationResult(item);
  const group = item.studyGroup && item.studyGroup !== 'other'
    ? STUDY_GROUP_LABELS[item.studyGroup as keyof typeof STUDY_GROUP_LABELS]
    : null;
  const degree = degreeTypeLabel(item);
  return (
    <View style={styles.fields}>
      <Field label="Level" value={EDUCATION_LEVEL_LABELS[item.level]} />
      {item.programName ? <Field label="Program" value={item.programName} /> : null}
      {degree ? <Field label="Degree" value={degree} /> : null}
      {item.major ? <Field label="Major" value={item.major} /> : null}
      <Field label="Institution" value={item.institution} />
      {item.campus ? <Field label="Campus" value={item.campus} /> : null}
      {item.district ? <Field label="District" value={item.district} /> : null}
      <Field label="Country" value={item.country} />
      {board ? <Field label="Board" value={board} /> : null}
      {group ? <Field label="Group" value={group} /> : null}
      {years ? <Field label="Duration" value={years} /> : null}
      {result ? <Field label="Result" value={result} /> : null}
      {item.thesisTitle ? <Field label="Thesis" value={item.thesisTitle} /> : null}
      {item.supervisor ? <Field label="Supervisor" value={item.supervisor} /> : null}
      {item.rollNumber ? <Field label="Roll" value={item.rollNumber} /> : null}
      {item.registrationNumber ? <Field label="Registration" value={item.registrationNumber} /> : null}
      <Field label="Added" value={formatDate(item.createdAt)} muted />
    </View>
  );
}

function renderProject(item: PortfolioProjectItem, colors: ReturnType<typeof useTheme>) {
  const typeLabel = item.projectType ? PROJECT_TYPE_LABELS[item.projectType as keyof typeof PROJECT_TYPE_LABELS] ?? null : null;
  const dates = [formatDate(item.startedOn), formatDate(item.completedOn)]
    .filter(Boolean)
    .join(' → ');
  return (
    <View style={styles.fields}>
      {typeLabel ? <Field label="Type" value={typeLabel} /> : null}
      {item.organization ? <Field label="Organization" value={item.organization} /> : null}
      {item.role ? <Field label="Role" value={item.role} /> : null}
      {dates ? <Field label="Duration" value={dates} /> : null}
      {item.description ? <Field label="Summary" value={item.description} /> : null}
      {item.details ? <Field label="Details" value={item.details} /> : null}
      {item.courseName ? <Field label="Course" value={item.courseName} /> : null}
      {item.techStack.length > 0 ? (
        <Field label="Tech stack" value={item.techStack.join(', ')} />
      ) : null}
      {item.teamMembers.length > 0 ? (
        <Field label="Team" value={item.teamMembers.join(', ')} />
      ) : null}
      {item.url ? <Field label="Website" value={item.url} link /> : null}
      {item.repoUrl ? <Field label="GitHub" value={item.repoUrl} link /> : null}
      {item.demoUrl ? <Field label="Demo" value={item.demoUrl} link /> : null}
      <Field label="Added" value={formatDate(item.createdAt)} muted />
    </View>
  );
}

function renderCertificate(item: PortfolioCertificateItem, colors: ReturnType<typeof useTheme>) {
  const typeLabel = item.certificateType
    ? CERTIFICATE_TYPE_LABELS[item.certificateType as keyof typeof CERTIFICATE_TYPE_LABELS] ?? null
    : null;
  return (
    <View style={styles.fields}>
      {item.issuer ? <Field label="Issuer" value={item.issuer} /> : null}
      {typeLabel ? <Field label="Type" value={typeLabel} /> : null}
      {item.programName ? <Field label="Program" value={item.programName} /> : null}
      {item.issuedOn ? <Field label="Issued" value={formatDate(item.issuedOn)} /> : null}
      {item.expiresOn ? (
        <Field label="Expires" value={formatDate(item.expiresOn)} />
      ) : null}
      {item.credentialId ? <Field label="Credential ID" value={item.credentialId} /> : null}
      {item.credentialUrl ? (
        <Field label="Credential URL" value={item.credentialUrl} link />
      ) : null}
      {item.verificationUrl ? (
        <Field label="Verification" value={item.verificationUrl} link />
      ) : null}
      {item.description ? <Field label="Description" value={item.description} /> : null}
      <Field label="Added" value={formatDate(item.createdAt)} muted />
    </View>
  );
}

function renderAchievement(item: PortfolioAchievementItem, _colors: ReturnType<typeof useTheme>) {
  return (
    <View style={styles.fields}>
      {item.achievedOn ? (
        <Field label="Achieved on" value={formatDate(item.achievedOn)} />
      ) : null}
      {item.description ? <Field label="Description" value={item.description} /> : null}
      <Field label="Added" value={formatDate(item.createdAt)} muted />
    </View>
  );
}

function renderResearch(item: PortfolioResearchItem, _colors: ReturnType<typeof useTheme>) {
  return (
    <View style={styles.fields}>
      {item.publishedOn ? (
        <Field label="Published" value={formatDate(item.publishedOn)} />
      ) : null}
      {item.role ? <Field label="Role" value={item.role} /> : null}
      {item.collaborators.length > 0 ? (
        <Field label="Collaborators" value={item.collaborators.join(', ')} />
      ) : null}
      {item.abstract ? <Field label="Abstract" value={item.abstract} /> : null}
      {item.url ? <Field label="Paper / DOI" value={item.url} link /> : null}
      <Field label="Added" value={formatDate(item.createdAt)} muted />
    </View>
  );
}

function renderResume(item: PortfolioResumeItem, colors: ReturnType<typeof useTheme>) {
  return (
    <View style={styles.fields}>
      <Field label="Filename" value={item.fileName ?? 'Resume'} />
      <Field label={item.isPrimary ? 'Status' : 'Tag'} value={item.isPrimary ? 'Primary · shared with applications' : 'Secondary'} />
      <Field label="Updated" value={formatDate(item.updatedAt)} />
    </View>
  );
}

function renderLink(item: PortfolioLinkItem, _colors: ReturnType<typeof useTheme>) {
  return (
    <View style={styles.fields}>
      <Field label="URL" value={item.url} link />
      <Field label="Added" value={formatDate(item.createdAt)} muted />
    </View>
  );
}

// ── Field row + link opener ─────────────────────────────────────────────────

function Field({
  label,
  value,
  link,
  muted,
}: {
  label: string;
  value: string;
  link?: boolean;
  muted?: boolean;
}) {
  const colors = useTheme();
  if (link) {
    return (
      <Pressable
        accessibilityRole="link"
        onPress={() => {
          void openPortfolioFile(value);
        }}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <ThemedText type="smallBold" themeColor="textMuted" style={styles.fieldLabel}>
          {label.toUpperCase()}
        </ThemedText>
        <View style={styles.linkRow}>
          <Ionicons name="open-outline" size={13} color={colors.primary} />
          <ThemedText type="smallBold" themeColor="primary" style={styles.linkValue} numberOfLines={2}>
            {value}
          </ThemedText>
        </View>
      </Pressable>
    );
  }
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textMuted" style={styles.fieldLabel}>
        {label.toUpperCase()}
      </ThemedText>
      <ThemedText
        themeColor={muted ? 'textMuted' : 'text'}
        style={[styles.fieldValue, muted && styles.fieldValueMuted]}
      >
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrimTap: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.one + 2,
    maxHeight: '88%',
    minHeight: '60%',
    zIndex: 1,
    elevation: 6,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    marginBottom: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three - 4,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: FontFamilies.bold,
    fontSize: 19,
    lineHeight: 25,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    marginTop: Spacing.three,
  },
  bodyContent: {
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  fields: {
    gap: Spacing.two + 2,
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    fontFamily: FontFamilies.bold,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  fieldValueMuted: {
    fontSize: 12,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkValue: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two + 2,
    marginTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
