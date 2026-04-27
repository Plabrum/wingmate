-- Wingperson-suggested photos: give both parties RLS control over the
-- profile_photos row, and let the winger upload directly into the dater's
-- storage folder. The dater always owns the folder so the existing
-- folder-owner storage DELETE policy already covers their case; we widen
-- it just enough to let the suggester delete the specific file they
-- uploaded (so withdrawal works without orphaning the storage object).

create or replace function public.is_active_wingperson(_dater uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.contacts
    where user_id = _dater
      and winger_id = auth.uid()
      and wingperson_status = 'active'
  );
$$;

-- profile_photos INSERT: owner OR active wingperson (with suggester_id = auth.uid())
drop policy if exists "Users can insert photos for their own profile" on public.profile_photos;

create policy "Owner or active wingperson can insert photos"
  on public.profile_photos for insert to authenticated
  with check (
    exists (
      select 1 from public.dating_profiles dp
      where dp.id = profile_photos.dating_profile_id
        and (
          dp.user_id = auth.uid()
          or (suggester_id = auth.uid() and public.is_active_wingperson(dp.user_id))
        )
    )
  );

-- profile_photos DELETE: owner OR the suggester
drop policy if exists "Users can delete photos for their own profile" on public.profile_photos;

create policy "Owner or suggester can delete photos"
  on public.profile_photos for delete to authenticated
  using (
    exists (
      select 1 from public.dating_profiles dp
      where dp.id = profile_photos.dating_profile_id
        and dp.user_id = auth.uid()
    )
    or suggester_id = auth.uid()
  );

-- storage.objects INSERT on profile-photos: own folder OR active wingperson
-- uploading into the dater's folder. Keeps the folder-owner shape for
-- DELETE/UPDATE intact — every storage delete still resolves via
-- (storage.foldername(name))[1] = auth.uid()::text.
drop policy if exists "Users can upload to their own photo folder" on storage.objects;

create policy "Own folder or active wingperson folder can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_active_wingperson(((storage.foldername(name))[1])::uuid)
    )
  );

-- storage.objects DELETE on profile-photos: folder owner (the dater for
-- self-uploads and for any winger-suggested file) OR the original suggester
-- of the matching profile_photos row (so a winger can withdraw a suggestion
-- they uploaded into someone else's folder).
create index if not exists profile_photos_storage_url_idx
  on public.profile_photos (storage_url);

drop policy if exists "Users can delete files in their own photo folder" on storage.objects;

create policy "Folder owner or suggester can delete profile photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profile_photos pp
        where pp.storage_url = name
          and pp.suggester_id = auth.uid()
      )
    )
  );
