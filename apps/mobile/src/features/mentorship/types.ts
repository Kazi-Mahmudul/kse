import type { Ionicons } from '@expo/vector-icons';
import type { OpportunitySummary } from '@kse/types';
import type { Tints } from '@/constants/theme';

export interface MentorCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: keyof typeof Tints.light;
  tags: string[];
  serviceRoute?: string;
}

export interface MentorSummary extends OpportunitySummary {
  rating_avg: number;
  rating_count: number;
  experience_years: number;
  education: string | null;
  cover_image_url?: string | null;
  tags: string[];
}

export interface MentorDetail extends MentorSummary {
  description: string | null;
  eligibility: string | null;
  source_name: string | null;
  source_url: string | null;
  cover_image_url?: string | null;
  published_at: string | null;
}

export type MentorModeFilter = 'all' | 'remote' | 'onsite' | 'hybrid';
export type MentorExperienceFilter = 'all' | '1_2' | '3_5' | '5_plus';

export interface MentorFilters {
  q?: string;
  category?: string;
  mode?: MentorModeFilter;
  institution?: string;
  experience?: MentorExperienceFilter;
  minRating?: number;
  availableDate?: string;
}

export interface BookSessionPayload {
  opportunity_id: string;
  topic: string;
  message: string;
  preferred_date?: string | null;
  preferred_time?: string | null;
  session_mode?: 'online' | 'offline';
  contact_email?: string | null;
  contact_phone?: string | null;
  request_type?: 'session' | 'message';
  session_type?: string;
}

// ── Screen 8: My Sessions ────────────────────────────────────────────────────

export type SessionStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface MentorSession {
  id: string;
  opportunity_id: string | null;
  mentor_title: string;
  mentor_organization: string;
  mentor_image_url: string | null;
  topic: string;
  message: string;
  preferred_date: string | null;
  preferred_time: string | null;
  session_mode: string;
  session_type: string | null;
  status: SessionStatus;
  created_at: string;
}

// ── Screen 7: Chat ───────────────────────────────────────────────────────────

export interface MentorMessage {
  id: string;
  opportunity_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface MentorConversationSummary {
  opportunity_id: string;
  mentor_title: string;
  mentor_organization: string;
  mentor_image_url: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

// ── Screen 9: Ask a Question ─────────────────────────────────────────────────

export interface MentorQuestion {
  id: string;
  student_id: string;
  opportunity_id: string | null;
  category: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  status: 'pending' | 'answered' | 'closed';
  created_at: string;
}

export interface SubmitQuestionPayload {
  question: string;
  category: string;
  opportunity_id?: string | null;
}

export interface MentorDiscussion {
  id: string;
  opportunity_id: string;
  mentor_title: string;
  mentor_organization: string;
  mentor_education: string | null;
  mentor_image_url: string | null;
  mentor_verified: boolean;
  title: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  // client-side state
  user_liked?: boolean;
}

export interface MentorDiscussionComment {
  id: string;
  discussion_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // joined fields
  user_full_name?: string;
  user_avatar_url?: string | null;
}

// ── Mentor Applications ──────────────────────────────────────────────────────

export type MentorApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface MentorApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  organization: string;
  designation: string;
  experience_years: number;
  education: string;
  expertise_areas: string[];
  bio: string;
  linkedin_url: string | null;
  session_mode: 'online' | 'offline' | 'hybrid';
  status: MentorApplicationStatus;
  admin_note: string | null;
  opportunity_id: string | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitMentorApplicationPayload {
  full_name: string;
  email: string;
  phone?: string;
  organization: string;
  designation: string;
  experience_years: number;
  education: string;
  expertise_areas: string[];
  bio: string;
  linkedin_url?: string;
  session_mode: 'online' | 'offline' | 'hybrid';
}

export interface UpdateMentorProfilePayload {
  opportunity_id: string;
  title: string;
  organization_name: string;
  summary: string;
  description?: string;
  image_url?: string | null;
  cover_image_url?: string | null;
  education?: string | null;
  experience_years?: number;
  opportunity_mode?: 'online' | 'offline' | 'hybrid';
  location?: string | null;
  source_url?: string | null;
  tags?: string[];
}

export interface CreateDiscussionPayload {
  opportunity_id: string;
  title: string;
  content: string;
}

export interface UpdateDiscussionPayload {
  discussion_id: string;
  title: string;
  content: string;
}

