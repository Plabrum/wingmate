-- The avatars bucket was created without public=true in the init migration,
-- and the later insert used ON CONFLICT DO NOTHING so it was never corrected.
update storage.buckets set public = true where id = 'avatars';
