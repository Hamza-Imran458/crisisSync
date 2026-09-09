-- Phase 9: Response workflow schema
create extension if not exists "pgcrypto";

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  status text not null default 'Dispatched' check (status in ('Dispatched', 'Acknowledged', 'On Scene', 'Completed', 'Cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_responses_incident_id on public.responses (incident_id);
create index if not exists idx_responses_assigned_to on public.responses (assigned_to);
create index if not exists idx_responses_status on public.responses (status);

alter table public.responses enable row level security;

drop policy if exists responses_select_admin_on_all on public.responses;
create policy responses_select_admin_on_all
  on public.responses for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists responses_select_assigned_operator on public.responses;
create policy responses_select_assigned_operator
  on public.responses for select
  using (
    assigned_to = auth.uid()
  );

drop policy if exists responses_insert_admin on public.responses;
create policy responses_insert_admin
  on public.responses for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists responses_update_admin on public.responses;
create policy responses_update_admin
  on public.responses for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists responses_update_assigned_operator on public.responses;
create policy responses_update_assigned_operator
  on public.responses for update
  using (
    assigned_to = auth.uid()
  )
  with check (
    assigned_to = auth.uid()
  );

drop policy if exists responses_delete_admin on public.responses;
create policy responses_delete_admin
  on public.responses for delete
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Expand evidence and audit access for operators after the responses table exists.
drop policy if exists audit_logs_select_authenticated on public.incident_audit_logs;
create policy audit_logs_select_authenticated on public.incident_audit_logs
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
    or exists (
      select 1 from public.incidents i
      where i.id = incident_audit_logs.incident_id and i.user_id = auth.uid()
    )
    or exists (
      select 1 from public.responses r
      where r.incident_id = incident_audit_logs.incident_id
        and r.assigned_to = auth.uid()
    )
  );

drop policy if exists evidence_insert_authenticated on public.incident_evidence;
drop policy if exists evidence_select_authenticated on public.incident_evidence;
drop policy if exists evidence_delete_authenticated on public.incident_evidence;

create policy evidence_insert_authenticated on public.incident_evidence
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.incidents i
      where i.id = incident_evidence.incident_id
        and (
          i.user_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
          or exists (
            select 1 from public.responses r
            where r.incident_id = i.id and r.assigned_to = auth.uid()
          )
        )
    )
  );

create policy evidence_select_authenticated on public.incident_evidence
  for select to authenticated
  using (
    exists (
      select 1 from public.incidents i
      where i.id = incident_evidence.incident_id
        and (
          i.user_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
          or exists (
            select 1 from public.responses r
            where r.incident_id = i.id and r.assigned_to = auth.uid()
          )
        )
    )
  );

create policy evidence_delete_authenticated on public.incident_evidence
  for delete to authenticated
  using (
    exists (
      select 1 from public.incidents i
      where i.id = incident_evidence.incident_id
        and (
          i.user_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
          or exists (
            select 1 from public.responses r
            where r.incident_id = i.id and r.assigned_to = auth.uid()
          )
        )
    )
  );

drop policy if exists "Authenticated users can upload evidence" on storage.objects;
create policy "Authenticated users can upload evidence"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'incident-evidence'
    and exists (
      select 1 from public.incidents i
      where i.id::text = split_part(name, '/', 1)
        and (
          i.user_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
          or exists (
            select 1 from public.responses r
            where r.incident_id = i.id and r.assigned_to = auth.uid()
          )
        )
    )
  );

drop policy if exists "Authenticated users can read evidence" on storage.objects;
create policy "Authenticated users can read evidence"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'incident-evidence'
    and exists (
      select 1
      from public.incident_evidence e
      join public.incidents i on i.id = e.incident_id
      where e.file_path = name
        and (
          i.user_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
          or exists (
            select 1 from public.responses r
            where r.incident_id = i.id and r.assigned_to = auth.uid()
          )
        )
    )
  );

drop policy if exists "Authenticated users can delete evidence" on storage.objects;
create policy "Authenticated users can delete evidence"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'incident-evidence'
    and exists (
      select 1
      from public.incident_evidence e
      join public.incidents i on i.id = e.incident_id
      where e.file_path = name
        and (
          i.user_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
          or exists (
            select 1 from public.responses r
            where r.incident_id = i.id and r.assigned_to = auth.uid()
          )
        )
    )
  );
