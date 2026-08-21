-- Phase 4.6 Storage Migration
-- Execute this script in the Supabase SQL Editor to create the private `incident-evidence` bucket and establish necessary RLS policies.

-- 1. Create the bucket (private by default as public is false)
insert into storage.buckets (id, name, public) 
values ('incident-evidence', 'incident-evidence', false) 
on conflict do nothing;

-- 2. Allow authenticated users to upload evidence
create policy "Authenticated users can upload evidence" 
on storage.objects for insert 
with check ( bucket_id = 'incident-evidence' and auth.role() = 'authenticated' );

-- 3. Allow authenticated users to read evidence
create policy "Authenticated users can read evidence" 
on storage.objects for select 
using ( bucket_id = 'incident-evidence' and auth.role() = 'authenticated' );

-- 4. Allow authenticated users to delete evidence (required by evidenceService.deleteIncidentEvidence)
create policy "Authenticated users can delete evidence" 
on storage.objects for delete 
using ( bucket_id = 'incident-evidence' and auth.role() = 'authenticated' );
