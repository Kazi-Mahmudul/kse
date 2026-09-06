/**
 * User / profile domain types (CLAUDE.md §5, §6).
 */

export const USER_ROLES = [
  'student',
  'tutor',
  'mentor',
  'content_manager',
  'admin',
  'super_admin',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ACADEMIC_LEVELS = [
  'undergraduate',
  'postgraduate',
  'hsc',
  'ssc',
  'other',
] as const;

export type AcademicLevel = (typeof ACADEMIC_LEVELS)[number];

/** Public + private profile fields; sensitive fields are private by default (CLAUDE.md §34). */
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  university_id: string | null;
  department_id: string | null;
  academic_level: AcademicLevel | null;
  bio: string | null;
  interests: string[];
  phone: string | null;
  is_verified: boolean;
  status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
}

/** Fields safe to expose publicly on another student's profile. */
export interface PublicProfile
  extends Pick<
    Profile,
    'id' | 'full_name' | 'avatar_url' | 'university_id' | 'department_id' | 'academic_level' | 'bio' | 'interests'
  > {}
