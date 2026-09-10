import type { ContentStatus } from './master-data';

/**
 * Community types (spec §6 "Community"). Discovery + membership + posts/
 * announcements only — no feeds or messaging (CLAUDE.md §31 "Later").
 */

export const COMMUNITY_MEMBER_ROLES = ['member', 'moderator', 'owner'] as const;

export type CommunityMemberRole = (typeof COMMUNITY_MEMBER_ROLES)[number];

/** Listing shape used by the community tab and search results. */
export interface CommunityListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  universityName: string | null;
  memberCount: number;
  /** True if the current session user is a member (toggle state for Join). */
  isMember: boolean;
  /** Member's role if joined — only members can see this client-side. */
  role: CommunityMemberRole | null;
}

/** Single community detail (header) + joined status. */
export interface CommunityDetail extends CommunityListItem {
  status: ContentStatus;
}

/** Post shape used in the community detail feed + admin moderation. */
export interface CommunityPost {
  id: string;
  communityId: string;
  authorId: string;
  authorName: string;
  content: string;
  isAnnouncement: boolean;
  status: ContentStatus;
  createdAt: string;
}

/**
 * Post shape used in the Community tab "Recent Discussions" list — same as
 * `CommunityPost` but carries the parent community's display name so the
 * card can render "Author in Community" without an extra round-trip.
 */
export interface CommunityRecentPost extends CommunityPost {
  communityName: string;
}
