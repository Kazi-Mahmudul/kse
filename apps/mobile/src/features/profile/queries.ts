import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProfileUpdateInput } from '@kse/validation';

import {
  getMyProfile,
  getMySkillIds,
  listDepartments,
  listSkills,
  listUniversities,
  removeAvatar,
  setMySkills,
  updateMyProfile,
  uploadAvatar,
} from './service';

/** Query keys for profile-owned data (CLAUDE.md rule 11: TanStack Query). */
export const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
  mySkills: () => [...profileKeys.all, 'my-skills'] as const,
};

const masterDataKeys = {
  universities: ['universities'] as const,
  departments: ['departments'] as const,
  skills: ['skills'] as const,
};

export function useMyProfile() {
  return useQuery({ queryKey: profileKeys.me(), queryFn: getMyProfile });
}

export function useMySkillIds() {
  return useQuery({ queryKey: profileKeys.mySkills(), queryFn: getMySkillIds });
}

export function useUniversities() {
  return useQuery({ queryKey: masterDataKeys.universities, queryFn: listUniversities });
}

export function useDepartments() {
  return useQuery({ queryKey: masterDataKeys.departments, queryFn: listDepartments });
}

export function useSkills() {
  return useQuery({ queryKey: masterDataKeys.skills, queryFn: listSkills });
}

export interface SaveProfileParams {
  profile: ProfileUpdateInput;
  skillIds: string[];
}

/** Saves the profile row and the skill set together, then refetches both. */
export function useSaveProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profile, skillIds }: SaveProfileParams) => {
      await updateMyProfile(profile);
      await setMySkills(skillIds);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

// ── Avatar mutations (CLAUDE.md §15: own-prefix storage) ─────────────────────

/** Upload + persist. Returns the new public URL. */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, { localUri: string; mimeType: string }>({
    mutationFn: ({ localUri, mimeType }) => uploadAvatar(localUri, mimeType),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.me() });
    },
  });
}

/** Clears `profiles.avatar_url`. */
export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => removeAvatar(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.me() });
    },
  });
}
