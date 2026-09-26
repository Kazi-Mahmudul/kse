-- Bachelor To-Let — add 'tolet_listing' to report_target_type.
--
-- Same ALTER TYPE isolation rule as 20260926000020_tolet_opportunity_type.sql:
-- the `ADD VALUE` commits implicitly and cannot share a transaction with other
-- DDL. The generic `public.reports` table accepts the new value because it
-- uses this enum directly (see 20260906120010_reports_audit_settings.sql).

alter type public.report_target_type add value if not exists 'tolet_listing';
