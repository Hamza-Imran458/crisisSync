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
DO $$
BEGIN
  CREATE POLICY audit_logs_insert_authenticated ON public.incident_audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY audit_logs_select_authenticated ON public.incident_audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for Evidence
DO $$
BEGIN
  CREATE POLICY evidence_insert_authenticated ON public.incident_evidence
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY evidence_select_authenticated ON public.incident_evidence
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Storage Bucket Configuration (Run manually if this fails due to permissions)
-- insert into storage.buckets (id, name, public) values ('incident-evidence', 'incident-evidence', false) on conflict do nothing;
-- create policy if not exists "Authenticated users can upload evidence" on storage.objects for insert with check ( bucket_id = 'incident-evidence' and auth.role() = 'authenticated' );
-- create policy if not exists "Authenticated users can read evidence" on storage.objects for select using ( bucket_id = 'incident-evidence' and auth.role() = 'authenticated' );
