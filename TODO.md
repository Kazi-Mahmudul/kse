# TODO — KSE Mess Management System

> Last updated: 2026-09-28 (evening)

---

## ✅ Completed (as of 2026-09-28 evening)

### Database & Backend
- [x] All 8 migration files created (enums, core, meals, bazar, financial, support, storage, helpers)
- [x] All RLS policies implemented
- [x] `mess-actions` Edge Function with all operations
- [x] Storage bucket `bazar-receipts` created
- [x] Database indexes created

### Types & Validation
- [x] `packages/types/src/mess.ts` with all types
- [x] `packages/validation/src/mess.ts` with all Zod schemas

### Mobile
- [x] `apps/mobile/src/features/mess/` (service.ts + queries.ts)
- [x] Mess hub screen (`mess/index.tsx`)
- [x] Member dashboard (`mess/[id]/index.tsx`)
- [x] Meal calendar (`mess/[id]/meals/index.tsx`)
- [x] Bazar purchases (`mess/[id]/bazar/index.tsx`)
- [x] Bazar duty (`mess/[id]/duty/index.tsx`)
- [x] Finance (`mess/[id]/finance/index.tsx`)
- [x] Members (`mess/[id]/members/index.tsx`)
- [x] Settlement (`mess/[id]/settlement/index.tsx`)
- [x] Quick Access tile added to home screen

### Admin
- [x] `apps/admin/src/features/mess/actions.ts`
- [x] Mess list page (`apps/admin/src/app/(dashboard)/mess/page.tsx`)
- [x] Mess detail page with 9 tabs (`apps/admin/src/app/(dashboard)/mess/[id]/page.tsx`)
- [x] Sidebar nav updated

### TypeScript
- [x] All mobile mess screens TypeScript-clean (types, validation, admin all pass)

## 🔴 High Priority

### Database & Backend
- [ ] Create `messes` table migration — `supabase/migrations/YYYYMMDDHHMMSS_messes.sql`
- [ ] Create `mess_members` table migration
- [ ] Create `mess_invites` table migration
- [ ] Create `meal_records` table migration
- [ ] Create `meal_cutoff_settings` table migration
- [ ] Create `bazar_duties` table migration
- [ ] Create `bazar_exchange_requests` table migration
- [ ] Create `bazar_purchases` table migration
- [ ] Create `bazar_purchase_items` table migration
- [ ] Create `mess_expenses` table migration
- [ ] Create `mess_payments` table migration
- [ ] Create `monthly_settlements` table migration
- [ ] Create `settlement_items` table migration
- [ ] Create `mess_announcements` table migration
- [ ] Create `mess_audit_logs` table migration
- [ ] Add RLS policies for ALL mess tables (see RLS matrix below)
- [ ] Create Edge Function: `calculate-meal-rate` (server-side, decimal-safe)
- [ ] Create Edge Function: `generate-settlement` (server-side)
- [ ] Create Edge Function: `process-bazar-exchange` (server-side)
- [ ] Add storage bucket for bazar receipts (`bazar-receipts`)
- [ ] Add database indexes for performance (mess_id, date, member_id on all tables)

### Mobile — Core Mess Feature
- [ ] Add `mess` feature directory under `apps/mobile/src/features/`
- [ ] Create `mess` types in `packages/types/src/`
- [ ] Create `mess` Zod schemas in `packages/validation/src/`
- [ ] Add Mess Management tab/screen to mobile navigation (`apps/mobile/src/app/(tabs)/mess/`)
- [ ] Build **Create Mess** screen (`apps/mobile/src/app/(tabs)/mess/create.tsx`)
- [ ] Build **Join Mess** screen (`apps/mobile/src/app/(tabs)/mess/join.tsx`)
- [ ] Build **Mess Dashboard** (today's meals, balance, duty) — member view
- [ ] Build **Meal Calendar** (`apps/mobile/src/app/(tabs)/mess/meals/`) with ON/OFF toggles
- [ ] Implement meal cut-off logic (configurable per meal type, Asia/Dhaka timezone)
- [ ] Build **Bazar Duty** view with upcoming duties
- [ ] Build **Bazar Exchange** request flow
- [ ] Build **Bazar Entry** (add/view purchases) — `apps/mobile/src/app/(tabs)/mess/bazar/`
- [ ] Build **Expenses** view — `apps/mobile/src/app/(tabs)/mess/expenses/`
- [ ] Build **Payment** record screen — `apps/mobile/src/app/(tabs)/mess/payments/`
- [ ] Build **Monthly Settlement** view (transparent breakdown) — `apps/mobile/src/app/(tabs)/mess/settlement/`
- [ ] Build **Mess Settings** (manager only) — `apps/mobile/src/app/(tabs)/mess/settings/`

### Admin Panel — Mess Management
- [ ] Add `mess` feature directory under `apps/admin/src/features/`
- [ ] Add Mess Management section to admin sidebar navigation
- [ ] Build **Mess Dashboard** (`apps/admin/src/app/(dashboard)/mess/`)
- [ ] Build **Members** management panel (accept/reject/invite/remove)
- [ ] Build **Meals** management panel (view daily/monthly stats, lock month)
- [ ] Build **Bazar** management panel (CRUD entries, filter, receipts)
- [ ] Build **Bazar Duty** schedule management
- [ ] Build **Bazar Exchange** approval interface
- [ ] Build **Expenses** management panel
- [ ] Build **Payments** management panel
- [ ] Build **Monthly Settlement** generation & lock interface
- [ ] Build **Reports** (CSV export: member-wise meals, bazar, expenses)
- [ ] Build **Announcements** management
- [ ] Build **Audit History** viewer
- [ ] Build **Mess Settings** (cut-off times, categories, defaults)

## 🟡 Medium Priority

### Mobile UX
- [ ] Build **Bazar Duty** detail screen with exchange button
- [ ] Build **Bazar Entry** form with itemized entries and receipt upload
- [ ] Build **Bazar Exchange** notification & accept/reject flow
- [ ] Build **Announcements** banner on mess dashboard
- [ ] Add loading/empty/error states for all mess screens
- [ ] Support light + dark mode on all mess screens

### Validation & Business Rules
- [ ] Validate meal ON/OFF: only allow future changes after cut-off
- [ ] Validate bazar exchange: only active members, future duties, same mess
- [ ] Validate expense: non-negative amounts, valid category
- [ ] Validate payment: non-negative amount, valid member
- [ ] Prevent duplicate exchange requests (idempotency check)
- [ ] Prevent negative/invalid amounts across all financial tables

### Notifications
- [ ] Hook meal cut-off reminder into existing notification system
- [ ] Hook bazar duty tomorrow reminder
- [ ] Hook bazar exchange request/accept/reject notifications
- [ ] Hook monthly settlement published notification
- [ ] Hook member added/removed notification

## 🟢 Low Priority / Polish
- [ ] Optimize meal calendar: fetch only needed date range, not full month
- [ ] Add receipt image compression before upload
- [ ] Add pagination to bazar/payment/expense lists
- [ ] Debounced search on member lists
- [ ] Verify all forms respect Asia/Dhaka timezone

---

## RLS Policy Matrix

| Table | Member (own) | Member (mess) | Manager | Admin |
|---|---|---|---|---|
| messes | read own | read all | read/write own | read/write all |
| mess_members | read own | read all | read/write own | read/write all |
| mess_invites | read own | read | write own | read/write all |
| meal_records | read/write own | read | read/write all | read/write all |
| meal_cutoff_settings | read | read | write | read/write all |
| bazar_duties | read own | read all | read/write | read/write all |
| bazar_exchange_requests | read/write own | read all | read/write all | read/write all |
| bazar_purchases | read/write own | read | read/write all | read/write all |
| mess_expenses | read | read all | read/write all | read/write all |
| mess_payments | read own | read all | read/write all | read/write all |
| monthly_settlements | read own | read all | write | read/write all |
| settlement_items | read own | read all | write | read/write all |
| mess_announcements | read | read | read/write | read/write all |
| mess_audit_logs | — | read | read | read/write all |

---

## ✅ Recently Completed
- [x] *(none yet — this is the initial planning phase)*
