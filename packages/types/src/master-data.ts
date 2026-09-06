/**
 * Master data domain types (CLAUDE.md §8) — admin-managed reference rows
 * that profiles, tutors and opportunities point at.
 */

export interface University {
  id: string;
  name: string;
  short_name: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  university_id: string;
  name: string;
  code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
