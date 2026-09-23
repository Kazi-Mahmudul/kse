import type { ContentStatus } from './master-data';

/**
 * Community system types (community redesign). Mirrors the DB enums exactly:
 * community_member_role, community_request_status, community_categories.slug,
 * community_posts.post_type, community_polls.result_visibility,
 * community_events.mode / community_event_attendees.rsvp, report reasons.
 */

export const COMMUNITY_MEMBER_ROLES = ['member', 'moderator', 'owner'] as const;
export type CommunityMemberRole = (typeof COMMUNITY_MEMBER_ROLES)[number];

export const COMMUNITY_REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type CommunityRequestStatus = (typeof COMMUNITY_REQUEST_STATUSES)[number];

export const COMMUNITY_POST_TYPES = [
  'discussion',
  'question',
  'opportunity',
  'announcement',
  'poll',
] as const;
export type CommunityPostType = (typeof COMMUNITY_POST_TYPES)[number];

export const COMMUNITY_POLL_RESULT_VISIBILITIES = [
  'realtime',
  'after_vote',
  'after_close',
] as const;
export type CommunityPollResultVisibility = (typeof COMMUNITY_POLL_RESULT_VISIBILITIES)[number];

export const COMMUNITY_EVENT_MODES = ['online', 'offline', 'hybrid'] as const;
export type CommunityEventMode = (typeof COMMUNITY_EVENT_MODES)[number];

export const COMMUNITY_EVENT_RSVP_VALUES = ['interested', 'attending'] as const;
export type CommunityEventRsvp = (typeof COMMUNITY_EVENT_RSVP_VALUES)[number];

export const COMMUNITY_REPORT_REASONS = [
  'spam',
  'harassment',
  'inappropriate',
  'scam',
  'misleading',
  'other',
] as const;
export type CommunityReportReason = (typeof COMMUNITY_REPORT_REASONS)[number];

/** Master-data row (admin-managed, seeded with the five default categories). */
export interface CommunityCategory {
  id: string;
  name: string;
  slug: string;
}

/** Listing shape used by discovery, search results and recommendations. */
export interface CommunityListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  universityName: string | null;
  departmentName: string | null;
  /** Trigger-maintained count on communities.member_count. */
  memberCount: number;
  /** True if the current session user is a member (toggle state for Join). */
  isMember: boolean;
  /** Member's role if joined — only members can see this client-side. */
  role: CommunityMemberRole | null;
  /** Rule-based recommendation score (recommended list only). */
  score?: number;
}

export interface CommunityModerator {
  userId: string;
  fullName: string;
  role: CommunityMemberRole;
}

/** Single community page payload. */
export interface CommunityDetail extends CommunityListItem {
  status: ContentStatus;
  rules: string[];
  moderators: CommunityModerator[];
}

/** Student-submitted creation request (admin reviews in the panel). */
export interface CommunityRequest {
  id: string;
  requestedBy: string;
  requesterName: string | null;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  description: string;
  purpose: string | null;
  universityName: string | null;
  proposedRules: string[];
  imageUrl: string | null;
  status: CommunityRequestStatus;
  communityId: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export interface CommunityPollOption {
  id: string;
  text: string;
  /** Present only when results are visible to the viewer. */
  voteCount: number | null;
}

export interface CommunityPoll {
  id: string;
  closesAt: string | null;
  closed: boolean;
  resultVisibility: CommunityPollResultVisibility;
  /** Total votes when visible, else the count the viewer can derive (own vote). */
  totalVotes: number | null;
  options: CommunityPollOption[];
  /** Option id the viewer voted for, if any. */
  viewerVotedOptionId: string | null;
}

/** Post shape used in community feeds, post detail and admin moderation. */
export interface CommunityPost {
  id: string;
  communityId: string;
  communityName?: string;
  authorId: string;
  authorName: string;
  postType: CommunityPostType;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  isPinned: boolean;
  isLocked: boolean;
  commentCount: number;
  reactionCount: number;
  /** True if the viewer already liked this post. */
  viewerReacted: boolean;
  status: ContentStatus;
  createdAt: string;
  /** Present for postType === 'poll' once the poll row is fetched. */
  poll?: CommunityPoll | null;
}

/**
 * Post shape used in the Community tab "Trending discussions" list — carries
 * the parent community's display name so the card can render
 * "Author in Community" without an extra round-trip.
 */
export interface CommunityRecentPost extends CommunityPost {
  communityName: string;
}

/** Comment with one level of replies (guard_comment_depth enforces the depth). */
export interface CommunityComment {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  content: string;
  status: ContentStatus;
  createdAt: string;
}

export interface CommunityEvent {
  id: string;
  communityId: string;
  communityName?: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  mode: CommunityEventMode;
  meetingUrl: string | null;
  organizer: string | null;
  imageUrl: string | null;
  attendingCount: number;
  interestedCount: number;
  /** The viewer's RSVP, if any. */
  viewerRsvp: CommunityEventRsvp | null;
}
