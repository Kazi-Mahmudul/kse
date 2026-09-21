-- Resume/CV upload (spec §6 Profile → Portfolio → Resume).
-- The private `resumes` bucket (PDF-only, 10 MB, owner-prefix policies)
-- already exists — see 20260906120011_storage_buckets.sql. Uploaded files
-- are referenced from user_resumes.file_url as bucket-qualified storage
-- paths (`resumes/<auth.uid()>/<unique>.pdf`); legacy rows keep external
-- https links. This migration only adds the display filename.

alter table public.user_resumes
  add column if not exists file_name text;
