-- Phase 10: intended RLS policies for public.responses
-- Review only. Do not execute against Supabase without explicit manual approval.

drop policy if exists responses_select_admin_on_all on public.responses;
create policy responses_select_admin_on_all
  on public.responses for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
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
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists responses_update_admin on public.responses;
create policy responses_update_admin
  on public.responses for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
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
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );
