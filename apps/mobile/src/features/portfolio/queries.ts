import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  PortfolioAchievementItem,
  PortfolioCertificateItem,
  PortfolioLinkItem,
  PortfolioProjectItem,
  PortfolioResearchItem,
  PortfolioResumeItem,
} from '@kse/types';

import {
  createAchievement,
  createCertificate,
  createPortfolioLink,
  createProject,
  createResearch,
  createResume,
  deleteAchievement,
  deleteCertificate,
  deletePortfolioLink,
  deleteProject,
  deleteResearch,
  deleteResume,
  listMyAchievements,
  listMyCertificates,
  listMyPortfolioLinks,
  listMyProjects,
  listMyResearch,
  listMyResumes,
  updateAchievement,
  updateCertificate,
  updatePortfolioLink,
  updateProject,
  updateResearch,
  updateResume,
  type AchievementUpsert,
  type CertificateUpsert,
  type PortfolioLinkUpsert,
  type ProjectUpsert,
  type ResearchUpsert,
  type ResumeUpsert,
} from './service';

export const portfolioKeys = {
  all: ['portfolio'] as const,
  projects: () => [...portfolioKeys.all, 'projects'] as const,
  certificates: () => [...portfolioKeys.all, 'certificates'] as const,
  achievements: () => [...portfolioKeys.all, 'achievements'] as const,
  research: () => [...portfolioKeys.all, 'research'] as const,
  resumes: () => [...portfolioKeys.all, 'resumes'] as const,
  links: () => [...portfolioKeys.all, 'links'] as const,
};

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
