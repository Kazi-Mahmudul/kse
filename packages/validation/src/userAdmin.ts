import { z } from 'zod';
import { USER_ROLES } from '@kse/types';

import { uuidField } from './common';

/**
 * Admin user-management actions (CLAUDE.md §7 "User Management").
 * All writes go through the service-role client after staff verification,
 * so these schemas guard the form payload only.
 */

const userIdField = uuidField('Choose a valid user');

const booleanField = z.preprocess(
  (value) => value === true || value === 'on' || value === 'true',
  z.boolean(),
);

/** Suspend / reactivate (profiles.status — the repo has no is_banned column). */
export const setUserStatusSchema = z.object({
  userId: userIdField,
  status: z.enum(['active', 'suspended'], { message: 'Choose a valid status' }),
});

/** Toggle profiles.is_verified (the ✓ badge shown next to names). */
export const setUserVerifiedSchema = z.object({
  userId: userIdField,
  verified: booleanField,
});

/** Grant (true) or revoke (false) a role in user_roles. */
export const setUserRoleSchema = z.object({
  userId: userIdField,
  role: z.enum(USER_ROLES, { message: 'Choose a valid role' }),
  grant: booleanField,
});

/** Users list page query params (search + filters). */
export const usersSearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(['active', 'suspended']).optional(),
});
