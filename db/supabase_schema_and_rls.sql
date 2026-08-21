-- Supabase schema and RLS policies for CrisisSync
-- Run this in the Supabase SQL editor or via psql using the project connection string.
-- Service-role key is required for migration scripts that bypass RLS.

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles table (linked to auth users)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  notification_radius_km numeric default 3,
  alerts_enabled boolean default true,
  sms_backup_enabled boolean default true,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Incidents table
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  severity text,
  location text,
  latitude numeric,
  longitude numeric,
  distance_km numeric,
  created_at timestamptz default now(),
  user_id uuid references public.profiles(id) on delete set null,
  status text default 'Pending'
);

-- Alerts table
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  title text,
  message text,
  severity text,
  location text,
  created_at timestamptz default now(),
  active boolean default true
);

-- Indexes
create index if not exists idx_incidents_created_at on public.incidents (created_at desc);
create index if not exists idx_incidents_user_id on public.incidents (user_id);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.incidents enable row level security;
alter table public.alerts enable row level security;

-- Profiles policies
create policy if not exists profiles_insert_authenticated on public.profiles
  for insert using (auth.role() = 'authenticated');

create policy if not exists profiles_select_authenticated on public.profiles
  for select using (true);

create policy if not exists profiles_update_owner_or_admin on public.profiles
  for update using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Incidents policies
create policy if not exists incidents_insert_authenticated on public.incidents
  for insert with check (
    auth.role() = 'authenticated' and (user_id = auth.uid() or user_id is null)
  );

create policy if not exists incidents_select_authenticated on public.incidents
  for select using (true);

create policy if not exists incidents_update_owner_or_admin on public.incidents
  for update using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy if not exists incidents_delete_owner_or_admin on public.incidents
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Alerts policies
create policy if not exists alerts_select_authenticated on public.alerts
  for select using (true);

create policy if not exists alerts_insert_admin on public.alerts
  for insert using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy if not exists alerts_update_admin on public.alerts
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy if not exists alerts_delete_admin on public.alerts
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Notes:
-- 1) Use the Supabase SQL editor (https://app.supabase.com/project/<ref>/sql) and paste this file.
-- 2) For scripted migrations, use the Supabase service_role key from project settings and run inserts via the API or psql using the direct connection string.
-- 3) After running this, create an initial admin profile by inserting a row in `profiles` with `is_admin = true`.
