import type { ContentStatus } from './master-data';

/**
 * Tuition / tutor domain types (CLAUDE.md §6 "Tuition"). tutors has no direct
 * FK to profiles (both reference auth.users), so display names are merged in a
 * second query — TutorListItem carries the merged shape both apps render.
 */

export const TUITION_REQUEST_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'closed',
] as const;

export type TuitionRequestStatus = (typeof TUITION_REQUEST_STATUSES)[number];

/** Verified/active tutor row as shown on cards and the detail screen. */
export interface TutorListItem {
  id: string;
  fullName: string;
  headline: string;
  bio: string | null;
  location: string | null;
  availability: string | null;
  expectedFeeMin: number | null;
  expectedFeeMax: number | null;
  universityName: string | null;
  subjectNames: string[];
  isVerified: boolean;
}

/** Admin-facing tutor row: adds moderation state to the merged list shape. */
export interface TutorAdminRow extends TutorListItem {
  status: ContentStatus;
}

/** A request the current student sent (status badge + context for follow-up). */
export interface TuitionRequestRow {
  id: string;
  status: TuitionRequestStatus;
  message: string;
  preferredTime: string | null;
  createdAt: string;
  subjectName: string | null;
  tutorHeadline: string | null;
}
