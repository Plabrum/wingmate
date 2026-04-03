-- Create avatars bucket for user profile pictures.
-- Visibility is enforced at the application layer: only active wingers
-- receive the avatar URL in their queries.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Users can upload/replace their own avatar (one file per user: <uid>.jpg)
create policy "avatar_owner_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name = (auth.uid()::text || '.jpg'));

create policy "avatar_owner_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name = (auth.uid()::text || '.jpg'));

create policy "avatar_owner_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and name = (auth.uid()::text || '.jpg'));

-- Public read: anyone with the URL can load the image (URL only surfaced to wingers in-app)
create policy "avatar_public_read"
  on storage.objects for select to public
  using (bucket_id = 'avatars');
