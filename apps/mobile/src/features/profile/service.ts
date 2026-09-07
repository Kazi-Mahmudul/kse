import type {
  Department,
  Profile,
  Skill,
  University,
} from '@kse/types';
import type { ProfileUpdateInput } from '@kse/validation';

import { supabase } from '@/lib/supabase';

/**
 * Profile data access (spec §6). Simple reads go straight through the
 * Supabase client under RLS; errors are translated for the UI.
 */

export class ProfileError extends Error {}

function fail(error: { message: string } | null): void {
  if (error) throw new ProfileError('Could not load your profile data. Please try again.');
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ProfileError('You are signed out.');
  return data.user.id;
}

export interface MyProfile extends Profile {
  university: Pick<University, 'id' | 'name' | 'short_name'> | null;
  department: Pick<Department, 'id' | 'name'> | null;
}

export async function getMyProfile(): Promise<MyProfile> {
  const userId = await requireUserId();
  // `phone` is a private column (spec §34): it has no column-level SELECT for
  // the client role, so it is excluded here and fetched via my_phone() below.
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, avatar_url, university_id, department_id, academic_level, bio, interests, is_verified, status, created_at, updated_at, university:universities(id, name, short_name), department:departments(id, name)',
    )
    .eq('id', userId)
    .single();
  fail(error);

  const { data: phone, error: phoneError } = await supabase.rpc('my_phone');
  if (phoneError) fail(phoneError);

  const row = data as unknown as Omit<MyProfile, 'phone'>;
  return { ...row, phone: (phone as string | null) ?? null };
}

export async function updateMyProfile(input: ProfileUpdateInput): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('profiles').update(input).eq('id', userId);
  fail(error);
}

/** Currently selected skill ids (own rows only, RLS enforced). */
export async function getMySkillIds(): Promise<string[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('user_skills')
    .select('skill_id')
    .eq('user_id', userId);
  fail(error);
  return (data ?? []).map((row: { skill_id: string }) => row.skill_id);
}

/** Replaces the user's skill set with a diff-based delete/insert. */
export async function setMySkills(skillIds: string[]): Promise<void> {
  const userId = await requireUserId();
  const current = await getMySkillIds();
  const toRemove = current.filter((id) => !skillIds.includes(id));
  const toAdd = skillIds.filter((id) => !current.includes(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('user_skills')
      .delete()
      .eq('user_id', userId)
      .in('skill_id', toRemove);
    fail(error);
  }
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('user_skills')
      .insert(toAdd.map((skill_id) => ({ user_id: userId, skill_id })));
    fail(error);
  }
}

// ── Master data (public reads) ──────────────────────────────────────────────

export async function listUniversities(): Promise<University[]> {
  const { data, error } = await supabase
    .from('universities')
    .select('id, name, short_name, location, created_at, updated_at')
    .order('name');
  fail(error);
  return data ?? [];
}

export async function listDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('id, university_id, name, code, created_at, updated_at')
    .order('name');
  fail(error);
  return data ?? [];
}

export async function listSkills(): Promise<Skill[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('id, name, created_at, updated_at')
    .order('name');
  fail(error);
  return data ?? [];
}
