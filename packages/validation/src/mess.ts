/**
 * Mess Management — Zod Validation Schemas
 */

import { z } from 'zod';
import {
  MESS_MEMBER_STATUSES,
  MESS_ROLES,
  MEAL_TYPES,
  MEAL_STATES,
  MESS_EXPENSE_CATEGORIES,
  BAZAR_CATEGORIES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  EXCHANGE_STATUSES,
  SETTLEMENT_STATUSES,
} from '@kse/types';

// ============================================================
// Enums as zod enums
// ============================================================

export const MessMemberStatusSchema = z.enum(MESS_MEMBER_STATUSES);
export const MessRoleSchema = z.enum(MESS_ROLES);
export const MealTypeSchema = z.enum(MEAL_TYPES);
export const MealStateSchema = z.enum(MEAL_STATES);
export const MessExpenseCategorySchema = z.enum(MESS_EXPENSE_CATEGORIES);
export const BazarCategorySchema = z.enum(BAZAR_CATEGORIES);
export const PaymentMethodSchema = z.enum(PAYMENT_METHODS);
export const PaymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const ExchangeStatusSchema = z.enum(EXCHANGE_STATUSES);
export const SettlementStatusSchema = z.enum(SETTLEMENT_STATUSES);

// ============================================================
// Mess Schemas
// ============================================================

export const CreateMessSchema = z.object({
  name: z.string().min(1, 'Mess name is required').max(100),
  location: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  max_members: z.number().int().min(2).max(50).default(10),
});

export const UpdateMessSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  location: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  max_members: z.number().int().min(2).max(50).optional(),
  is_active: z.boolean().optional(),
});

// ============================================================
// Meal Schemas
// ============================================================

export const MealToggleSchema = z.object({
  mess_id: z.string().uuid('Invalid mess ID'),
  meal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  meal_type: MealTypeSchema,
  state: MealStateSchema,
});

export const MealCutoffSettingsSchema = z.object({
  mess_id: z.string().uuid('Invalid mess ID'),
  breakfast_cutoff_minutes: z.number().int().min(0).default(30),
  lunch_cutoff_minutes: z.number().int().min(0).default(60),
  dinner_cutoff_minutes: z.number().int().min(0).default(120),
  breakfast_cutoff_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format').nullable().optional(),
  lunch_cutoff_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format').nullable().optional(),
  dinner_cutoff_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format').nullable().optional(),
});

// ============================================================
// Bazar Schemas
// ============================================================

export const BazarPurchaseItemSchema = z.object({
  item_name: z.string().min(1, 'Item name is required').max(200),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(50),
  unit_price: z.number().int().min(0, 'Unit price cannot be negative'),
  category: BazarCategorySchema.default('other'),
});

export const CreateBazarPurchaseSchema = z.object({
  mess_id: z.string().uuid('Invalid mess ID'),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(1000).optional(),
  receipt_url: z.string().url().optional(),
  items: z.array(BazarPurchaseItemSchema).min(1, 'At least one item is required'),
});

export const UpdateBazarPurchaseSchema = z.object({
  notes: z.string().max(1000).optional(),
  receipt_url: z.string().url().optional(),
  is_verified: z.boolean().optional(),
});

export const BazarDutySchema = z.object({
  mess_id: z.string().uuid('Invalid mess ID'),
  user_id: z.string().uuid('Invalid user ID'),
  duty_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

export const BulkBazarDutySchema = z.object({
  mess_id: z.string().uuid('Invalid mess ID'),
  duties: z.array(z.object({
    user_id: z.string().uuid('Invalid user ID'),
    duty_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  })).min(1, 'At least one duty is required'),
});

// ============================================================
// Exchange Schemas
// ============================================================

export const ExchangeRequestSchema = z.object({
  mess_id: z.string().uuid('Invalid mess ID'),
  requester_duty_id: z.string().uuid('Invalid duty ID'),
  target_id: z.string().uuid('Invalid target user ID'),
  target_duty_id: z.string().uuid('Invalid target duty ID'),
});

export const ExchangeResponseSchema = z.object({
  action: z.enum(['accept', 'reject']),
  note: z.string().max(500).optional(),
});

// ============================================================
// Financial Schemas
// ============================================================

export const CreateExpenseSchema = z.object({
  mess_id: z.string().uuid('Invalid mess ID'),
  paid_by: z.string().uuid('Invalid user ID'),
  category: MessExpenseCategorySchema,
  amount: z.number().int().min(0, 'Amount cannot be negative'),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  description: z.string().max(500).optional(),
  receipt_url: z.string().url().optional(),
  is_shared: z.boolean().default(true),
});

export const UpdateExpenseSchema = z.object({
  category: MessExpenseCategorySchema.optional(),
  amount: z.number().int().min(0, 'Amount cannot be negative').optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  description: z.string().max(500).optional(),
  receipt_url: z.string().url().optional(),
  is_shared: z.boolean().optional(),
});

export const CreatePaymentSchema = z.object({
  mess_id: z.string().uuid('Invalid mess ID'),
  member_id: z.string().uuid('Invalid member ID'),
  amount: z.number().int().min(0, 'Amount cannot be negative'),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  payment_method: PaymentMethodSchema.default('cash'),
  reference: z.string().max(200).optional(),
  note: z.string().max(500).optional(),
});

export const UpdatePaymentSchema = z.object({
  status: PaymentStatusSchema.optional(),
  confirmed_by: z.string().uuid().optional(),
});

// ============================================================
// Settlement Schemas
// ============================================================

export const GenerateSettlementSchema = z.object({
  mess_id: z.string().uuid('Invalid mess ID'),
  month_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  month_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(1000).optional(),
});

export const PublishSettlementSchema = z.object({
  settlement_id: z.string().uuid('Invalid settlement ID'),
});

export const LockSettlementSchema = z.object({
  settlement_id: z.string().uuid('Invalid settlement ID'),
});

// ============================================================
// Announcement Schemas
// ============================================================

export const CreateAnnouncementSchema = z.object({
  mess_id: z.string().uuid('Invalid mess ID'),
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(2000),
  is_active: z.boolean().default(true),
  expires_at: z.string().datetime().nullable().optional(),
});

export const UpdateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(2000).optional(),
  is_active: z.boolean().optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

// ============================================================
// Invite Schemas
// ============================================================

export const CreateInviteSchema = z.object({
  mess_id: z.string().uuid('Invalid mess ID'),
  invited_user_id: z.string().uuid('Invalid user ID').optional(),
  max_uses: z.number().int().min(1).default(1),
  expires_in_days: z.number().int().min(1).default(7),
});

export const JoinMessSchema = z.object({
  invite_code: z.string().min(1, 'Invite code is required'),
});

// ============================================================
// Member Management Schemas
// ============================================================

export const UpdateMemberStatusSchema = z.object({
  member_id: z.string().uuid('Invalid member ID'),
  mess_id: z.string().uuid('Invalid mess ID'),
  status: z.enum(['active', 'left', 'removed']),
});

export const ChangeManagerSchema = z.object({
  mess_id: z.string().uuid('Invalid mess ID'),
  new_manager_id: z.string().uuid('Invalid user ID'),
});
