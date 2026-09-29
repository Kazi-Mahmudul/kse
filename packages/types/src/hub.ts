/**
 * Student Hub types (spec student-hub §26).
 *
 * The DB enums are the source of truth — these union literals, value
 * arrays and interfaces mirror them for the mobile app and admin panel.
 */

// ── Enum unions + value arrays ───────────────────────────────────────────────

export type HubListingStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'suspended'
  | 'archived';

export const HUB_LISTING_STATUSES: readonly HubListingStatus[] = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'suspended',
  'archived',
];

export type HubServiceType =
  | 'laundry'
  | 'electrician'
  | 'plumber'
  | 'ac_technician'
  | 'fan_repair'
  | 'repair_other'
  | 'parking'
  | 'bookshop'
  | 'library'
  | 'restaurant'
  | 'cafe'
  | 'shop'
  | 'other';

export const HUB_SERVICE_TYPES: readonly HubServiceType[] = [
  'laundry',
  'electrician',
  'plumber',
  'ac_technician',
  'fan_repair',
  'repair_other',
  'parking',
  'bookshop',
  'library',
  'restaurant',
  'cafe',
  'shop',
  'other',
];

export type HubPriceType = 'fixed' | 'starting_from' | 'approximate';

export type HubOfferKind = 'percent' | 'amount' | 'other';

export type BookCondition = 'new' | 'like_new' | 'good' | 'fair';

export const BOOK_CONDITIONS: readonly BookCondition[] = [
  'new',
  'like_new',
  'good',
  'fair',
];

export type BookIntent = 'exchange' | 'sell' | 'give_away';

export const BOOK_INTENTS: readonly BookIntent[] = ['exchange', 'sell', 'give_away'];

export type BookListingStatus =
  | 'active'
  | 'reserved'
  | 'exchanged'
  | 'sold'
  | 'removed';

export const BOOK_LISTING_STATUSES: readonly BookListingStatus[] = [
  'active',
  'reserved',
  'exchanged',
  'sold',
  'removed',
];

export type ResearchCollaborationType = 'partner' | 'group' | 'mentorship' | 'any';

export const RESEARCH_COLLABORATION_TYPES: readonly ResearchCollaborationType[] = [
  'partner',
  'group',
  'mentorship',
  'any',
];

export type ResearchProfileStatus = 'active' | 'hidden';

export type ResearchRequestStatus = 'pending' | 'accepted' | 'declined';

/** Report reasons for every public Student Hub surface (spec student-hub §23). */
export const HUB_REPORT_REASONS = [
  'incorrect_information',
  'closed_business',
  'wrong_phone_number',
  'wrong_location',
  'fake_listing',
  'expired_discount',
  'inappropriate_content',
  'other',
] as const;

export type HubReportReason = (typeof HUB_REPORT_REASONS)[number];

// ── Directory ────────────────────────────────────────────────────────────────

export interface HubCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  features: string[];
  sort_order: number;
  is_active: boolean;
}

export interface HubOffer {
  id: string;
  listing_id: string;
  title: string;
  discount_kind: HubOfferKind;
  /** percent: 1–100 · amount: paisa (BDT × 100) · other: null */
  discount_value: number | null;
  applies_to: string | null;
  student_id_required: boolean;
  valid_from: string | null;
  valid_until: string | null;
  terms: string | null;
  is_active: boolean;
}

export interface HubListingSummary {
  id: string;
  category_id: string;
  name: string;
  service_type: HubServiceType;
  summary: string | null;
  verified: boolean;
  area: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  opening_hours: string | null;
  /** Structured hours (optional) — powers the honest "Open now" filter. */
  opens_at: string | null;
  closes_at: string | null;
  price_note: string | null;
  price_type: HubPriceType | null;
  image_url: string | null;
  has_student_discount: boolean;
  updated_at: string;
}

export interface HubListingDetail extends HubListingSummary {
  description: string | null;
  address: string | null;
  district: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  services: string[];
  image_urls: string[];
  last_verified_at: string | null;
  category?: { slug: string; name: string } | null;
  offers?: HubOffer[];
}

export type HubSortOption = 'recent' | 'verified' | 'discount';

export interface HubFilters {
  q?: string;
  categorySlug?: string;
  serviceType?: HubServiceType;
  area?: string;
  verified?: boolean;
  discount?: boolean;
  openNow?: boolean;
  sort?: HubSortOption;
}

export interface HubPage {
  rows: HubListingSummary[];
  page: number;
  hasMore: boolean;
}

export interface HubFacet {
  areas: { value: string; count: number }[];
}

/** Payload for the hub-actions `submit_listing` (user suggestion). */
export interface HubListingSubmission {
  category_id: string;
  name: string;
  service_type?: HubServiceType;
  summary?: string;
  description?: string;
  address?: string;
  area?: string;
  city?: string;
  phone?: string;
  whatsapp?: string;
  opening_hours?: string;
  price_note?: string;
  price_type?: HubPriceType;
  services?: string[];
  image_urls?: string[];
}

/** A saved directory listing (Saved screen section). */
export interface SavedHubListing extends HubListingSummary {
  saved_at: string;
}

// ── Book Exchange Corner ─────────────────────────────────────────────────────

export interface BookListingSummary {
  id: string;
  title: string;
  author: string | null;
  subject: string | null;
  edition: string | null;
  condition: BookCondition;
  intent: BookIntent;
  /** Paisa (BDT × 100) — only meaningful when intent='sell'. */
  price: number | null;
  image_urls: string[];
  status: BookListingStatus;
  updated_at: string;
  owner_name?: string | null;
}

export interface BookListingDetail extends BookListingSummary {
  owner_id: string;
  expected_exchange: string | null;
  description: string | null;
  contact_preference: 'in_app' | 'phone';
  phone: string | null;
  created_at: string;
  owner?: { full_name: string | null; avatar_url: string | null } | null;
}

export interface BookFilters {
  q?: string;
  intent?: BookIntent;
  condition?: BookCondition;
}

export interface BookPage {
  rows: BookListingSummary[];
  page: number;
  hasMore: boolean;
}

/** Payload for creating/updating the signed-in student's book listing. */
export interface BookListingInput {
  title: string;
  author?: string;
  subject?: string;
  edition?: string;
  condition: BookCondition;
  intent: BookIntent;
  price?: number | null;
  expected_exchange?: string;
  description?: string;
  image_urls?: string[];
  contact_preference: 'in_app' | 'phone';
  phone?: string;
}

// ── Research Partner Matching ────────────────────────────────────────────────

export interface ResearchProfileSummary {
  id: string;
  user_id: string;
  research_interest: string;
  discipline: string | null;
  topic: string | null;
  skills: string[];
  collaboration_type: ResearchCollaborationType;
  institution: string | null;
  district: string | null;
  availability: string | null;
  updated_at: string;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
}

export interface ResearchProfileDetail extends ResearchProfileSummary {
  bio: string | null;
  status: ResearchProfileStatus;
  created_at: string;
}

export interface ResearchFilters {
  q?: string;
  discipline?: string;
  district?: string;
  collaboration?: ResearchCollaborationType;
}

export interface ResearchPage {
  rows: ResearchProfileSummary[];
  page: number;
  hasMore: boolean;
}

export interface ResearchProfileInput {
  research_interest: string;
  discipline?: string;
  topic?: string;
  skills: string[];
  collaboration_type: ResearchCollaborationType;
  institution?: string;
  district?: string;
  availability?: string;
  bio?: string;
}

export interface ResearchRequest {
  id: string;
  from_user_id: string;
  to_profile_id: string;
  message: string;
  status: ResearchRequestStatus;
  created_at: string;
  responded_at: string | null;
  from_profile?: { full_name: string | null; avatar_url: string | null } | null;
}
