-- ============================================================
-- Student Hub — extend shared enum types
-- Migration: 20260929120100_student_hub_target_types.sql
--
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block with
-- other DDL in some clients, so these live in their own migration
-- (same pattern as 20260926000026/000027 for tolet).
-- ============================================================

alter type public.notification_type add value if not exists 'hub_listing_approved';
alter type public.notification_type add value if not exists 'hub_listing_rejected';
alter type public.notification_type add value if not exists 'research_request';
alter type public.notification_type add value if not exists 'research_request_response';
alter type public.notification_type add value if not exists 'book_contact';

alter type public.report_target_type add value if not exists 'student_hub_listing';
alter type public.report_target_type add value if not exists 'book_listing';
alter type public.report_target_type add value if not exists 'research_profile';
