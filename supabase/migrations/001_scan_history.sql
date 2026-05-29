-- Run this once in the Supabase SQL editor at:
-- https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/sql/new

-- ── Storage bucket ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scan-photos',
  'scan-photos',
  false,
  10485760, -- 10 MB
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Storage RLS: users can only touch files under their own user-id folder
create policy "Users upload own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'scan-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own photos"
  on storage.objects for select
  using (
    bucket_id = 'scan-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'scan-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── scans table ────────────────────────────────────────────────────────────────
create table if not exists scans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  created_at      timestamptz default now() not null,
  photo_path      text,
  wine_count      int default 0 not null,
  buying_for      text,
  location_label  text,
  place_id        text,
  place_address   text,
  place_lat       double precision,
  place_lng       double precision
);

alter table scans enable row level security;

create policy "Users CRUD own scans"
  on scans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── scan_wines table ───────────────────────────────────────────────────────────
create table if not exists scan_wines (
  id       uuid primary key default gen_random_uuid(),
  scan_id  uuid references scans(id) on delete cascade not null,
  user_id  uuid references auth.users(id) on delete cascade not null,
  position int default 0 not null,
  wine     jsonb not null
);

alter table scan_wines enable row level security;

create policy "Users CRUD own scan wines"
  on scan_wines for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for fast per-scan wine lookups
create index if not exists scan_wines_scan_id_idx on scan_wines (scan_id, position);
