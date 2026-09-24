import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { PortfolioDetailSheet, type PortfolioDetailItem } from '@/features/portfolio/detail-sheet';
import { PortfolioOverview } from '@/features/portfolio/overview';
import {
  useCreateAchievement,
  useCreateCertificate,
  useCreateEducation,
  useCreatePortfolioLink,
  useCreateProject,
  useCreateResearch,
  useCreateResume,
  useDeleteAchievement,
  useDeleteCertificate,
  useDeleteEducation,
  useDeletePortfolioLink,
  useDeleteProject,
  useDeleteResearch,
  useDeleteResume,
  useMyAchievements,
  useMyCertificates,
  useMyEducation,
  useMyPortfolioLinks,
  useMyProjects,
  useMyResearch,
  useMyResumes,
  useUpdateAchievement,
  useUpdateCertificate,
  useUpdateEducation,
  useUpdatePortfolioLink,
  useUpdateProject,
  useUpdateResearch,
  useUpdateResume,
} from '@/features/portfolio/queries';
import {
  AchievementsSection,
  CertificatesSection,
  EducationSection,
  PortfolioLinksSection,
  ProjectsSection,
  ResearchSection,
  ResumesSection,
} from '@/features/portfolio/sections';
import { EDUCATION_LEVEL_SPECS } from '@/features/portfolio/education-levels';
import type { EducationLevel, ProjectType } from '@kse/types';
import type {
  AchievementFormValues,
  CertificateFormValues,
  EducationFormValues,
  PortfolioLinkFormValues,
  ProjectFormValues,
  ResearchFormValues,
  ResumeFormValues,
} from '@kse/validation';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';

/** Tile keys the overview exposes — matches PortfolioOverview's tile keys. */
type TileKey =
  | 'education'
  | 'projects'
  | 'certificates'
  | 'achievements'
  | 'research'
  | 'resumes'
  | 'links';

const TILE_KEYS: readonly TileKey[] = [
  'education',
  'projects',
  'certificates',
  'achievements',
  'research',
  'resumes',
  'links',
];

/** Type-narrowing guard for `?scrollTo=` query params. */
function isTileKey(value: unknown): value is TileKey {
  return typeof value === 'string' && (TILE_KEYS as readonly string[]).includes(value);
}

/**
 * Portfolio hub (spec §6 Profile, step 18). Overview tile grid, then one
 * section per entity type — each fully self-contained (RHF + Zod +
 * RHF-submit → mutation).
 */
export default function PortfolioScreen() {
  const colors = useTheme();
  const tints = useTints();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ scrollTo?: string }>();

  // Single source of truth for the detail-sheet payload — each section
  // forwards its open callback up here, the sheet renders at the page
  // level so it sits above all the cards.
  const [detailItem, setDetailItem] = useState<PortfolioDetailItem | null>(null);

  // Scroll plumbing — overview tiles jump-scroll to the matching section.
  // We can't use `Screen` here (its inner ScrollView isn't exposed), so we
  // render our own. Each section's onLayout records its y offset relative
  // to the ScrollView; tapping a tile looks up that y and scrolls to it.
  // No rerender needed: the ref is mutated synchronously on every layout
  // pass and read lazily on tap.
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Partial<Record<TileKey, number>>>({});

  const registerSectionY = useCallback((key: TileKey, y: number) => {
    sectionOffsets.current[key] = y;
  }, []);

  const scrollToSection = useCallback(
    (key: TileKey) => {
      const y = sectionOffsets.current[key];
      if (typeof y !== 'number') return;
      // Small padding so the section header isn't glued to the top edge.
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
    },
    [],
  );

  // Honor ?scrollTo=<kind> from the Profile tab. Wait one frame + a small
  // buffer so the section `onLayout` callbacks have time to register their
  // y offsets (each section renders async once its query resolves, so the
  // last section's y may not exist on the first paint). Clear the param
  // after scrolling so a back-and-return doesn't re-scroll.
  useEffect(() => {
    const target = params.scrollTo;
    if (!target) return;
    if (!isTileKey(target)) return;
    const handle = setTimeout(() => {
      scrollToSection(target);
      // Strip the param from the URL — keeps history clean and avoids a
      // second scroll if the user re-enters the screen via a deep-link.
      router.setParams({ scrollTo: undefined });
    }, 250);
    return () => clearTimeout(handle);
  }, [params.scrollTo, scrollToSection]);

  const openEducation = useCallback(
    (item: Parameters<NonNullable<React.ComponentProps<typeof EducationSection>['onOpen']>>[0]) =>
      setDetailItem({ kind: 'education', item }),
    [],
  );
  const openProject = useCallback(
    (item: Parameters<NonNullable<React.ComponentProps<typeof ProjectsSection>['onOpen']>>[0]) =>
      setDetailItem({ kind: 'project', item }),
    [],
  );
  const openCertificate = useCallback(
    (item: Parameters<NonNullable<React.ComponentProps<typeof CertificatesSection>['onOpen']>>[0]) =>
      setDetailItem({ kind: 'certificate', item }),
    [],
  );
  const openAchievement = useCallback(
    (item: Parameters<NonNullable<React.ComponentProps<typeof AchievementsSection>['onOpen']>>[0]) =>
      setDetailItem({ kind: 'achievement', item }),
    [],
  );
  const openResearch = useCallback(
    (item: Parameters<NonNullable<React.ComponentProps<typeof ResearchSection>['onOpen']>>[0]) =>
      setDetailItem({ kind: 'research', item }),
    [],
  );
  const openResume = useCallback(
    (item: Parameters<NonNullable<React.ComponentProps<typeof ResumesSection>['onOpen']>>[0]) =>
      setDetailItem({ kind: 'resume', item }),
    [],
  );
  const openLink = useCallback(
    (item: Parameters<NonNullable<React.ComponentProps<typeof PortfolioLinksSection>['onOpen']>>[0]) =>
      setDetailItem({ kind: 'link', item }),
    [],
  );

  // Edit from inside the sheet just clears it; the section's existing edit
  // flow (which already opens the form) is what the user actually wants.
  // We close the sheet here so it doesn't fight with the section's UI.
  const handleEditFromSheet = useCallback(() => {
    setDetailItem(null);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BackHeader title="My portfolio" />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, BottomTabInset) + Spacing.four },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <PortfolioOverview onTilePress={scrollToSection} />
        <EducationSectionBound
          onOpen={openEducation}
          onLayoutY={(y) => registerSectionY('education', y)}
        />
        <ProjectsSectionBound
          onOpen={openProject}
          onLayoutY={(y) => registerSectionY('projects', y)}
        />
        <CertificatesSectionBound
          onOpen={openCertificate}
          onLayoutY={(y) => registerSectionY('certificates', y)}
        />
        <AchievementsSectionBound
          onOpen={openAchievement}
          onLayoutY={(y) => registerSectionY('achievements', y)}
        />
        <ResearchSectionBound
          onOpen={openResearch}
          onLayoutY={(y) => registerSectionY('research', y)}
        />
        <ResumesSectionBound
          onOpen={openResume}
          onLayoutY={(y) => registerSectionY('resumes', y)}
        />
        <PortfolioLinksSectionBound
          onOpen={openLink}
          onLayoutY={(y) => registerSectionY('links', y)}
        />

        <View style={styles.spacer} />
        <Card
          tint="background"
          onPress={() => router.push('/(tabs)/profile/edit')}
          style={[
            styles.editCard,
            { borderColor: colors.border, boxShadow: `0px 1px 6px ${colors.shadow}` },
          ]}
        >
          <View style={styles.row}>
            <View style={[styles.editBadge, { backgroundColor: tints.indigo.bg }]}>
              <Ionicons name="create-outline" size={16} color={tints.indigo.fg} />
            </View>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">Edit profile basics</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Name, university, bio and skills.
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </Card>
      </ScrollView>

      <PortfolioDetailSheet
        value={detailItem}
        onClose={() => setDetailItem(null)}
        onEdit={handleEditFromSheet}
      />
    </View>
  );
}

// ── Section bindings: each combines queries + mutations + local errors ──

function useErrorMessage(error: Error | null, mutationError: Error | null): string | null {
  if (mutationError) return mutationError.message;
  if (error) return error.message;
  return null;
}

function EducationSectionBound({
  onOpen,
  onLayoutY,
}: {
  onOpen(item: Parameters<NonNullable<React.ComponentProps<typeof EducationSection>['onOpen']>>[0]): void;
  onLayoutY(y: number): void;
}) {
  const q = useMyEducation();
  const create = useCreateEducation();
  const update = useUpdateEducation();
  const remove = useDeleteEducation();
  const errorMessage = useErrorMessage(q.error, create.error ?? update.error ?? remove.error ?? null);
  return (
    <View
      style={styles.sectionAnchor}
      onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}
    >
      <EducationSection
        items={q.data ?? []}
        isSaving={create.isPending || update.isPending || remove.isPending}
        create={async (v) => {
          await create.mutateAsync(toEducationPayload(v));
        }}
        update={async (id, v) => {
          await update.mutateAsync({ id, input: toEducationPayload(v) });
        }}
        remove={async (id) => {
          await remove.mutateAsync(id);
        }}
        errorMessage={errorMessage}
        onOpen={onOpen}
      />
    </View>
  );
}

/**
 * '' → null plus a per-level trim: fields the selected level doesn't use are
 * nulled (not persisted) so rows stay clean, e.g. a bachelor's degree never
 * carries an SSC study group.
 */
function toEducationPayload(v: EducationFormValues) {
  // The schema rejects an empty level, so a submitted form always has one.
  const spec = EDUCATION_LEVEL_SPECS[v.level as EducationLevel];
  const str = (s: string) => (s.trim() === '' ? null : s.trim());
  const num = (s: string) => (s === '' ? null : Number(s));
  return {
    level: v.level as EducationLevel,
    institution: v.institution.trim(),
    institution_id: v.institution_id === '' || v.institution_id == null ? null : v.institution_id,
    district: str(v.district),
    board: spec.boardLabel ? str(v.board) : null,
    study_group: spec.showGroup ? str(v.study_group) : null,
    degree_type: spec.degreeOptions ? str(v.degree_type) : null,
    program_name: spec.programLabel ? str(v.program_name) : null,
    major: spec.majorLabel ? str(v.major) : null,
    campus: spec.showCampus ? str(v.campus) : null,
    research_area: spec.showResearch ? str(v.research_area) : null,
    thesis_title: spec.showResearch ? str(v.thesis_title) : null,
    supervisor: spec.showResearch ? str(v.supervisor) : null,
    roll_number: spec.showRoll ? str(v.roll_number) : null,
    registration_number: spec.showRoll ? str(v.registration_number) : null,
    start_year: spec.useRangeYears ? num(v.start_year) : null,
    passing_year: num(v.passing_year),
    is_ongoing: spec.useRangeYears ? v.is_ongoing : false,
    result_type: str(v.result_type),
    result: str(v.result),
    result_scale: v.result_scale === '' ? null : Number(v.result_scale),
    document_url: str(v.document_url),
  };
}

function ProjectsSectionBound({
  onOpen,
  onLayoutY,
}: {
  onOpen(item: Parameters<NonNullable<React.ComponentProps<typeof ProjectsSection>['onOpen']>>[0]): void;
  onLayoutY(y: number): void;
}) {
  const q = useMyProjects();
  const create = useCreateProject();
  const update = useUpdateProject();
  const remove = useDeleteProject();
  const errorMessage = useErrorMessage(q.error, create.error ?? update.error ?? remove.error ?? null);
  return (
    <View
      style={styles.sectionAnchor}
      onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}
    >
      <ProjectsSection
        items={q.data ?? []}
        isSaving={create.isPending || update.isPending || remove.isPending}
        create={async (v) => {
          await create.mutateAsync(toProjectPayload(v));
        }}
        update={async (id, v) => {
          await update.mutateAsync({ id, input: toProjectPayload(v) });
        }}
        remove={async (id) => {
          await remove.mutateAsync(id);
        }}
        errorMessage={errorMessage}
        onOpen={onOpen}
      />
    </View>
  );
}

function toProjectPayload(v: ProjectFormValues) {
  const str = (s: string) => (s.trim() === '' ? null : s);
  return {
    title: v.title,
    // superRefine guarantees a chosen type at submit; '' can't reach here.
    project_type: str(v.project_type) as ProjectType | null,
    description: str(v.description),
    details: str(v.details),
    role: str(v.role),
    organization: str(v.organization),
    course_name: str(v.course_name),
    is_team: v.is_team,
    team_members: v.team_members,
    tech_stack: v.tech_stack,
    url: str(v.url),
    repo_url: str(v.repo_url),
    demo_url: str(v.demo_url),
    cover_url: str(v.cover_url),
    document_url: str(v.document_url),
    started_on: str(v.started_on),
    completed_on: str(v.completed_on),
  };
}

function CertificatesSectionBound({
  onOpen,
  onLayoutY,
}: {
  onOpen(item: Parameters<NonNullable<React.ComponentProps<typeof CertificatesSection>['onOpen']>>[0]): void;
  onLayoutY(y: number): void;
}) {
  const q = useMyCertificates();
  const create = useCreateCertificate();
  const update = useUpdateCertificate();
  const remove = useDeleteCertificate();
  const errorMessage = useErrorMessage(q.error, create.error ?? update.error ?? remove.error ?? null);
  return (
    <View
      style={styles.sectionAnchor}
      onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}
    >
      <CertificatesSection
        items={q.data ?? []}
        isSaving={create.isPending || update.isPending || remove.isPending}
        create={async (v) => {
          await create.mutateAsync(toCertificatePayload(v));
        }}
        update={async (id, v) => {
          await update.mutateAsync({ id, input: toCertificatePayload(v) });
        }}
        remove={async (id) => {
          await remove.mutateAsync(id);
        }}
        errorMessage={errorMessage}
        onOpen={onOpen}
      />
    </View>
  );
}

function toCertificatePayload(v: CertificateFormValues) {
  const str = (s: string) => (s.trim() === '' ? null : s.trim());
  return {
    title: v.title,
    certificate_type: str(v.certificate_type),
    issuer: str(v.issuer),
    program_name: str(v.program_name),
    issued_on: str(v.issued_on),
    expires_on: str(v.expires_on),
    credential_id: str(v.credential_id),
    credential_url: str(v.credential_url),
    verification_url: str(v.verification_url),
    description: str(v.description),
    file_url: str(v.file_url),
  };
}

function AchievementsSectionBound({
  onOpen,
  onLayoutY,
}: {
  onOpen(item: Parameters<NonNullable<React.ComponentProps<typeof AchievementsSection>['onOpen']>>[0]): void;
  onLayoutY(y: number): void;
}) {
  const q = useMyAchievements();
  const create = useCreateAchievement();
  const update = useUpdateAchievement();
  const remove = useDeleteAchievement();
  const errorMessage = useErrorMessage(q.error, create.error ?? update.error ?? remove.error ?? null);
  return (
    <View
      style={styles.sectionAnchor}
      onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}
    >
      <AchievementsSection
        items={q.data ?? []}
        isSaving={create.isPending || update.isPending || remove.isPending}
        create={async (v) => {
          await create.mutateAsync(toAchievementPayload(v));
        }}
        update={async (id, v) => {
          await update.mutateAsync({ id, input: toAchievementPayload(v) });
        }}
        remove={async (id) => {
          await remove.mutateAsync(id);
        }}
        errorMessage={errorMessage}
        onOpen={onOpen}
      />
    </View>
  );
}

function toAchievementPayload(v: AchievementFormValues) {
  return {
    title: v.title,
    description: v.description.trim() === '' ? null : v.description,
    achieved_on: v.achieved_on.trim() === '' ? null : v.achieved_on,
  };
}

function ResearchSectionBound({
  onOpen,
  onLayoutY,
}: {
  onOpen(item: Parameters<NonNullable<React.ComponentProps<typeof ResearchSection>['onOpen']>>[0]): void;
  onLayoutY(y: number): void;
}) {
  const q = useMyResearch();
  const create = useCreateResearch();
  const update = useUpdateResearch();
  const remove = useDeleteResearch();
  const errorMessage = useErrorMessage(q.error, create.error ?? update.error ?? remove.error ?? null);
  return (
    <View
      style={styles.sectionAnchor}
      onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}
    >
      <ResearchSection
        items={q.data ?? []}
        isSaving={create.isPending || update.isPending || remove.isPending}
        create={async (v) => {
          await create.mutateAsync(toResearchPayload(v));
        }}
        update={async (id, v) => {
          await update.mutateAsync({ id, input: toResearchPayload(v) });
        }}
        remove={async (id) => {
          await remove.mutateAsync(id);
        }}
        errorMessage={errorMessage}
        onOpen={onOpen}
      />
    </View>
  );
}

function toResearchPayload(v: ResearchFormValues) {
  return {
    title: v.title,
    abstract: v.abstract.trim() === '' ? null : v.abstract,
    role: v.role.trim() === '' ? null : v.role,
    collaborators: v.collaborators,
    url: v.url.trim() === '' ? null : v.url,
    published_on: v.published_on.trim() === '' ? null : v.published_on,
  };
}

function ResumesSectionBound({
  onOpen,
  onLayoutY,
}: {
  onOpen(item: Parameters<NonNullable<React.ComponentProps<typeof ResumesSection>['onOpen']>>[0]): void;
  onLayoutY(y: number): void;
}) {
  const q = useMyResumes();
  const create = useCreateResume();
  const update = useUpdateResume();
  const remove = useDeleteResume();
  const errorMessage = useErrorMessage(q.error, create.error ?? update.error ?? remove.error ?? null);
  return (
    <View
      style={styles.sectionAnchor}
      onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}
    >
      <ResumesSection
        items={q.data ?? []}
        isSaving={create.isPending || update.isPending || remove.isPending}
        create={async (v) => {
          await create.mutateAsync(toResumePayload(v));
        }}
        update={async (id, v) => {
          await update.mutateAsync({ id, input: toResumePayload(v) });
        }}
        remove={async (id) => {
          await remove.mutateAsync(id);
        }}
        errorMessage={errorMessage}
        onOpen={onOpen}
      />
    </View>
  );
}

function toResumePayload(v: ResumeFormValues) {
  return {
    file_url: v.file_url,
    file_name: v.file_name.trim() === '' ? null : v.file_name.trim(),
    is_primary: v.is_primary,
  };
}

function PortfolioLinksSectionBound({
  onOpen,
  onLayoutY,
}: {
  onOpen(item: Parameters<NonNullable<React.ComponentProps<typeof PortfolioLinksSection>['onOpen']>>[0]): void;
  onLayoutY(y: number): void;
}) {
  const q = useMyPortfolioLinks();
  const create = useCreatePortfolioLink();
  const update = useUpdatePortfolioLink();
  const remove = useDeletePortfolioLink();
  const errorMessage = useErrorMessage(q.error, create.error ?? update.error ?? remove.error ?? null);
  return (
    <View
      style={styles.sectionAnchor}
      onLayout={(e) => onLayoutY(e.nativeEvent.layout.y)}
    >
      <PortfolioLinksSection
        items={q.data ?? []}
        isSaving={create.isPending || update.isPending || remove.isPending}
        create={async (v) => {
          await create.mutateAsync(toLinkPayload(v));
        }}
        update={async (id, v) => {
          await update.mutateAsync({ id, input: toLinkPayload(v) });
        }}
        remove={async (id) => {
          await remove.mutateAsync(id);
        }}
        errorMessage={errorMessage}
        onOpen={onOpen}
      />
    </View>
  );
}

function toLinkPayload(v: PortfolioLinkFormValues) {
  return { label: v.label.trim(), url: v.url.trim() };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  sectionAnchor: {
    // Marker so each section can capture its onLayout y. Has no visual
    // effect; the absolute y of this wrapper is the section's top inside
    // the ScrollView's content container.
  },
  spacer: {
    height: Spacing.four,
  },
  editCard: {
    borderWidth: 1,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  editBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
