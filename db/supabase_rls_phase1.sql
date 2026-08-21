-- Phase 1 security model for CrisisSync
-- This migration introduces a profile-backed role model and stricter incident/alert policies.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists role text default 'citizen';

create index if not exists idx_profiles_role on public.profiles (role);

alter table public.incidents
  add column if not exists updated_at timestamptz default now();

alter table public.alerts
  add column if not exists updated_at timestamptz default now();

-- Ensure invalid roles cannot be inserted.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('citizen', 'operator', 'admin'));

-- Incident status validation.
alter table public.incidents
  drop constraint if exists incidents_status_check;

alter table public.incidents
  add constraint incidents_status_check
  check (status in ('SUBMITTED','PENDING_REVIEW','VERIFIED','REJECTED','ACTIVE','RESOLVED'));

-- Alert severity validation.
alter table public.alerts
  drop constraint if exists alerts_severity_check;

alter table public.alerts
  add constraint alerts_severity_check
  check (severity in ('info','warning','emergency'));

-- Recreate RLS policies with least-privilege rules.

drop policy if exists profiles_insert_authenticated on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_update_owner_or_admin on public.profiles;

drop policy if exists incidents_insert_authenticated on public.incidents;
drop policy if exists incidents_select_authenticated on public.incidents;
drop policy if exists incidents_update_owner_or_admin on public.incidents;
drop policy if exists incidents_delete_owner_or_admin on public.incidents;

drop policy if exists alerts_select_authenticated on public.alerts;
drop policy if exists alerts_insert_admin on public.alerts;
drop policy if exists alerts_update_admin on public.alerts;
drop policy if exists alerts_delete_admin on public.alerts;

create policy profiles_insert_authenticated
  on public.profiles for insert
  with check (auth.role() = 'authenticated');

create policy profiles_select_authenticated
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy profiles_update_owner_or_admin
  on public.profiles for update
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy incidents_insert_authenticated
  on public.incidents for insert
  with check (
    auth.role() = 'authenticated'
    and (
      user_id = auth.uid()
      or user_id is null
    )
  );

create policy incidents_select_authenticated
  on public.incidents for select
  using (auth.role() = 'authenticated');

create policy incidents_update_admin_or_owner
  on public.incidents for update
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('operator','admin')
    )
  );

create policy incidents_delete_admin_only
  on public.incidents for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy alerts_select_authenticated
  on public.alerts for select
  using (auth.role() = 'authenticated');

create policy alerts_insert_admin_only
  on public.alerts for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('operator','admin')
    )
  );

create policy alerts_update_admin_only
  on public.alerts for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('operator','admin')
    )
  );

create policy alerts_delete_admin_only
  on public.alerts for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
