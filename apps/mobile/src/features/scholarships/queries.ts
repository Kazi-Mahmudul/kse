import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  createActivity,
  createTestScore,
  deleteActivity,
  deleteApplication,
  deleteTestScore,
  listEligibilityForOpportunities,
  listMyActivities,
  listMyApplications,
  listMyTestScores,
  updateActivity,
  updateTestScore,
  upsertApplication,
  type UpsertActivityInput,
  type UpsertApplicationInput,
  type UpsertTestScoreInput,
} from './service';

export const scholarshipKeys = {
  all: ['scholarships'] as const,
  eligibility: (opportunityIds: readonly string[]) =>
    [...scholarshipKeys.all, 'eligibility', [...opportunityIds].sort()] as const,
  testScores: () => [...scholarshipKeys.all, 'test-scores'] as const,
  activities: () => [...scholarshipKeys.all, 'activities'] as const,
  applications: () => [...scholarshipKeys.all, 'applications'] as const,
};

/** Read eligibility rows for a set of opportunity IDs — the matching
 *  engine needs both the list of scholarships and their rules at once. */
export function useEligibilityFor(opportunityIds: readonly string[]) {
  return useQuery({
    queryKey: scholarshipKeys.eligibility(opportunityIds),
    queryFn: () => listEligibilityForOpportunities(opportunityIds),
    enabled: opportunityIds.length > 0,
  });
}

export function useMyTestScores() {
  return useQuery({ queryKey: scholarshipKeys.testScores(), queryFn: listMyTestScores });
}

export function useCreateTestScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertTestScoreInput) => createTestScore(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scholarshipKeys.testScores() });
    },
  });
}

export function useUpdateTestScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertTestScoreInput }) =>
      updateTestScore(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scholarshipKeys.testScores() });
    },
  });
}

export function useDeleteTestScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTestScore(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scholarshipKeys.testScores() });
    },
  });
}

export function useMyActivities() {
  return useQuery({ queryKey: scholarshipKeys.activities(), queryFn: listMyActivities });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertActivityInput) => createActivity(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scholarshipKeys.activities() });
    },
  });
}

export function useUpdateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertActivityInput }) =>
      updateActivity(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scholarshipKeys.activities() });
    },
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scholarshipKeys.activities() });
    },
  });
}

export function useMyApplications() {
  return useQuery({ queryKey: scholarshipKeys.applications(), queryFn: listMyApplications });
}

export function useUpsertApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertApplicationInput) => upsertApplication(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scholarshipKeys.applications() });
    },
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: scholarshipKeys.applications() });
    },
  });
}
