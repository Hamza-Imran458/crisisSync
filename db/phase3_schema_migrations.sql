-- Phase 3 Schema Migrations for CrisisSync
-- Run this in the Supabase SQL editor or via psql using the project connection string.

-- 1. Incident Audit Logs
create table if not exists public.incident_audit_logs (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete cascade not null,
  event_type text not null,
  previous_status text,
  new_status text,
  actor_id uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz default now()
);

create index if not exists idx_audit_incident on public.incident_audit_logs (incident_id);
create index if not exists idx_audit_created_at on public.incident_audit_logs (created_at desc);

-- 2. Incident Evidence
create table if not exists public.incident_evidence (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete cascade not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_path text not null,
  file_type text not null,
  created_at timestamptz default now()
);

create index if not exists idx_evidence_incident on public.incident_evidence (incident_id);

-- Enable RLS
alter table public.incident_audit_logs enable row level security;
alter table public.incident_evidence enable row level security;

-- Policies for Audit Logs
drop policy if exists audit_logs_insert_authenticated on public.incident_audit_logs;
drop policy if exists audit_logs_select_authenticated on public.incident_audit_logs;

create policy audit_logs_insert_authenticated on public.incident_audit_logs
  for insert to authenticated
  with check (
    auth.uid() is not null
    and (
      actor_id = auth.uid()
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid() and p.is_admin = true
      )
    )
  );

create policy audit_logs_select_authenticated on public.incident_audit_logs
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
    or exists (
      select 1
      from public.incidents i
      where i.id = incident_audit_logs.incident_id
        and i.user_id = auth.uid()
    )
  );

-- Policies for Evidence
drop policy if exists evidence_insert_authenticated on public.incident_evidence;
drop policy if exists evidence_select_authenticated on public.incident_evidence;
drop policy if exists evidence_delete_authenticated on public.incident_evidence;

create policy evidence_insert_authenticated on public.incident_evidence
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.incidents i
      where i.id = incident_evidence.incident_id
        and (
          i.user_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
        )
    )
    and uploaded_by = auth.uid()
  );

create policy evidence_select_authenticated on public.incident_evidence
  for select to authenticated
  using (
    exists (
      select 1
      from public.incidents i
      where i.id = incident_evidence.incident_id
        and (
          i.user_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
        )
    )
  );

create policy evidence_delete_authenticated on public.incident_evidence
  for delete to authenticated
  using (
    exists (
      select 1
      from public.incidents i
      where i.id = incident_evidence.incident_id
        and (
          i.user_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
        )
    )
  );

-- 3. Storage Bucket Configuration (Run manually if this fails due to permissions)
-- insert into storage.buckets (id, name, public) values ('incident-evidence', 'incident-evidence', false) on conflict do nothing;
-- Storage object policies are defined in phase4.6_storage_migration.sql.
