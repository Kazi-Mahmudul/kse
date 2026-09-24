/**
 * Education-institution reference data (public.education_institutions).
 * Mirrors the SQL enum and the seed for Khulna (other districts will share
 * the same shape — we only differ on `city`).
 */

export const EDUCATION_INSTITUTION_TYPES = [
  'university',
  'medical_college',
  'college',
  'school',
  'madrasa',
  'igv_school',
  'technical_school',
  'english_medium',
  'arts_college',
  'polytechnic',
  'military_school',
] as const;
export type EducationInstitutionType = (typeof EDUCATION_INSTITUTION_TYPES)[number];

export const EDUCATION_INSTITUTION_OWNERSHIPS = ['public', 'private', 'other'] as const;
export type EducationInstitutionOwnership = (typeof EDUCATION_INSTITUTION_OWNERSHIPS)[number];

export const EDUCATION_INSTITUTION_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type EducationInstitutionRequestStatus =
  (typeof EDUCATION_INSTITUTION_REQUEST_STATUSES)[number];

/** One row of public.education_institutions. */
export interface EducationInstitution {
  id: string;
  name: string;
  name_bn: string | null;
  type: EducationInstitutionType;
  ownership_type: EducationInstitutionOwnership;
  city: string | null;
  area: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** One row of public.education_institution_requests. */
export interface EducationInstitutionRequest {
  id: string;
  requested_by: string;
  name: string;
  name_bn: string | null;
  type: EducationInstitutionType;
  ownership_type: EducationInstitutionOwnership | null;
  city: string | null;
  area: string | null;
  status: EducationInstitutionRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Districts the mobile Add-Education picker currently knows about.
 * Source for the list lives in CLAUDE.md / product decisions; only Khulna
 * has an institution seed today — the other 9 districts will arrive later
 * as the same seed pattern, but the dropdown is district-ready now so the
 * form doesn't need to change when those seeds land.
 */
export const KHULNA_DIVISION_DISTRICTS = [
  'Khulna',
  'Bagerhat',
  'Satkhira',
  'Jashore',
  'Jhenaidah',
  'Magura',
  'Narail',
  'Kushtia',
  'Chuadanga',
  'Meherpur',
] as const;
export type KhulnaDivisionDistrict = (typeof KHULNA_DIVISION_DISTRICTS)[number];
