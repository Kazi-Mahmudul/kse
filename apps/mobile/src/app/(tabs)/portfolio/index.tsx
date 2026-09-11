import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { PortfolioOverview } from '@/features/portfolio/overview';
import {
  useCreateAchievement,
  useCreateCertificate,
  useCreatePortfolioLink,
  useCreateProject,
  useCreateResearch,
  useCreateResume,
  useDeleteAchievement,
  useDeleteCertificate,
  useDeletePortfolioLink,
  useDeleteProject,
  useDeleteResearch,
  useDeleteResume,
  useMyAchievements,
  useMyCertificates,
  useMyPortfolioLinks,
  useMyProjects,
  useMyResearch,
  useMyResumes,
  useUpdateAchievement,
  useUpdateCertificate,
  useUpdatePortfolioLink,
  useUpdateProject,
  useUpdateResearch,
  useUpdateResume,
} from '@/features/portfolio/queries';
import {
  AchievementsSection,
  CertificatesSection,
  PortfolioLinksSection,
  ProjectsSection,
  ResearchSection,
  ResumesSection,
} from '@/features/portfolio/sections';
import type {
  AchievementFormValues,
  CertificateFormValues,
  PortfolioLinkFormValues,
  ProjectFormValues,
  ResearchFormValues,
  ResumeFormValues,
} from '@kse/validation';
import { useTheme } from '@/hooks/use-theme';
import { useTints } from '@/hooks/use-tints';

/**
 * Portfolio hub (spec §6 Profile, step 18). Overview tile grid, then one
 * section per entity type — each fully self-contained (RHF + Zod +
 * RHF-submit → mutation).
 */
export default function PortfolioScreen() {
  const colors = useTheme();
  const tints = useTints();

  return (
    <Screen>
      <BackHeader title="My portfolio" />
      <PortfolioOverview />
      <ProjectsSectionBound />
      <CertificatesSectionBound />
      <AchievementsSectionBound />
      <ResearchSectionBound />
      <ResumesSectionBound />
      <PortfolioLinksSectionBound />

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
    </Screen>
  );
}

// ── Section bindings: each combines queries + mutations + local errors ──

function useErrorMessage(error: Error | null, mutationError: Error | null): string | null {
  if (mutationError) return mutationError.message;
  if (error) return error.message;
  return null;
}

function ProjectsSectionBound() {
  const q = useMyProjects();
  const create = useCreateProject();
  const update = useUpdateProject();
  const remove = useDeleteProject();
  const errorMessage = useErrorMessage(q.error, create.error ?? update.error ?? remove.error ?? null);
  return (
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
    />
  );
}

function toProjectPayload(v: ProjectFormValues) {
  return {
    title: v.title,
    description: v.description.trim() === '' ? null : v.description,
    url: v.url.trim() === '' ? null : v.url,
    tech_stack: v.tech_stack,
    started_on: v.started_on.trim() === '' ? null : v.started_on,
    completed_on: v.completed_on.trim() === '' ? null : v.completed_on,
  };
}

function CertificatesSectionBound() {
  const q = useMyCertificates();
  const create = useCreateCertificate();
  const update = useUpdateCertificate();
  const remove = useDeleteCertificate();
  const errorMessage = useErrorMessage(q.error, create.error ?? update.error ?? remove.error ?? null);
  return (
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
    />
  );
}

function toCertificatePayload(v: CertificateFormValues) {
  return {
    title: v.title,
    issuer: v.issuer.trim() === '' ? null : v.issuer,
    issued_on: v.issued_on.trim() === '' ? null : v.issued_on,
    file_url: v.file_url.trim() === '' ? null : v.file_url,
  };
}

function AchievementsSectionBound() {
  const q = useMyAchievements();
  const create = useCreateAchievement();
  const update = useUpdateAchievement();
  const remove = useDeleteAchievement();
  const errorMessage = useErrorMessage(q.error, create.error ?? update.error ?? remove.error ?? null);
  return (
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
    />
  );
}

function toAchievementPayload(v: AchievementFormValues) {
  return {
    title: v.title,
    description: v.description.trim() === '' ? null : v.description,
    achieved_on: v.achieved_on.trim() === '' ? null : v.achieved_on,
  };
}

function ResearchSectionBound() {
  const q = useMyResearch();
  const create = useCreateResearch();
  const update = useUpdateResearch();
  const remove = useDeleteResearch();
  const errorMessage = useErrorMessage(q.error, create.error ?? update.error ?? remove.error ?? null);
  return (
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
    />
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

function ResumesSectionBound() {
  const q = useMyResumes();
  const create = useCreateResume();
  const update = useUpdateResume();
  const remove = useDeleteResume();
  const errorMessage = useErrorMessage(q.error, create.error ?? update.error ?? remove.error ?? null);
  return (
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
    />
  );
}

function toResumePayload(v: ResumeFormValues) {
  return { file_url: v.file_url, is_primary: v.is_primary };
}

function PortfolioLinksSectionBound() {
  const q = useMyPortfolioLinks();
  const create = useCreatePortfolioLink();
  const update = useUpdatePortfolioLink();
  const remove = useDeletePortfolioLink();
  const errorMessage = useErrorMessage(q.error, create.error ?? update.error ?? remove.error ?? null);
  return (
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
    />
  );
}

function toLinkPayload(v: PortfolioLinkFormValues) {
  return { label: v.label.trim(), url: v.url.trim() };
}

const styles = StyleSheet.create({
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
