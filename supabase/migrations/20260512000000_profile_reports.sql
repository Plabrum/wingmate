create table profile_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason      text not null,
  created_at  timestamptz not null default now()
);

alter table profile_reports enable row level security;

create policy "Users can insert their own reports"
  on profile_reports for insert
  with check (auth.uid() = reporter_id);
