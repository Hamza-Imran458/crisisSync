-- Phase 4.6 Storage Migration
-- Execute this script in the Supabase SQL Editor to create the private `incident-evidence` bucket and establish necessary RLS policies.

-- 1. Create the bucket (private by default as public is false)
insert into storage.buckets (id, name, public) 
values ('incident-evidence', 'incident-evidence', false) 
on conflict do nothing;

-- 2. Allow authorized incident participants to upload evidence
drop policy if exists "Authenticated users can upload evidence" on storage.objects;
create policy "Authenticated users can upload evidence"
on storage.objects for insert 
to authenticated
with check (
	bucket_id = 'incident-evidence'
	and exists (
		select 1
		from public.incidents i
		where i.id::text = split_part(name, '/', 1)
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

-- 3. Allow authorized incident participants to read evidence
drop policy if exists "Authenticated users can read evidence" on storage.objects;
create policy "Authenticated users can read evidence"
on storage.objects for select 
to authenticated
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
					select 1
					from public.profiles p
					where p.id = auth.uid() and p.is_admin = true
				)
			)
	)
);

-- 4. Allow authorized incident participants to delete evidence
drop policy if exists "Authenticated users can delete evidence" on storage.objects;
create policy "Authenticated users can delete evidence"
on storage.objects for delete 
to authenticated
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
					select 1
					from public.profiles p
					where p.id = auth.uid() and p.is_admin = true
				)
			)
	)
);
