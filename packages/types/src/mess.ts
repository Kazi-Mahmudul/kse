/**
 * Mess Management System — Shared TypeScript Types
 * Mirrors the DB enums and tables from supabase/migrations/
 */

// ============================================================
// Enums (matching PostgreSQL enums)
// ============================================================

export const MESS_MEMBER_STATUSES = ['pending', 'active', 'left', 'removed'] as const;
export type MessMemberStatus = (typeof MESS_MEMBER_STATUSES)[number];

export const MESS_ROLES = ['member', 'manager'] as const;
export type MessRole = (typeof MESS_ROLES)[number];

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_STATES = ['on', 'off'] as const;
export type MealState = (typeof MEAL_STATES)[number];

export const MESS_EXPENSE_CATEGORIES = [
  'rent', 'gas', 'electricity', 'water', 'wifi',
  'cleaning', 'maintenance', 'furniture', 'other',
] as const;
export type MessExpenseCategory = (typeof MESS_EXPENSE_CATEGORIES)[number];

export const BAZAR_CATEGORIES = [
  'rice', 'fish', 'meat', 'vegetables', 'grocery',
  'oil', 'spices', 'eggs', 'milk', 'snacks', 'cleaning', 'other',
] as const;
export type BazarCategory = (typeof BAZAR_CATEGORIES)[number];

export const PAYMENT_METHODS = ['cash', 'bank', 'mobile_banking', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['pending', 'confirmed', 'rejected'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const EXCHANGE_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type ExchangeStatus = (typeof EXCHANGE_STATUSES)[number];

export const SETTLEMENT_STATUSES = ['draft', 'published', 'locked'] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const MESS_AUDIT_ACTIONS = [
  'member_joined', 'member_accepted', 'member_rejected', 'member_left', 'member_removed',
  'meal_modified_after_cutoff', 'meal_locked',
  'bazar_entry_added', 'bazar_entry_modified', 'bazar_entry_deleted',
  'expense_added', 'expense_modified', 'expense_deleted',
  'payment_recorded', 'payment_confirmed', 'payment_rejected',
  'exchange_requested', 'exchange_accepted', 'exchange_rejected', 'exchange_override',
  'settlement_generated', 'settlement_published', 'settlement_locked', 'settlement_corrected',
  'settings_changed', 'duty_schedule_changed',
  'announcement_created', 'announcement_updated', 'announcement_deleted',
] as const;
export type MessAuditAction = (typeof MESS_AUDIT_ACTIONS)[number];

// ============================================================
// Database Row Types
// ============================================================

export interface Mess {
  id: string;
  code: string;
  name: string;
  location: string | null;
  address: string | null;
  description: string | null;
  max_members: number;
  manager_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface MessMember {
  id: string;
  mess_id: string;
  user_id: string;
  role: MessRole;
  status: MessMemberStatus;
  joined_at: string | null;
  left_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessInvite {
  id: string;
  mess_id: string;
  invite_code: string;
  created_by: string;
  invited_user_id: string | null;
  expires_at: string;
  max_uses: number;
  use_count: number;
  is_active: boolean;
  created_at: string;
}

export interface MealCutoffSettings {
  id: string;
  mess_id: string;
  breakfast_cutoff_minutes: number;
  lunch_cutoff_minutes: number;
  dinner_cutoff_minutes: number;
  breakfast_cutoff_time: string | null;
  lunch_cutoff_time: string | null;
  dinner_cutoff_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealRecord {
  id: string;
  mess_id: string;
  user_id: string;
  meal_date: string;  // DATE in DB, ISO string on wire
  meal_type: MealType;
  state: MealState;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface BazarDuty {
  id: string;
  mess_id: string;
  user_id: string;
  duty_date: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  /** Joined profile — present when queried with user relation */
  user?: { full_name?: string; avatar_url?: string | null } | null;
}

export interface BazarExchangeRequest {
  id: string;
  mess_id: string;
  requester_id: string;
  requester_duty_date: string;
  requester_duty_id: string;
  target_id: string;
  target_duty_date: string;
  target_duty_id: string;
  status: ExchangeStatus;
  requested_at: string;
  responded_at: string | null;
  responded_by: string | null;
  response_note: string | null;
  requester_original_duty_date: string;
  target_original_duty_date: string;
  created_at: string;
}

export interface BazarPurchase {
  id: string;
  mess_id: string;
  buyer_id: string;
  purchase_date: string;
  total_amount: number;  // In paisa (BIGINT in DB)
  notes: string | null;
  receipt_url: string | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BazarPurchaseItem {
  id: string;
  purchase_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;   // In paisa
  total_price: number; // In paisa
  category: BazarCategory;
  created_at: string;
}

export interface MessExpense {
  id: string;
  mess_id: string;
  paid_by: string;
  category: MessExpenseCategory;
  amount: number;      // In paisa
  expense_date: string;
  description: string | null;
  receipt_url: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  /** Joined profile — present when queried with paid_by_profile relation */
  paid_by_profile?: { full_name?: string } | null;
}

export interface MessPayment {
  id: string;
  mess_id: string;
  member_id: string;
  amount: number;      // In paisa
  payment_date: string;
  payment_method: PaymentMethod;
  reference: string | null;
  note: string | null;
  status: PaymentStatus;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  recorded_by: string | null;
  /** Joined profile — present when queried with member relation */
  member?: { full_name?: string } | null;
}

export interface MonthlySettlement {
  id: string;
  mess_id: string;
  month_start: string;
  month_end: string;
  total_meal_cost: number;   // In paisa
  total_meals: number;
  meal_rate: number;         // In paisa per meal
  status: SettlementStatus;
  generated_at: string | null;
  generated_by: string | null;
  published_at: string | null;
  locked_at: string | null;
  locked_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementItem {
  id: string;
  settlement_id: string;
  member_id: string;
  total_meals: number;
  meal_cost: number;          // In paisa
  bazar_contribution: number; // In paisa
  shared_expense_share: number; // In paisa
  total_cost: number;         // In paisa
  total_payments: number;     // In paisa
  balance: number;            // In paisa (positive = due, negative = receivable)
  balance_type: 'due' | 'receivable' | 'settled';
  created_at: string;
  /** Joined profile — present when queried with member relation */
  member?: { full_name?: string } | null;
}

export interface MessAnnouncement {
  id: string;
  mess_id: string;
  title: string;
  content: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface MessAuditLog {
  id: string;
  mess_id: string;
  actor_id: string;
  actor_name: string | null;
  action: MessAuditAction;
  entity_type: string;
  entity_id: string | null;
  description: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================================
// Composite / View Types
// ============================================================

/** Full mess detail including manager info */
export interface MessDetail extends Mess {
  manager_name?: string;
  member_count?: number;
  pending_count?: number;
}

/** Mess entry in the user's mess list — includes role/status from mess_members join */
export interface MyMessItem extends MessDetail {
  role: MessRole;
  status: MessMemberStatus;
}

/** Mess member with profile info */
export interface MessMemberDetail extends MessMember {
  user_name?: string;
  user_avatar_url?: string | null;
  user_phone?: string | null;
  meal_stats?: {
    total_meals: number;
    total_breakfast: number;
    total_lunch: number;
    total_dinner: number;
  };
  bazar_contribution?: number; // In paisa
  current_balance?: number;    // In paisa
}

/** Daily meal summary for a single day */
export interface DailyMealSummary {
  date: string;
  breakfast: { on: number; off: number };
  lunch: { on: number; off: number };
  dinner: { on: number; off: number };
  total_meals: number;
}

/** Member's meal calendar entry */
export interface MealCalendarEntry {
  date: string;
  breakfast: MealState | null;
  lunch: MealState | null;
  dinner: MealState | null;
  total: number;
}

/** Bazar purchase with items and buyer info */
export interface BazarPurchaseDetail extends BazarPurchase {
  buyer_name?: string;
  items: BazarPurchaseItem[];
}

/** Exchange request with names */
export interface ExchangeRequestDetail extends BazarExchangeRequest {
  requester_name?: string;
  target_name?: string;
  requester_duty?: BazarDuty;
  target_duty?: BazarDuty;
}

/** Settlement with all member items */
export interface SettlementDetail extends MonthlySettlement {
  items: SettlementItem[];
}

/** Dashboard summary for a member */
export interface MemberDashboard {
  mess: Mess;
  today_meals: { breakfast: MealState; lunch: MealState; dinner: MealState };
  current_month_meals: number;
  my_next_duty: BazarDuty | null;
  my_bazar_contribution: number;  // In paisa
  current_meal_rate: number;      // In paisa
  my_balance: number;             // In paisa
  my_balance_type: 'due' | 'receivable' | 'settled';
  announcements: MessAnnouncement[];
}

/** Dashboard summary for a manager */
export interface ManagerDashboard {
  mess: Mess;
  active_members: number;
  today_total_meals: number;
  current_month_meals: number;
  total_bazar: number;            // In paisa
  total_other_expenses: number;   // In paisa
  current_meal_rate: number;      // In paisa
  total_dues: number;             // In paisa
  total_receivables: number;      // In paisa
  pending_exchanges: number;
  month_status: SettlementStatus;
  announcements: MessAnnouncement[];
}

// ============================================================
// API / Form Input Types
// ============================================================

export interface CreateMessInput {
  name: string;
  location?: string;
  address?: string;
  description?: string;
  max_members?: number;
}

export interface UpdateMessInput extends Partial<CreateMessInput> {
  is_active?: boolean;
}

export interface MealToggleInput {
  mess_id: string;
  meal_date: string;
  meal_type: MealType;
  state: MealState;
}

export interface BazarPurchaseInput {
  mess_id: string;
  purchase_date: string;
  notes?: string;
  receipt_url?: string;
  items: {
    item_name: string;
    quantity: number;
    unit: string;
    unit_price: number;  // In paisa
    category: BazarCategory;
  }[];
}

export interface ExpenseInput {
  mess_id: string;
  paid_by: string;
  category: MessExpenseCategory;
  amount: number;       // In paisa
  expense_date: string;
  description?: string;
  receipt_url?: string;
  is_shared?: boolean;
}

export interface PaymentInput {
  mess_id: string;
  member_id: string;
  amount: number;        // In paisa
  payment_date: string;
  payment_method: PaymentMethod;
  reference?: string;
  note?: string;
}

export interface ExchangeRequestInput {
  mess_id: string;
  requester_duty_id: string;
  target_id: string;
  target_duty_id: string;
}

export interface AnnouncementInput {
  mess_id: string;
  title: string;
  content: string;
  is_active?: boolean;
  expires_at?: string;
}

// ============================================================
// Utility Types
// ============================================================

/** Amount in paisa converted to BDT string for display */
export function paisaToBdt(paisa: number): string {
  return `৳${(paisa / 100).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`;
}

/** BDT string (user input) to paisa */
export function bdtToPaisa(bdtString: string): number {
  const cleaned = bdtString.replace(/[৳,\s]/g, '');
  return Math.round(parseFloat(cleaned) * 100);
}

/** Balance type from numeric balance */
export function getBalanceType(balance: number): 'due' | 'receivable' | 'settled' {
  if (balance > 0) return 'due';
  if (balance < 0) return 'receivable';
  return 'settled';
}
