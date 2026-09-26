/**
 * Bachelor To-Let (student housing) types.
 *
 * The data model lives on the shared `opportunities` table with
 * `type='tolet'`; this module re-shapes those rows into housing-specific
 * views and adds the filter / form shapes the mobile app + admin panel use.
 */

import type { OpportunitySummary } from './opportunity';

/** A Bachelor To-Let listing shown on the hub / search list. */
export type ToletListingSummary = OpportunitySummary & {
  // TypeScript already narrows `type` to `'tolet'` when callers guard with
  // `if (row.type === 'tolet')`, but we keep the alias for call-site clarity.
  type: 'tolet';
};

/** A Bachelor To-Let listing shown on the detail page (extends summary with description). */
export interface ToletListing extends ToletListingSummary {
  description: string | null;
  application_url: string | null;
  available_from: string | null;
  landlord_phone: string | null;
  whatsapp: string | null;
  contact_email: string | null;
  floor: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Filter shape used by the mobile Bachelor To-Let hub. */
export interface ToletFilters {
  q?: string;
  city?: string;
  area?: string;
  roomType?: import('./opportunity').ToletRoomType;
  gender?: import('./opportunity').ToletGenderPreference;
  bachelorFriendly?: boolean;
  listingStatus?: import('./opportunity').ToletListingStatus;
  /** Inclusive minimum rent (numeric, currency is the listing's own currency). */
  minRent?: number;
  /** Inclusive maximum rent. */
  maxRent?: number;
  /** Max number of beds the unit has — used for "looking for a small mess" etc. */
  maxTotalRooms?: number;
  sort?: 'recent' | 'rent_asc' | 'rent_desc';
}

export interface ToletPage {
  rows: ToletListingSummary[];
  page: number;
  hasMore: boolean;
}

export interface ToletFacet {
  cities: { value: string; count: number }[];
  areas: { value: string; count: number }[];
}

export interface ToletCounts {
  available: number;
  almost_full: number;
  full: number;
  unavailable: number;
  total_published: number;
  total_pending: number;
}

/**
 * Raw payload accepted by the `tolet-actions` Edge Function. The Edge Function
 * re-validates with Zod before writing; this interface just documents the
 * shape for the mobile client.
 */
export interface ToletSubmissionPayload {
  title: string;
  summary?: string | null;
  description?: string | null;
  location: string;
  city: string;
  area?: string | null;
  room_type: import('./opportunity').ToletRoomType;
  gender_preference: import('./opportunity').ToletGenderPreference;
  rent_amount: number;
  rent_currency: string;
  available_from?: string | null;
  bachelor_friendly?: boolean;
  utilities_included?: boolean;
  landlord_phone: string;
  whatsapp?: string | null;
  contact_email?: string | null;
  total_rooms?: number | null;
  available_rooms?: number | null;
  floor?: number | null;
  image_urls: string[];
}
