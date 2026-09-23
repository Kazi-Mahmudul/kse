-- Community redesign (1/9): 'archived' terminal state for communities.
-- Kept in its own migration because a new enum value cannot be *used*
-- (policies, checks) within the same transaction that creates it.

alter type public.content_status add value if not exists 'archived';
