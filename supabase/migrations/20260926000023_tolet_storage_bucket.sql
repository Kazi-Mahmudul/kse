-- Bachelor To-Let — public image bucket + owner-scoped policies.
--
-- Path convention matches the other public buckets: `<bucket>/<auth.uid()>/<random>`.
-- Reads are public (the bucket is public, no SELECT policy needed).
-- Writes require auth + own-prefix; the Edge Function `tolet-actions` performs
-- uploads on behalf of the student so we don't ship storage keys to the mobile
-- client.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('tolet-listings', 'tolet-listings', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy storage_tolet_listings_insert_own_prefix on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tolet-listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_tolet_listings_update_own_prefix on storage.objects
  for update to authenticated
  using (
    bucket_id = 'tolet-listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'tolet-listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_tolet_listings_delete_own_prefix on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'tolet-listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
