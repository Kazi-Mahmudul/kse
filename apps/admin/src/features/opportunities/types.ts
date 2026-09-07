import type { OpportunityStatus, OpportunityType } from '@kse/types';

/** useActionState shape shared by the opportunity form actions. */
export interface OpportunityActionState {
  error: string | null;
  fieldErrors: Record<string, string>;
}

export const initialOpportunityActionState: OpportunityActionState = {
  error: null,
  fieldErrors: {},
};

/** Category option passed to the form (public reference data). */
export interface CategoryOption {
  id: string;
  name: string;
  opportunity_type: OpportunityType | null;
}

/** Flat, form-ready view of an opportunity row (strings for inputs). */
export interface OpportunityFormData {
  id: string;
  type: OpportunityType;
  title: string;
  organization_name: string;
  summary: string;
  description: string;
  image_url: string;
  location: string;
  opportunity_mode: string;
  eligibility: string;
  application_url: string;
  deadline: string;
  category_id: string;
  status: OpportunityStatus;
  featured: boolean;
  verified: boolean;
  source_name: string;
  source_url: string;
  tags: string[];
}

export interface TagRow {
  tag_id: string;
  tags: { name: string } | null;
}
