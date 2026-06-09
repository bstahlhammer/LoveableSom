-- User-controlled profile table.
-- Separate from user_profiles (which is auto-synced from auth.users via trigger).
-- Stores the taste profile JSONB and display name, keyed by user_id.

create table if not exists profiles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  taste_profile jsonb,
  taste_profile_updated_at timestamptz,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile" on profiles
  for select using (auth.uid() = user_id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = user_id);
