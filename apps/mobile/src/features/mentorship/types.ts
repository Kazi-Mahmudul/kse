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
  tags: string[];
}

export interface MentorDetail extends MentorSummary {
  description: string | null;
  eligibility: string | null;
  source_name: string | null;
  source_url: string | null;
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
  is_read: boolean;
  created_at: string;
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

// ── Screen 10: Mentor Community ──────────────────────────────────────────────

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
}

