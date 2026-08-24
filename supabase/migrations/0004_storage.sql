-- =====================================================================
-- FOMO Padang — 0004 Storage
-- Posters are world-readable (they are on the public event page anyway),
-- but only staff may write. Anonymous contributors never upload files:
-- they send a source URL and the team fetches the poster during review.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('event-posters',   'event-posters',   true, 5242880,
    array['image/jpeg','image/png','image/webp']),
  ('place-images',    'place-images',    true, 5242880,
    array['image/jpeg','image/png','image/webp']),
  ('organizer-assets','organizer-assets',true, 2097152,
    array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- Read: anyone. Write: staff only.
-- ---------------------------------------------------------------------
drop policy if exists "fomo public read" on storage.objects;
create policy "fomo public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('event-posters','place-images','organizer-assets'));

drop policy if exists "fomo staff insert" on storage.objects;
create policy "fomo staff insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('event-posters','place-images','organizer-assets')
    and public.is_staff()
  );

drop policy if exists "fomo staff update" on storage.objects;
create policy "fomo staff update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('event-posters','place-images','organizer-assets')
    and public.is_staff()
  )
  with check (
    bucket_id in ('event-posters','place-images','organizer-assets')
    and public.is_staff()
  );

drop policy if exists "fomo staff delete" on storage.objects;
create policy "fomo staff delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('event-posters','place-images','organizer-assets')
    and public.is_staff()
  );
