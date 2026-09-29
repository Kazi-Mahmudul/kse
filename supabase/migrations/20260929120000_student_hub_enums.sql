-- ============================================================
-- Student Hub — enum types
-- Migration: 20260929120000_student_hub_enums.sql
-- Idempotent: partial applications are safe to re-run.
-- ============================================================

-- Workflow status for directory listings (spec student-hub §20).
do $$ begin
  create type public.hub_listing_status as enum (
    'draft', 'pending_review', 'published', 'rejected', 'suspended', 'archived'
  );
exception when duplicate_object then null; end $$;

-- What kind of local service a listing represents (drives per-type UI).
do $$ begin
  create type public.hub_service_type as enum (
    'laundry', 'electrician', 'plumber', 'ac_technician', 'fan_repair',
    'repair_other', 'parking', 'bookshop', 'library',
    'restaurant', 'cafe', 'shop', 'other'
  );
exception when duplicate_object then null; end $$;

-- How a price note should be labelled (spec student-hub §12).
do $$ begin
  create type public.hub_price_type as enum ('fixed', 'starting_from', 'approximate');
exception when duplicate_object then null; end $$;

-- Student discount offers attached to listings (spec student-hub §15).
do $$ begin
  create type public.hub_offer_kind as enum ('percent', 'amount', 'other');
exception when duplicate_object then null; end $$;

-- Book Exchange Corner (spec student-hub §10).
do $$ begin
  create type public.book_condition as enum ('new', 'like_new', 'good', 'fair');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.book_intent as enum ('exchange', 'sell', 'give_away');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.book_listing_status as enum (
    'active', 'reserved', 'exchanged', 'sold', 'removed'
  );
exception when duplicate_object then null; end $$;

-- Research Partner Matching (spec student-hub §11).
do $$ begin
  create type public.research_collaboration_type as enum (
    'partner', 'group', 'mentorship', 'any'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.research_profile_status as enum ('active', 'hidden');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.research_request_status as enum ('pending', 'accepted', 'declined');
exception when duplicate_object then null; end $$;
