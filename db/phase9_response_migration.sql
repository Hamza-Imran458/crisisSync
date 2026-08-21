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

create policy if not exists responses_select_admin_on_all
  on public.responses for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy if not exists responses_select_assigned_operator
  on public.responses for select
  using (
    assigned_to = auth.uid()
  );

create policy if not exists responses_insert_admin
  on public.responses for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy if not exists responses_update_admin
  on public.responses for update
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy if not exists responses_update_assigned_operator
  on public.responses for update
  using (
    assigned_to = auth.uid()
  )
  with check (
    assigned_to = auth.uid()
  );

create policy if not exists responses_delete_admin
  on public.responses for delete
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
