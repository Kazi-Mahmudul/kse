import type { UserRole } from '@kse/types';

/** Roles that may enter the admin panel (CLAUDE.md §5). */
export const STAFF_ROLES: readonly UserRole[] = [
  'content_manager',
  'admin',
  'super_admin',
] as const;

/** Display order for picking the user's primary badge. */
const ROLE_PRIORITY: readonly UserRole[] = [
  'super_admin',
  'admin',
  'content_manager',
  'mentor',
  'tutor',
  'student',
] as const;

export function isStaff(roles: readonly string[]): boolean {
  return roles.some((role) =>
    STAFF_ROLES.includes(role as UserRole),
  );
}

/** Highest-priority role for the sidebar badge. */
export function primaryRole(roles: readonly string[]): UserRole | null {
  const owned = new Set(roles);
  return ROLE_PRIORITY.find((role) => owned.has(role)) ?? null;
}
