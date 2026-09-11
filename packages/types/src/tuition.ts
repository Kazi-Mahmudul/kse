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

export const TUTOR_APPLICATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
] as const;

export type TutorApplicationStatus = (typeof TUTOR_APPLICATION_STATUSES)[number];

/** Verified/active tutor row as shown on cards and the detail screen. */
export interface TutorListItem {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  headline: string;
  bio: string | null;
  location: string | null;
  availability: string | null;
  expectedFeeMin: number | null;
  expectedFeeMax: number | null;
  universityName: string | null;
  /** universities.short_name ("KUET") — preferred on compact cards. */
  universityShortName: string | null;
  subjectNames: string[];
  isVerified: boolean;
  /** Trigger-maintained aggregate (tutors.rating_avg / rating_count). */
  ratingAvg: number;
  ratingCount: number;
}

/** A review shown on the tutor profile (reviewer identity merged from profiles). */
export interface TutorReview {
  id: string;
  tutorId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatarUrl: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The signed-in student's tutor application (profile → "Become a Tutor"). */
export interface MyTutorApplication {
  id: string;
  status: TutorApplicationStatus;
  headline: string;
  bio: string | null;
  universityId: string | null;
  universityName: string | null;
  location: string | null;
  expectedFeeMin: number | null;
  expectedFeeMax: number | null;
  availability: string | null;
  subjectIds: string[];
  subjectNames: string[];
  reviewNote: string | null;
  createdAt: string;
}

/** Admin-facing tutor application row (applicant identity merged from profiles). */
export interface TutorApplicationAdminRow {
  id: string;
  userId: string;
  applicantName: string;
  avatarUrl: string | null;
  headline: string;
  bio: string | null;
  universityName: string | null;
  location: string | null;
  expectedFeeMin: number | null;
  expectedFeeMax: number | null;
  availability: string | null;
  subjectNames: string[];
  status: TutorApplicationStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
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
