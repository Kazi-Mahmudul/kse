/**
 * Mess Management — TanStack Query Hooks
 */

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  Mess,
  MessDetail,
  MyMessItem,
  MessMemberDetail,
  MessInvite,
  MealRecord,
  MealCalendarEntry,
  BazarDuty,
  ExchangeRequestDetail,
  BazarPurchaseDetail,
  MessExpense,
  MessPayment,
  SettlementDetail,
  MessAnnouncement,
  MessAuditLog,
  MemberDashboard,
  CreateMessInput,
  MealToggleInput,
  BazarPurchaseInput,
  ExpenseInput,
  PaymentInput,
  ExchangeRequestInput,
  AnnouncementInput,
} from '@kse/types';

import * as svc from './service';

// ── Query Keys ────────────────────────────────────────────────────────────────

export const messKeys = {
  all: ['mess'] as const,

  // Mess
  myMesses: () => [...messKeys.all, 'myMesses'] as const,
  messDetail: (id: string) => [...messKeys.all, 'detail', id] as const,
  members: (messId: string) => [...messKeys.all, 'members', messId] as const,

  // Meals
  mealCalendar: (messId: string, start: string, end: string) =>
    [...messKeys.all, 'meals', 'calendar', messId, start, end] as const,
  todayMeals: (messId: string, date: string) =>
    [...messKeys.all, 'meals', 'today', messId, date] as const,
  mealStats: (messId: string, monthStart: string, monthEnd: string) =>
    [...messKeys.all, 'meals', 'stats', messId, monthStart, monthEnd] as const,

  // Bazar
  bazarDuties: (messId: string, monthStart: string, monthEnd: string) =>
    [...messKeys.all, 'bazar', 'duties', messId, monthStart, monthEnd] as const,
  myNextDuty: (messId: string) => [...messKeys.all, 'bazar', 'nextDuty', messId] as const,
  pendingExchanges: (messId: string) => [...messKeys.all, 'bazar', 'exchanges', messId] as const,
  bazarPurchases: (messId: string, monthStart: string, monthEnd: string) =>
    [...messKeys.all, 'bazar', 'purchases', messId, monthStart, monthEnd] as const,
  bazarContribution: (messId: string, monthStart: string, monthEnd: string) =>
    [...messKeys.all, 'bazar', 'contribution', messId, monthStart, monthEnd] as const,

  // Financial
  expenses: (messId: string, monthStart: string, monthEnd: string) =>
    [...messKeys.all, 'expenses', messId, monthStart, monthEnd] as const,
  payments: (messId: string) => [...messKeys.all, 'payments', messId] as const,
  settlement: (messId: string, monthStart: string) =>
    [...messKeys.all, 'settlement', messId, monthStart] as const,

  // Other
  announcements: (messId: string) => [...messKeys.all, 'announcements', messId] as const,
  auditLogs: (messId: string) => [...messKeys.all, 'audit', messId] as const,
  dashboard: (messId: string) => [...messKeys.all, 'dashboard', messId] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useMyMesses() {
  return useQuery({
    queryKey: messKeys.myMesses(),
    queryFn: () => svc.fetchMyMesses(),
    staleTime: 30_000,
  });
}

export function useMessDetail(messId: string) {
  return useQuery({
    queryKey: messKeys.messDetail(messId),
    queryFn: () => svc.fetchMessDetail(messId),
    enabled: Boolean(messId),
  });
}

export function useMessMembers(messId: string) {
  return useQuery({
    queryKey: messKeys.members(messId),
    queryFn: () => svc.fetchMessMembers(messId),
    enabled: Boolean(messId),
  });
}

export function useMealCalendar(messId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: messKeys.mealCalendar(messId, startDate, endDate),
    queryFn: () => svc.fetchMealCalendar(messId, startDate, endDate),
    enabled: Boolean(messId) && Boolean(startDate) && Boolean(endDate),
    staleTime: 10_000,
  });
}

export function useTodayMeals(messId: string, date: string) {
  return useQuery({
    queryKey: messKeys.todayMeals(messId, date),
    queryFn: () => svc.fetchTodayMeals(messId, date),
    enabled: Boolean(messId) && Boolean(date),
    staleTime: 5_000,
    refetchInterval: 30_000,
  });
}

export function useMealStats(messId: string, monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: messKeys.mealStats(messId, monthStart, monthEnd),
    queryFn: () => svc.fetchMealStats(messId, monthStart, monthEnd),
    enabled: Boolean(messId) && Boolean(monthStart) && Boolean(monthEnd),
    staleTime: 30_000,
  });
}

export function useBazarDuties(messId: string, monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: messKeys.bazarDuties(messId, monthStart, monthEnd),
    queryFn: () => svc.fetchBazarDuties(messId, monthStart, monthEnd),
    enabled: Boolean(messId) && Boolean(monthStart) && Boolean(monthEnd),
  });
}

export function useMyNextDuty(messId: string) {
  return useQuery({
    queryKey: messKeys.myNextDuty(messId),
    queryFn: () => svc.fetchMyNextDuty(messId),
    enabled: Boolean(messId),
    staleTime: 30_000,
  });
}

export function usePendingExchanges(messId: string) {
  return useQuery({
    queryKey: messKeys.pendingExchanges(messId),
    queryFn: () => svc.fetchPendingExchanges(messId),
    enabled: Boolean(messId),
  });
}

export function useBazarPurchases(messId: string, monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: messKeys.bazarPurchases(messId, monthStart, monthEnd),
    queryFn: () => svc.fetchBazarPurchases(messId, monthStart, monthEnd),
    enabled: Boolean(messId) && Boolean(monthStart) && Boolean(monthEnd),
  });
}

export function useMyBazarContribution(messId: string, monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: messKeys.bazarContribution(messId, monthStart, monthEnd),
    queryFn: () => svc.fetchMyBazarContribution(messId, monthStart, monthEnd),
    enabled: Boolean(messId) && Boolean(monthStart) && Boolean(monthEnd),
    staleTime: 30_000,
  });
}

export function useMessExpenses(messId: string, monthStart: string, monthEnd: string) {
  return useQuery({
    queryKey: messKeys.expenses(messId, monthStart, monthEnd),
    queryFn: () => svc.fetchMessExpenses(messId, monthStart, monthEnd),
    enabled: Boolean(messId) && Boolean(monthStart) && Boolean(monthEnd),
  });
}

export function useMessPayments(messId: string) {
  return useQuery({
    queryKey: messKeys.payments(messId),
    queryFn: () => svc.fetchMessPayments(messId),
    enabled: Boolean(messId),
  });
}

export function useSettlement(messId: string, monthStart: string) {
  return useQuery({
    queryKey: messKeys.settlement(messId, monthStart),
    queryFn: () => svc.fetchSettlement(messId, monthStart),
    enabled: Boolean(messId) && Boolean(monthStart),
  });
}

export function useMessAnnouncements(messId: string) {
  return useQuery({
    queryKey: messKeys.announcements(messId),
    queryFn: () => svc.fetchMessAnnouncements(messId),
    enabled: Boolean(messId),
    staleTime: 30_000,
  });
}

export function useAuditLogs(messId: string) {
  return useQuery({
    queryKey: messKeys.auditLogs(messId),
    queryFn: () => svc.fetchAuditLogs(messId),
    enabled: Boolean(messId),
    staleTime: 30_000,
  });
}

export function useMemberDashboard(messId: string) {
  return useQuery({
    queryKey: messKeys.dashboard(messId),
    queryFn: () => svc.fetchMemberDashboard(messId),
    enabled: Boolean(messId),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateMess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMessInput) => svc.createMess(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messKeys.myMesses() });
    },
  });
}

export function useJoinMess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messId, inviteCode }: { messId: string; inviteCode?: string }) =>
      svc.joinMess(messId, inviteCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messKeys.myMesses() });
    },
  });
}

export function useRespondJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, messId, action }: { memberId: string; messId: string; action: 'accept' | 'reject' }) =>
      svc.respondJoinRequest(memberId, messId, action),
    onSuccess: (_, { messId }) => {
      qc.invalidateQueries({ queryKey: messKeys.members(messId) });
      qc.invalidateQueries({ queryKey: messKeys.myMesses() });
    },
  });
}

export function useLeaveMess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, messId }: { memberId: string; messId: string }) =>
      svc.leaveMess(memberId, messId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messKeys.myMesses() });
    },
  });
}

export function useToggleMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MealToggleInput) => svc.toggleMeal(input),
    onSuccess: (_, { mess_id, meal_date }) => {
      qc.invalidateQueries({ queryKey: messKeys.todayMeals(mess_id, meal_date) });
      qc.invalidateQueries({ queryKey: messKeys.mealCalendar(mess_id, meal_date, meal_date) });
    },
  });
}

export function useRequestExchange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExchangeRequestInput) => svc.requestExchange(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messKeys.all });
    },
  });
}

export function useRespondExchange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exchangeId, action, note }: { exchangeId: string; action: 'accept' | 'reject'; note?: string }) =>
      svc.respondExchange(exchangeId, action, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messKeys.all });
    },
  });
}

export function useAddBazarPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BazarPurchaseInput) => svc.addBazarPurchase(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messKeys.all });
    },
  });
}

export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => svc.addExpense(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messKeys.all });
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentInput) => svc.recordPayment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messKeys.all });
    },
  });
}

export function useGenerateSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messId, monthStart, monthEnd }: { messId: string; monthStart: string; monthEnd: string }) =>
      svc.generateSettlement(messId, monthStart, monthEnd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messKeys.all });
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AnnouncementInput) => svc.createAnnouncement(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messKeys.all });
    },
  });
}
