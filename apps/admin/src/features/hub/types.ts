import type {
  HubListingStatus,
  HubOfferKind,
  HubPriceType,
  HubServiceType,
} from '@kse/types';

/** useActionState shape shared by the hub form actions. */
export interface HubActionState {
  error: string | null;
  fieldErrors: Record<string, string>;
}

export const initialHubActionState: HubActionState = {
  error: null,
  fieldErrors: {},
};

/** Form-ready flat row (numbers are strings so uncontrolled inputs round-trip). */
export interface HubFormData {
  id: string;
  category_id: string;
  name: string;
  service_type: HubServiceType | '';
  summary: string;
  description: string;
  status: HubListingStatus;
  address: string;
  area: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
  phone: string;
  whatsapp: string;
  email: string;
  opening_hours: string;
  opens_at: string;
  closes_at: string;
  price_note: string;
  price_type: HubPriceType | '';
  services: string[];
  image_url: string;
  image_urls: string[];
  verified: boolean;
}

export interface HubListingRow {
  id: string;
  name: string;
  service_type: HubServiceType;
  area: string | null;
  city: string;
  status: HubListingStatus;
  verified: boolean;
  has_student_discount: boolean;
  updated_at: string;
}

export interface HubCategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  features: string[];
  sort_order: number;
  is_active: boolean;
}

export interface HubOfferRow {
  id: string;
  listing_id: string;
  title: string;
  discount_kind: HubOfferKind;
  discount_value: number | null;
  applies_to: string | null;
  student_id_required: boolean;
  valid_from: string | null;
  valid_until: string | null;
  terms: string | null;
  is_active: boolean;
}
