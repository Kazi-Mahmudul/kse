import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { Linking } from 'react-native';

import { alertDialog } from '@/lib/confirm';
import type {
  PortfolioAchievementItem,
  PortfolioCertificateItem,
  PortfolioEducationItem,
  PortfolioLinkItem,
  PortfolioProjectItem,
  PortfolioResearchItem,
  PortfolioResumeItem,
} from '@kse/types';

import {
  createAchievement,
  createCertificate,
  createEducation,
  createPortfolioLink,
  createProject,
  createResearch,
  createResume,
  deleteAchievement,
  deleteCertificate,
  deleteEducation,
  deletePortfolioLink,
  deleteProject,
  deleteResearch,
  deleteResume,
  listMyAchievements,
  listMyCertificates,
  listMyEducation,
  listMyPortfolioLinks,
  listMyProjects,
  listMyResearch,
  listMyResumes,
  resolveViewableFileUrl,
  updateAchievement,
  updateCertificate,
  updateEducation,
  updatePortfolioLink,
  updateProject,
  updateResearch,
  updateResume,
  uploadPortfolioDocument,
  type AchievementUpsert,
  type CertificateUpsert,
  type EducationUpsert,
  type PortfolioDocumentInput,
  type PortfolioLinkUpsert,
  type ProjectUpsert,
  type ResearchUpsert,
  type ResumeUpsert,
} from './service';

export const portfolioKeys = {
  all: ['portfolio'] as const,
  education: () => [...portfolioKeys.all, 'education'] as const,
  projects: () => [...portfolioKeys.all, 'projects'] as const,
  certificates: () => [...portfolioKeys.all, 'certificates'] as const,
  achievements: () => [...portfolioKeys.all, 'achievements'] as const,
  research: () => [...portfolioKeys.all, 'research'] as const,
  resumes: () => [...portfolioKeys.all, 'resumes'] as const,
  links: () => [...portfolioKeys.all, 'links'] as const,
};

// ── Education ────────────────────────────────────────────────────────────────

export function useMyEducation() {
  return useQuery({
    queryKey: portfolioKeys.education(),
    queryFn: listMyEducation,
  } satisfies UseQueryOptions<PortfolioEducationItem[], Error>);
}

export function useCreateEducation() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioEducationItem, Error, EducationUpsert>({
    mutationFn: (input) => createEducation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.education() });
    },
  });
}

export function useUpdateEducation() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioEducationItem, Error, { id: string; input: EducationUpsert }>({
    mutationFn: ({ id, input }) => updateEducation(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.education() });
    },
  });
}

export function useDeleteEducation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteEducation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.education() });
    },
  });
}

// ── Document upload / viewing (private `certificates` bucket) ────────────────

/** Uploads a picked file and returns its storage path (set into the form). */
export function useUploadPortfolioDocument() {
  return useMutation<string, Error, PortfolioDocumentInput>({
    mutationFn: (input) => uploadPortfolioDocument(input),
  });
}

/**
 * Opens a stored file reference: storage paths are resolved to a signed URL
 * first (owner-only), external links open directly. Not a query — fire and
 * forget with an Alert on failure.
 */
export async function openPortfolioFile(fileUrl: string | null | undefined): Promise<void> {
  if (!fileUrl) return;
  try {
    const url = await resolveViewableFileUrl(fileUrl);
    if (!url) return;
    await Linking.openURL(url);
  } catch {
    await alertDialog({
      title: 'Could not open file',
      message: 'Please check your connection and try again.',
    });
  }
}

export function useMyProjects() {
  return useQuery({
    queryKey: portfolioKeys.projects(),
    queryFn: listMyProjects,
  } satisfies UseQueryOptions<PortfolioProjectItem[], Error>);
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioProjectItem, Error, ProjectUpsert>({
    mutationFn: (input) => createProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.projects() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioProjectItem, Error, { id: string; input: ProjectUpsert }>({
    mutationFn: ({ id, input }) => updateProject(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.projects() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.projects() });
    },
  });
}

export function useMyCertificates() {
  return useQuery({
    queryKey: portfolioKeys.certificates(),
    queryFn: listMyCertificates,
  } satisfies UseQueryOptions<PortfolioCertificateItem[], Error>);
}

export function useCreateCertificate() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioCertificateItem, Error, CertificateUpsert>({
    mutationFn: (input) => createCertificate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certificates() });
    },
  });
}

export function useUpdateCertificate() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioCertificateItem, Error, { id: string; input: CertificateUpsert }>({
    mutationFn: ({ id, input }) => updateCertificate(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certificates() });
    },
  });
}

export function useDeleteCertificate() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteCertificate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.certificates() });
    },
  });
}

export function useMyAchievements() {
  return useQuery({
    queryKey: portfolioKeys.achievements(),
    queryFn: listMyAchievements,
  } satisfies UseQueryOptions<PortfolioAchievementItem[], Error>);
}

export function useCreateAchievement() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioAchievementItem, Error, AchievementUpsert>({
    mutationFn: (input) => createAchievement(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.achievements() });
    },
  });
}

export function useUpdateAchievement() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioAchievementItem, Error, { id: string; input: AchievementUpsert }>({
    mutationFn: ({ id, input }) => updateAchievement(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.achievements() });
    },
  });
}

export function useDeleteAchievement() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteAchievement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.achievements() });
    },
  });
}

export function useMyResearch() {
  return useQuery({
    queryKey: portfolioKeys.research(),
    queryFn: listMyResearch,
  } satisfies UseQueryOptions<PortfolioResearchItem[], Error>);
}

export function useCreateResearch() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioResearchItem, Error, ResearchUpsert>({
    mutationFn: (input) => createResearch(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.research() });
    },
  });
}

export function useUpdateResearch() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioResearchItem, Error, { id: string; input: ResearchUpsert }>({
    mutationFn: ({ id, input }) => updateResearch(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.research() });
    },
  });
}

export function useDeleteResearch() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteResearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.research() });
    },
  });
}

export function useMyResumes() {
  return useQuery({
    queryKey: portfolioKeys.resumes(),
    queryFn: listMyResumes,
  } satisfies UseQueryOptions<PortfolioResumeItem[], Error>);
}

export function useCreateResume() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioResumeItem, Error, ResumeUpsert>({
    mutationFn: (input) => createResume(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.resumes() });
    },
  });
}

export function useUpdateResume() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioResumeItem, Error, { id: string; input: ResumeUpsert }>({
    mutationFn: ({ id, input }) => updateResume(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.resumes() });
    },
  });
}

export function useDeleteResume() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteResume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.resumes() });
    },
  });
}

export function useMyPortfolioLinks() {
  return useQuery({
    queryKey: portfolioKeys.links(),
    queryFn: listMyPortfolioLinks,
  } satisfies UseQueryOptions<PortfolioLinkItem[], Error>);
}

export function useCreatePortfolioLink() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioLinkItem, Error, PortfolioLinkUpsert>({
    mutationFn: (input) => createPortfolioLink(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.links() });
    },
  });
}

export function useUpdatePortfolioLink() {
  const queryClient = useQueryClient();
  return useMutation<PortfolioLinkItem, Error, { id: string; input: PortfolioLinkUpsert }>({
    mutationFn: ({ id, input }) => updatePortfolioLink(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.links() });
    },
  });
}

export function useDeletePortfolioLink() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deletePortfolioLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.links() });
    },
  });
}
