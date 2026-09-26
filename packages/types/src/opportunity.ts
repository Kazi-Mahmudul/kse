/**
 * Opportunity domain types.
 *
 * Mirrors the single `opportunities` table design (CLAUDE.md §8) — one table
 * with a `type` discriminator instead of per-subtype tables.
 */

export const OPPORTUNITY_TYPES = [
  'internship',
  'scholarship',
  'workshop',
  'event',
  'mentorship',
  'tolet',
] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

/** Content workflow statuses (CLAUDE.md §21). */
export const OPPORTUNITY_STATUSES = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'expired',
  'archived',
] as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const OPPORTUNITY_MODES = ['remote', 'onsite', 'hybrid'] as const;

export type OpportunityMode = (typeof OPPORTUNITY_MODES)[number];

/** Internship engagement type (spec 06._internship_hub_kse). */
export const OPPORTUNITY_INTERNSHIP_TYPES = [
  'full_time',
  'part_time',
  'contract',
  'unpaid',
] as const;

export type OpportunityInternshipType =
  (typeof OPPORTUNITY_INTERNSHIP_TYPES)[number];

/** Eligible study level — mainly scholarships (spec §6). */
export const DEGREE_LEVELS = ['undergraduate', 'masters', 'phd', 'diploma'] as const;

export type DegreeLevel = (typeof DEGREE_LEVELS)[number];

/** Funding coverage — mainly scholarships (spec §6). */
export const FUNDING_TYPES = ['full', 'partial', 'tuition_waiver', 'stipend'] as const;

export type FundingType = (typeof FUNDING_TYPES)[number];

/** Event sub-type — used by the Events Hub chips (spec 08._events_kse). */
export const EVENT_TYPES = ['workshop', 'seminar', 'hackathon', 'meetup'] as const;

export type EventType = (typeof EVENT_TYPES)[number];

// ── Bachelor To-Let sub-types ──────────────────────────────────────────────

/** Bachelor To-Let room types (mirrors public.tolet_room_type). */
export const TOLET_ROOM_TYPES = [
  'single',
  'shared',
  'sublet',
  'mess_sublet',
  'studio',
  'family',
] as const;

export type ToletRoomType = (typeof TOLET_ROOM_TYPES)[number];

/** Bachelor To-Let gender preference for tenants. */
export const TOLET_GENDER_PREFERENCES = ['any', 'male_only', 'female_only'] as const;

export type ToletGenderPreference = (typeof TOLET_GENDER_PREFERENCES)[number];

/**
 * Operational availability of a published Bachelor To-Let listing. Distinct
 * from `OpportunityStatus`, which is the moderation workflow gate. A listing
 * can be `status='published'` AND `listing_status='full'` — it's still live,
 * just no longer accepting tenants.
 */
export const TOLET_LISTING_STATUSES = [
  'available',
  'almost_full',
  'full',
  'unavailable',
] as const;

export type ToletListingStatus = (typeof TOLET_LISTING_STATUSES)[number];

/**
 * Full opportunity row as stored in the `opportunities` table.
 * Use `OpportunitySummary` for list/card payloads (CLAUDE.md §33).
 */
export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  organization_name: string;
  summary: string | null;
  description: string | null;
  image_url: string | null;
  location: string | null;
  opportunity_mode: OpportunityMode | null;
  eligibility: string | null;
  application_url: string | null;
  deadline: string | null;
  /**
   * Free-text deadline description for opportunities whose apply-by window is
   * prose ("Annual; check current call"). Read when `deadline` is NULL.
   */
  deadline_note: string | null;
  degree_level: DegreeLevel | null;
  funding_type: FundingType | null;
  country: string | null;
  category_id: string | null;
  published_at: string | null;
  status: OpportunityStatus;
  featured: boolean;
  verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  source_name: string | null;
  source_url: string | null;
  // Internship-only fields (spec 06._internship_hub_kse).
  stipend_amount: number | null;
  stipend_currency: string | null;
  internship_type: OpportunityInternshipType | null;
  // Event-only fields (spec 08._events_kse).
  event_type: EventType | null;
  starts_at: string | null;
  // Bachelor To-Let fields (spec bachelor-to-let).
  rent_amount: number | null;
  rent_currency: string | null;
  room_type: ToletRoomType | null;
  gender_preference: ToletGenderPreference | null;
  available_from: string | null;
  bachelor_friendly: boolean;
  landlord_phone: string | null;
  whatsapp: string | null;
  contact_email: string | null;
  listing_status: ToletListingStatus;
  image_urls: string[];
  city: string | null;
  area: string | null;
  floor: number | null;
  total_rooms: number | null;
  available_rooms: number | null;
  utilities_included: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Lightweight shape for list screens — omits the full description. */
export interface OpportunitySummary {
  id: string;
  type: OpportunityType;
  title: string;
  organization_name: string;
  summary: string | null;
  image_url: string | null;
  location: string | null;
  opportunity_mode: OpportunityMode | null;
  deadline: string | null;
  /** Free-text deadline note (shown on cards when `deadline` is NULL). */
  deadline_note: string | null;
  category_id: string | null;
  status: OpportunityStatus;
  featured: boolean;
  verified: boolean;
  // Internship-only fields (spec 06._internship_hub_kse).
  stipend_amount: number | null;
  stipend_currency: string | null;
  internship_type: OpportunityInternshipType | null;
  // Scholarship-only fields (spec 07._scholarship_hub_kse).
  degree_level: DegreeLevel | null;
  funding_type: FundingType | null;
  country: string | null;
  // Event-only fields (spec 08._events_kse).
  event_type: EventType | null;
  starts_at: string | null;
  // Bachelor To-Let fields (spec bachelor-to-let).
  rent_amount: number | null;
  rent_currency: string | null;
  room_type: ToletRoomType | null;
  gender_preference: ToletGenderPreference | null;
  listing_status: ToletListingStatus;
  image_urls: string[];
  city: string | null;
  area: string | null;
  available_rooms: number | null;
  total_rooms: number | null;
  utilities_included: boolean;
  bachelor_friendly: boolean;
}
