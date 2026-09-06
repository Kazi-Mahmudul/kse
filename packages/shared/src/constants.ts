import type {
  OpportunityMode,
  OpportunityStatus,
  OpportunityType,
  UserRole,
} from '@kse/types';
import {
  OPPORTUNITY_MODES,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TYPES,
} from '@kse/types';

export const APP_NAME = 'KSE';

/** Display labels for enum-like domains. Single source of truth avoids duplicate maps. */

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  internship: 'Internship',
  scholarship: 'Scholarship',
  workshop: 'Workshop',
  event: 'Event',
  mentorship: 'Mentorship',
};

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  rejected: 'Rejected',
  expired: 'Expired',
  archived: 'Archived',
};

export const OPPORTUNITY_MODE_LABELS: Record<OpportunityMode, string> = {
  remote: 'Remote',
  onsite: 'On-site',
  hybrid: 'Hybrid',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  tutor: 'Tutor',
  mentor: 'Mentor',
  content_manager: 'Content Manager',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

/** Iterating enum options in UI (filters, admin selects). */
export const OPPORTUNITY_TYPE_OPTIONS = OPPORTUNITY_TYPES.map((value) => ({
  value,
  label: OPPORTUNITY_TYPE_LABELS[value],
}));

export const OPPORTUNITY_MODE_OPTIONS = OPPORTUNITY_MODES.map((value) => ({
  value,
  label: OPPORTUNITY_MODE_LABELS[value],
}));

export const OPPORTUNITY_STATUS_OPTIONS = OPPORTUNITY_STATUSES.map((value) => ({
  value,
  label: OPPORTUNITY_STATUS_LABELS[value],
}));

/** Bottom navigation tabs (CLAUDE.md §32). */
export const BOTTOM_TABS = ['home', 'explore', 'action', 'community', 'profile'] as const;

/** Storage buckets (CLAUDE.md §15). */
export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  organizationLogos: 'organization-logos',
  opportunityImages: 'opportunity-images',
  certificates: 'certificates',
  resumes: 'resumes',
  communityMedia: 'community-media',
} as const;
