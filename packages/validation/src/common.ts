import { z } from 'zod';

/**
 * Canonical 8-4-4-4-12 hex UUID shape. Zod's z.string().uuid() additionally
 * enforces the RFC version/variant nibbles, which rejects the fixed-shape ids
 * used by local seed data (e.g. 22222222-2222-2222-2222-222222222221) — so
 * validate the shape only.
 */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidField = (message = 'Invalid id') =>
  z.string().regex(UUID_PATTERN, message);
