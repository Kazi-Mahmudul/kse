import type {
  ToletGenderPreference,
  ToletListingStatus,
  ToletRoomType,
} from '@kse/types';

/** useActionState shape shared by the tolet form actions. */
export interface ToletActionState {
  error: string | null;
  fieldErrors: Record<string, string>;
}

export const initialToletActionState: ToletActionState = {
  error: null,
  fieldErrors: {},
};

/** Form-ready flat row (numbers are strings so uncontrolled inputs round-trip). */
export interface ToletFormData {
  id: string;
  type: 'tolet';
  title: string;
  organization_name: string;
  summary: string;
  description: string;
  image_url: string;
  image_urls: string[];
  location: string;
  city: string;
  area: string;
  room_type: ToletRoomType | '';
  gender_preference: ToletGenderPreference | '';
  rent_amount: string;
  rent_currency: string;
  total_rooms: string;
  available_rooms: string;
  floor: string;
  bachelor_friendly: boolean;
  utilities_included: boolean;
  available_from: string;
  landlord_phone: string;
  whatsapp: string;
  contact_email: string;
  application_url: string;
  listing_status: ToletListingStatus;
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived' | 'expired';
  verified: boolean;
  source_name: string;
  source_url: string;
}

export interface ToletListingRow {
  id: string;
  title: string;
  city: string | null;
  area: string | null;
  room_type: ToletRoomType | null;
  rent_amount: number | null;
  rent_currency: string | null;
  listing_status: ToletListingStatus;
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived' | 'expired';
  verified: boolean;
  updated_at: string;
  image_url: string | null;
}
