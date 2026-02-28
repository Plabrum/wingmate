-- Profiles table (mirrors auth.users)
create table public.profiles (
  id         uuid references auth.users on delete cascade not null primary key,
  updated_at timestamptz,
  username   text unique,
  full_name  text,
  avatar_url text,
  website    text,

  constraint username_length check (char_length(username) >= 3)
);

-- Row-level security
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using (true);

create policy "Users can insert their own profile."
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile."
  on profiles for update
  using (auth.uid() = id);

-- Automatically create a profile row for new users
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Avatars storage bucket
insert into storage.buckets (id, name)
  values ('avatars', 'avatars');

create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check (bucket_id = 'avatars');
