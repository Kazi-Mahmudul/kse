-- Bachelor To-Let (student housing) — add 'tolet' to opportunity_type.
--
-- Why a separate migration: Postgres cannot batch `ALTER TYPE ... ADD VALUE`
-- inside a transaction block with other DDL (it commits implicitly), and the
-- rest of this feature migration chain references the new value. Splitting it
-- out mirrors the pattern used for community-report target extensions in
-- `20260923200000_community_moderation.sql`.

alter type public.opportunity_type add value if not exists 'tolet';
