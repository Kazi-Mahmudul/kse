import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import {
  cancelRegistration,
  listMyRegistrations,
  listRegisteredOpportunityIds,
  registerForEvent,
  type RegisteredEventRow,
} from './service';

export const registrationKeys = {
  all: ['registrations'] as const,
  ids: () => [...registrationKeys.all, 'ids'] as const,
  list: () => [...registrationKeys.all, 'list'] as const,
};

/** Toggle state for detail screens — a Set of registered opportunity ids. */
export function useRegisteredOpportunityIds() {
  return useQuery({
    queryKey: registrationKeys.ids(),
    queryFn: async () => new Set(await listRegisteredOpportunityIds()),
  } satisfies UseQueryOptions<Set<string>, Error>);
}

/** Active registrations for the dashboard. */
export function useMyRegistrations() {
  return useQuery({
    queryKey: registrationKeys.list(),
    queryFn: () => listMyRegistrations(),
  } satisfies UseQueryOptions<RegisteredEventRow[], Error>);
}

export interface ToggleRegistrationParams {
  opportunityId: string;
  registered: boolean;
}

/** Optimistic register/cancel over the shared ids Set (same pattern as bookmarks). */
export function useToggleRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ opportunityId, registered }: ToggleRegistrationParams) =>
      registered
        ? registerForEvent(opportunityId)
        : cancelRegistration(opportunityId),

    onMutate: async ({ opportunityId, registered }) => {
      await queryClient.cancelQueries({ queryKey: registrationKeys.ids() });
      const previous = queryClient.getQueryData<Set<string>>(registrationKeys.ids());

      const next = new Set(previous ?? []);
      if (registered) {
        next.add(opportunityId);
      } else {
        next.delete(opportunityId);
      }
      queryClient.setQueryData(registrationKeys.ids(), next);

      return { previous };
    },

    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(registrationKeys.ids(), context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: registrationKeys.all });
    },
  });
}
