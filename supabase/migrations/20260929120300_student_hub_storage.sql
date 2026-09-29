-- ============================================================
-- Student Hub — storage bucket
-- Migration: 20260929120300_student_hub_storage.sql
--
-- Public `student-hub` bucket for listing logos/photos and Book
-- Exchange book photos. Uploads are namespaced under <auth.uid>/ so
-- students can only write into their own folder (same pattern as the
-- tolet-listings bucket, 20260926000023).
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-hub',
  'student-hub',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

create policy storage_student_hub_insert_own_prefix on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'student-hub'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_student_hub_update_own_prefix on storage.objects
  for update to authenticated
  using (
    bucket_id = 'student-hub'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'student-hub'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_student_hub_delete_own_prefix on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'student-hub'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
