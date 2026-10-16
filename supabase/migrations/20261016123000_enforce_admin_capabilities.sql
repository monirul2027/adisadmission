-- Enforce admin capabilities for file storage and protect integration sync state.

create or replace function private.enforce_admin_application_permissions()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_admin boolean := private.has_role(auth.uid(), 'admin'::public.app_role);
  v_workflow_changed boolean;
  v_content_changed boolean;
  v_sync_changed boolean;
begin
  if auth.role() = 'service_role' or auth.uid() is null then return new; end if;
  v_workflow_changed := new.status is distinct from old.status or new.student_code is distinct from old.student_code;
  v_sync_changed := new.is_synced is distinct from old.is_synced
    or new.is_fee_synced is distinct from old.is_fee_synced
    or new.fee_sync_status is distinct from old.fee_sync_status
    or new.fee_sync_error is distinct from old.fee_sync_error
    or new.fee_sync_section is distinct from old.fee_sync_section
    or new.fee_sync_roll_number is distinct from old.fee_sync_roll_number
    or new.fee_sync_admission_fee is distinct from old.fee_sync_admission_fee
    or new.fee_sync_monthly_fee is distinct from old.fee_sync_monthly_fee;
  v_content_changed := (to_jsonb(new) - array['status','student_code','is_synced','is_fee_synced','fee_sync_status','fee_sync_error','fee_sync_section','fee_sync_roll_number','fee_sync_admission_fee','fee_sync_monthly_fee','created_at','updated_at'])
    is distinct from
    (to_jsonb(old) - array['status','student_code','is_synced','is_fee_synced','fee_sync_status','fee_sync_error','fee_sync_section','fee_sync_roll_number','fee_sync_admission_fee','fee_sync_monthly_fee','created_at','updated_at']);
  if v_sync_changed then raise exception 'Sync state can only be updated by the trusted sync service'; end if;
  if v_admin then
    if v_workflow_changed and not private.admin_has_permission(auth.uid(), 'can_approve_reject') then
      raise exception 'You do not have permission to approve or change application status';
    end if;
    if v_content_changed and not private.admin_has_permission(auth.uid(), 'can_edit_applications') then
      raise exception 'You do not have permission to edit application information';
    end if;
  elsif new.status is distinct from old.status or new.student_code is distinct from old.student_code then
    raise exception 'Applicants cannot change application status or student code';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_admin_test_permissions()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_admin boolean := private.has_role(auth.uid(), 'admin'::public.app_role);
  v_workflow_changed boolean;
  v_content_changed boolean;
begin
  if auth.role() = 'service_role' or auth.uid() is null then return new; end if;
  v_workflow_changed := new.status is distinct from old.status or new.roll_no is distinct from old.roll_no;
  v_content_changed := (to_jsonb(new) - array['status','roll_no','created_at','updated_at'])
    is distinct from (to_jsonb(old) - array['status','roll_no','created_at','updated_at']);
  if v_admin then
    if v_workflow_changed and not private.admin_has_permission(auth.uid(), 'can_approve_reject') then
      raise exception 'You do not have permission to approve or change test status';
    end if;
    if v_content_changed and not private.admin_has_permission(auth.uid(), 'can_edit_applications') then
      raise exception 'You do not have permission to edit application information';
    end if;
  elsif new.status is distinct from old.status or new.roll_no is distinct from old.roll_no then
    raise exception 'Applicants cannot change test status or roll number';
  end if;
  return new;
end;
$$;

drop policy if exists "Admins can upload signatures" on storage.objects;
create policy "Settings managers can upload signatures" on storage.objects for insert to authenticated
  with check (bucket_id = 'signature-uploads' and private.admin_has_permission((select auth.uid()), 'can_manage_settings'));
drop policy if exists "Admins can update signatures" on storage.objects;
create policy "Settings managers can update signatures" on storage.objects for update to authenticated
  using (bucket_id = 'signature-uploads' and private.admin_has_permission((select auth.uid()), 'can_manage_settings'))
  with check (bucket_id = 'signature-uploads' and private.admin_has_permission((select auth.uid()), 'can_manage_settings'));

drop policy if exists "Admins upload site assets" on storage.objects;
create policy "Site editors upload site assets" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-assets' and private.admin_has_permission((select auth.uid()), 'can_edit_site'));
drop policy if exists "Admins update site assets" on storage.objects;
create policy "Site editors update site assets" on storage.objects for update to authenticated
  using (bucket_id = 'site-assets' and private.admin_has_permission((select auth.uid()), 'can_edit_site'))
  with check (bucket_id = 'site-assets' and private.admin_has_permission((select auth.uid()), 'can_edit_site'));
drop policy if exists "Admins delete site assets" on storage.objects;
create policy "Site editors delete site assets" on storage.objects for delete to authenticated
  using (bucket_id = 'site-assets' and private.admin_has_permission((select auth.uid()), 'can_edit_site'));

drop policy if exists "Admins upload student documents" on storage.objects;
create policy "Application editors upload student documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'student-documents' and private.admin_has_permission((select auth.uid()), 'can_edit_applications'));
drop policy if exists "Admins update student documents" on storage.objects;
create policy "Application editors update student documents" on storage.objects for update to authenticated
  using (bucket_id = 'student-documents' and private.admin_has_permission((select auth.uid()), 'can_edit_applications'))
  with check (bucket_id = 'student-documents' and private.admin_has_permission((select auth.uid()), 'can_edit_applications'));
drop policy if exists "Admins delete student documents" on storage.objects;
create policy "Application editors delete student documents" on storage.objects for delete to authenticated
  using (bucket_id = 'student-documents' and private.admin_has_permission((select auth.uid()), 'can_edit_applications'));

drop policy if exists "Admins upload student photos" on storage.objects;
create policy "Application editors upload student photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'student-photos' and private.admin_has_permission((select auth.uid()), 'can_edit_applications'));
drop policy if exists "Admins update student photos" on storage.objects;
create policy "Application editors update student photos" on storage.objects for update to authenticated
  using (bucket_id = 'student-photos' and private.admin_has_permission((select auth.uid()), 'can_edit_applications'))
  with check (bucket_id = 'student-photos' and private.admin_has_permission((select auth.uid()), 'can_edit_applications'));
drop policy if exists "Admins delete student photos" on storage.objects;
create policy "Application editors delete student photos" on storage.objects for delete to authenticated
  using (bucket_id = 'student-photos' and private.admin_has_permission((select auth.uid()), 'can_edit_applications'));
