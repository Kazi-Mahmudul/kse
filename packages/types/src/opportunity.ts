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
  category_id: string | null;
  published_at: string | null;
  status: OpportunityStatus;
  featured: boolean;
  verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  source_name: string | null;
  source_url: string | null;
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
  category_id: string | null;
  status: OpportunityStatus;
  featured: boolean;
  verified: boolean;
}
