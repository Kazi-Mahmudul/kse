/**
 * Mess Detail Page — Admin View
 * Shows mess details with tabs for members, meals, bazar, expenses, payments, settlement, audit
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getMessById,
  getMessMembers,
  getMessMeals,
  getMessBazar,
  getMessExpenses,
  getMessPayments,
  getPendingExchanges,
  getSettlement,
  getAuditLogs,
  respondMemberRequest,
  removeMember,
} from '@/features/mess/actions';
import { paisaToBdt } from '@kse/types';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; month?: string }>;
}

// Supabase join result types — used where the full @kse/types type isn't available
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecord = Record<string, any>;
type MessMemberRow = { id: string; user?: AnyRecord; status: string; role: string; joined_at: string | null };
type MealRow = { id: string; user?: AnyRecord; meal_date: string; meal_type: string; state: string };
type BazarPurchaseRow = { id: string; buyer?: AnyRecord; purchase_date: string; total_amount: number; items?: AnyRecord[] };
type ExpenseRow = { id: string; expense_date: string; category: string; amount: number; paid_by?: AnyRecord; description?: string };
type PaymentRow = { id: string; member?: AnyRecord; payment_date: string; payment_method: string; status: string; amount: number };
type SettlementItemRow = { id: string; member?: AnyRecord; total_meals: number; meal_cost: number; bazar_contribution: number; shared_expense_share: number; total_payments: number; balance_type: string; balance: number };
type ExchangeRow = { id: string; requester?: AnyRecord; target?: AnyRecord; requester_duty?: AnyRecord; target_duty?: AnyRecord };
type AuditLogRow = { id: string; created_at: string; actor_name?: string; action: string; description: string };
/* eslint-enable @typescript-eslint/no-explicit-any */

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent',
  gas: 'Gas',
  electricity: 'Electricity',
  water: 'Water',
  wifi: 'Wi-Fi',
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
  furniture: 'Furniture',
  other: 'Other',
};

export default async function MessDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = 'overview', month: monthParam } = await searchParams;

  const mess = await getMessById(id);
  if (!mess) notFound();

  const members = await getMessMembers(id);

  // Default to current month
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthStart = monthParam ?? `${year}-${month}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const monthEnd = `${year}-${month}-${lastDay}`;

  const meals = await getMessMeals(id, monthStart, monthEnd);
  const bazar = await getMessBazar(id, monthStart, monthEnd);
  const expenses = await getMessExpenses(id, monthStart, monthEnd);
  const payments = await getMessPayments(id);
  const pendingExchanges = await getPendingExchanges(id);
  const settlement = await getSettlement(id, monthStart);
  const auditLogs = await getAuditLogs(id, 50);

  const activeMembers = members?.filter((m: MessMemberRow) => m.status === 'active') ?? [];
  const pendingMembers = members?.filter((m: MessMemberRow) => m.status === 'pending') ?? [];

  const totalBazar = bazar?.reduce((sum: number, p: BazarPurchaseRow) => sum + (p.total_amount ?? 0), 0) ?? 0;
  const totalExpenses = expenses?.reduce((sum: number, e: ExpenseRow) => sum + (e.amount ?? 0), 0) ?? 0;
  const totalPayments = payments?.reduce((sum: number, p: PaymentRow) => sum + (p.amount ?? 0), 0) ?? 0;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'members', label: 'Members' },
    { key: 'meals', label: 'Meals' },
    { key: 'bazar', label: 'Bazar' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'payments', label: 'Payments' },
    { key: 'settlement', label: 'Settlement' },
    { key: 'exchanges', label: 'Exchanges' },
    { key: 'audit', label: 'Audit Log' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/mess" className="text-sm text-zinc-500 hover:text-zinc-700">
            ← Back to Messes
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">{mess.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500">
            {mess.location && <span>{mess.location}</span>}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono">
              {mess.code}
            </code>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              mess.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'
            }`}>
              {mess.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">Manager</p>
          <p className="font-medium">{mess.manager?.full_name ?? 'Unknown'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200">
        <nav className="-mb-px flex gap-4">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/mess/${id}?tab=${t.key}`}
              className={`border-b-2 px-1 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {tab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-medium text-zinc-500">Active Members</h3>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{activeMembers.length}</p>
              <p className="mt-1 text-sm text-zinc-500">of {mess.max_members} max</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-medium text-zinc-500">Month: {monthStart}</h3>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{paisaToBdt(totalBazar)}</p>
              <p className="mt-1 text-sm text-zinc-500">Total bazar</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-medium text-zinc-500">Month: {monthStart}</h3>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{paisaToBdt(totalExpenses)}</p>
              <p className="mt-1 text-sm text-zinc-500">Shared expenses</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-medium text-zinc-500">Pending Members</h3>
              <p className="mt-2 text-3xl font-bold text-yellow-600">{pendingMembers.length}</p>
              {pendingMembers.length > 0 && (
                <p className="mt-1 text-sm text-zinc-500">Need approval</p>
              )}
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-medium text-zinc-500">Pending Exchanges</h3>
              <p className="mt-2 text-3xl font-bold text-blue-600">{pendingExchanges?.length ?? 0}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-medium text-zinc-500">Meal Rate</h3>
              <p className="mt-2 text-3xl font-bold text-indigo-600">
                {settlement ? paisaToBdt(settlement.meal_rate) : '—'}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {settlement ? `${settlement.total_meals} meals` : 'No settlement'}
              </p>
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-6">
            {/* Pending Members */}
            {pendingMembers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 mb-3">Pending Requests</h2>
                <div className="space-y-3">
                  {pendingMembers.map((member: MessMemberRow) => (
                    <div key={member.id} className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                      <div>
                        <p className="font-medium">{member.user?.full_name ?? 'Unknown'}</p>
                        <p className="text-sm text-zinc-500">{member.user?.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <form action={respondMemberRequest.bind(null, member.id, id, 'accept')}>
                          <button className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">
                            Accept
                          </button>
                        </form>
                        <form action={respondMemberRequest.bind(null, member.id, id, 'reject')}>
                          <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
                            Reject
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Members */}
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 mb-3">Active Members ({activeMembers.length})</h2>
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Role</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Joined</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {activeMembers.map((member: MessMemberRow) => (
                      <tr key={member.id}>
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                          {member.user?.full_name ?? 'Unknown'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-zinc-500">
                          {member.user?.email ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            member.role === 'manager' ? 'bg-indigo-100 text-indigo-700' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-zinc-500">
                          {member.joined_at ? new Date(member.joined_at).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm">
                          {member.role !== 'manager' && (
                            <form action={removeMember.bind(null, member.id, id)}>
                              <button className="text-red-600 hover:text-red-800">
                                Remove
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'meals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Meal Records — {monthStart}</h2>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Member</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Meal</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {meals?.slice(0, 100).map((meal: MealRow) => (
                    <tr key={meal.id}>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-zinc-600">
                        {meal.meal_date}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                        {meal.user?.full_name ?? 'Unknown'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm capitalize text-zinc-600">
                        {meal.meal_type}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          meal.state === 'on' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {meal.state.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!meals || meals.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                        No meal records for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'bazar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Bazar Purchases — {monthStart}</h2>
              <div className="text-right">
                <p className="text-sm text-zinc-500">Total</p>
                <p className="text-xl font-bold text-green-600">{paisaToBdt(totalBazar)}</p>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Buyer</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Items</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {bazar?.map((purchase: BazarPurchaseRow) => (
                    <tr key={purchase.id}>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-zinc-600">
                        {purchase.purchase_date}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                        {purchase.buyer?.full_name ?? 'Unknown'}
                      </td>
                      <td className="px-4 py-2 text-sm text-zinc-600">
                        {purchase.items?.length ?? 0} items
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-green-700">
                        {paisaToBdt(purchase.total_amount)}
                      </td>
                    </tr>
                  ))}
                  {(!bazar || bazar.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                        No bazar purchases for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Shared Expenses — {monthStart}</h2>
              <div className="text-right">
                <p className="text-sm text-zinc-500">Total</p>
                <p className="text-xl font-bold text-red-600">{paisaToBdt(totalExpenses)}</p>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Paid By</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {expenses?.map((expense: ExpenseRow) => (
                    <tr key={expense.id}>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-zinc-600">
                        {expense.expense_date}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 capitalize">
                          {EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-zinc-600">
                        {expense.description ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-zinc-600">
                        {expense.paid_by?.full_name ?? 'Unknown'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-red-700">
                        {paisaToBdt(expense.amount)}
                      </td>
                    </tr>
                  ))}
                  {(!expenses || expenses.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                        No expenses for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Payments</h2>
              <div className="text-right">
                <p className="text-sm text-zinc-500">Total Confirmed</p>
                <p className="text-xl font-bold text-green-600">{paisaToBdt(totalPayments)}</p>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Member</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Method</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {payments?.map((payment: PaymentRow) => (
                    <tr key={payment.id}>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-zinc-600">
                        {payment.payment_date}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                        {payment.member?.full_name ?? 'Unknown'}
                      </td>
                      <td className="px-4 py-2 text-sm text-zinc-600 capitalize">
                        {payment.payment_method.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          payment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-green-700">
                        +{paisaToBdt(payment.amount)}
                      </td>
                    </tr>
                  ))}
                  {(!payments || payments.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                        No payments recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'settlement' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Monthly Settlement — {monthStart}</h2>
              {!settlement && (
                <form action={generateSettlementAction.bind(null, id, monthStart, monthEnd)}>
                  <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                    Generate Settlement
                  </button>
                </form>
              )}
            </div>

            {settlement ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <div>
                    <p className="text-sm text-zinc-500">Status</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      settlement.status === 'locked' ? 'bg-zinc-200 text-zinc-600' :
                      settlement.status === 'published' ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {settlement.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500">Meal Rate</p>
                    <p className="text-xl font-bold text-indigo-600">{paisaToBdt(settlement.meal_rate)}/meal</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500">Total Meals</p>
                    <p className="text-xl font-bold">{settlement.total_meals}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500">Total Cost</p>
                    <p className="text-xl font-bold text-zinc-900">{paisaToBdt(settlement.total_meal_cost)}</p>
                  </div>
                </div>

                {settlement.status !== 'locked' && (
                  <div className="flex gap-2">
                    {settlement.status === 'draft' && (
                      <form action={publishSettlementAction.bind(null, settlement.id, id)}>
                        <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                          Publish Settlement
                        </button>
                      </form>
                    )}
                    {settlement.status === 'published' && (
                      <form action={lockSettlementAction.bind(null, settlement.id, id)}>
                        <button className="rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                          Lock Settlement
                        </button>
                      </form>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                  <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Member</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-zinc-500">Meals</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-zinc-500">Meal Cost</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-zinc-500">Bazar</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-zinc-500">Shared</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-zinc-500">Payments</th>
                        <th className="px-4 py-2 text-right text-xs font-medium uppercase text-zinc-500">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {settlement.items?.map((item: SettlementItemRow) => (
                        <tr key={item.id}>
                          <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                            {item.member?.full_name ?? 'Unknown'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-right">
                            {item.total_meals}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-right">
                            {paisaToBdt(item.meal_cost)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-right">
                            {paisaToBdt(item.bazar_contribution)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-right">
                            {paisaToBdt(item.shared_expense_share)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-sm text-right text-green-600">
                            -{paisaToBdt(item.total_payments)}
                          </td>
                          <td className={`whitespace-nowrap px-4 py-2 text-sm text-right font-medium ${
                            item.balance_type === 'due' ? 'text-red-600' :
                            item.balance_type === 'receivable' ? 'text-green-600' :
                            'text-zinc-600'
                          }`}>
                            {paisaToBdt(Math.abs(item.balance))}
                            {item.balance_type !== 'settled' && (
                              <span className="ml-1 text-xs">({item.balance_type})</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
                <p className="text-zinc-500">No settlement generated for this month</p>
              </div>
            )}
          </div>
        )}

        {tab === 'exchanges' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Pending Exchange Requests ({pendingExchanges?.length ?? 0})</h2>
            {pendingExchanges?.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
                <p className="text-zinc-500">No pending exchange requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingExchanges?.map((exchange: ExchangeRow) => (
                  <div key={exchange.id} className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {exchange.requester?.full_name} ↔ {exchange.target?.full_name}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {exchange.requester_duty?.duty_date} ↔ {exchange.target_duty?.duty_date}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'audit' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Audit Log</h2>
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">When</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Actor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Action</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {auditLogs?.map((log: AuditLogRow) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-zinc-500">
                        {new Date(log.created_at).toLocaleString('en-GB')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                        {log.actor_name ?? 'System'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className="inline-flex rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-zinc-600">
                        {log.description}
                      </td>
                    </tr>
                  ))}
                  {(!auditLogs || auditLogs.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                        No audit logs yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
