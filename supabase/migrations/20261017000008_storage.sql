-- Storage buckets and policies.
--   media-public  : covers, public audio/PDF (served by public URL)
--   media-private : internal audio/PDF; readable only through a matching
--                   recordings / documents / lessons row the user may view
--                   (the app requests short-lived signed URLs)
--   avatars       : profile pictures, each user writes inside <user id>/

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media-public', 'media-public', true, 52428800,
    array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/webm',
          'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('media-private', 'media-private', false, 52428800,
    array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/webm',
          'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('avatars', 'avatars', true, 2097152,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create or replace function private.can_read_private_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_staff()
    or exists (
      select 1 from public.recordings r
      where r.storage_bucket = 'media-private' and r.storage_path = p_name
        and (private.can_view(r.visibility, r.status, r.ensemble_id, r.course_id, 'librarian')
             or (r.course_id is not null and private.teaches_course(r.course_id))))
    or exists (
      select 1 from public.documents d
      where d.storage_bucket = 'media-private' and d.storage_path = p_name
        and (private.can_view(d.visibility, d.status, d.ensemble_id, d.course_id, 'librarian')
             or (d.course_id is not null and private.teaches_course(d.course_id))))
    or exists (
      select 1 from public.lessons l
      where l.notation_path = p_name and private.can_view_lesson(l.id));
$$;
grant execute on function private.can_read_private_object(text) to anon, authenticated;

-- media-public
-- Files are served by public URL; listing is limited to staff.
create policy "media-public staff list" on storage.objects for select to authenticated
  using (bucket_id = 'media-public' and (select private.is_staff()));
create policy "media-public staff upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media-public' and (select private.is_staff()));
create policy "media-public staff update" on storage.objects for update to authenticated
  using (bucket_id = 'media-public' and (select private.is_staff()))
  with check (bucket_id = 'media-public' and (select private.is_staff()));
create policy "media-public staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media-public' and (select private.is_staff()));

-- media-private
create policy "media-private readable by access" on storage.objects for select
  using (bucket_id = 'media-private' and private.can_read_private_object(name));
create policy "media-private staff upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media-private' and (select private.is_staff()));
create policy "media-private staff update" on storage.objects for update to authenticated
  using (bucket_id = 'media-private' and (select private.is_staff()))
  with check (bucket_id = 'media-private' and (select private.is_staff()));
create policy "media-private staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media-private' and (select private.is_staff()));

-- avatars
create policy "avatars own list" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
