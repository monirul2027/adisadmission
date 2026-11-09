-- Fix Issue 1.1 (Storage SELECT & cleanup policies on student-photos & student-documents)
-- and Issue 1.2 (Restrict applications & admission_tests UPDATE strictly to active admins).
-- Aligned with live database policy names ("Students read own photos", "Students read own documents",
-- "Students update own, admins update all", "Update tests") without altering any unrelated rules or functions.

-- ============================================================================
-- 1. Issue 1.1: Restrict student-photos & student-documents SELECT policies
--    to the student owner (uploader or application/test owner) and active admins
-- ============================================================================

create or replace function private.can_read_student_storage_object(
  _bucket_id text,
  _object_name text,
  _owner uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    auth.uid() is not null
    and _bucket_id in ('student-photos', 'student-documents')
    and (
      -- 1. Any active administrator (Super Admin or active staff admin)
      private.has_role(auth.uid(), 'admin'::public.app_role)
      -- 2. The authenticated user who uploaded the object directly
      or (_owner is not null and _owner = auth.uid())
      -- 3. The student owner of the application or test record referencing this file path
      --    (covers legacy files or replacement files uploaded by an admin on the student's behalf)
      or (
        _bucket_id = 'student-photos'
        and exists (
          select 1
          from public.applications a
          where a.user_id = auth.uid()
            and a.photo_url = _object_name
        )
      )
      or (
        _bucket_id = 'student-documents'
        and (
          exists (
            select 1
            from public.applications a
            where a.user_id = auth.uid()
              and _object_name in (a.aadhar_doc_url, a.birth_cert_url, a.guardian_signature_url)
          )
          or exists (
            select 1
            from public.admission_tests t
            where t.user_id = auth.uid()
              and t.student_signature_url = _object_name
          )
        )
      )
    );
$$;

revoke all on function private.can_read_student_storage_object(text, text, uuid) from public, anon;
grant execute on function private.can_read_student_storage_object(text, text, uuid) to authenticated, service_role;

create or replace function private.can_cleanup_unattached_student_upload(
  _bucket_id text,
  _object_name text,
  _owner uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    auth.uid() is not null
    and _owner is not null
    and _owner = auth.uid()
    and _bucket_id in ('student-photos', 'student-documents')
    and not exists (
      select 1
      from public.applications a
      where a.photo_url = _object_name
         or a.aadhar_doc_url = _object_name
         or a.birth_cert_url = _object_name
         or a.guardian_signature_url = _object_name
    )
    and not exists (
      select 1
      from public.admission_tests t
      where t.student_signature_url = _object_name
    );
$$;

revoke all on function private.can_cleanup_unattached_student_upload(text, text, uuid) from public, anon;
grant execute on function private.can_cleanup_unattached_student_upload(text, text, uuid) to authenticated, service_role;

drop policy if exists "Authenticated read photos" on storage.objects;
drop policy if exists "Students read own photos" on storage.objects;
create policy "Students read own photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'student-photos'
    and (
      owner_id = (select (auth.uid())::text)
      or private.can_read_student_storage_object(bucket_id, name, owner)
    )
  );

drop policy if exists "Authenticated read documents" on storage.objects;
drop policy if exists "Students read own documents" on storage.objects;
create policy "Students read own documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'student-documents'
    and (
      owner_id = (select (auth.uid())::text)
      or private.can_read_student_storage_object(bucket_id, name, owner)
    )
  );

-- Allow uploaders to clean up their own unattached temporary uploads if a form submission fails
drop policy if exists "Uploaders cleanup unattached student photos" on storage.objects;
create policy "Uploaders cleanup unattached student photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'student-photos'
    and private.can_cleanup_unattached_student_upload(bucket_id, name, owner)
  );

drop policy if exists "Uploaders cleanup unattached student documents" on storage.objects;
create policy "Uploaders cleanup unattached student documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'student-documents'
    and private.can_cleanup_unattached_student_upload(bucket_id, name, owner)
  );

-- ============================================================================
-- 2. Issue 1.2: Restrict UPDATE on applications & admission_tests strictly to
--    active administrators (RLS + BEFORE UPDATE trigger enforcement)
-- ============================================================================

drop policy if exists "Students update own, admins update all" on public.applications;
create policy "Students update own, admins update all"
  on public.applications for update
  to authenticated
  using (
    private.admin_has_permission((select auth.uid()), 'is_super_admin')
    or (
      private.has_role((select auth.uid()), 'admin'::public.app_role)
      and (select auth.uid()) = user_id
    )
  )
  with check (
    private.admin_has_permission((select auth.uid()), 'is_super_admin')
    or (
      private.has_role((select auth.uid()), 'admin'::public.app_role)
      and (select auth.uid()) = user_id
    )
  );

drop policy if exists "Update tests" on public.admission_tests;
create policy "Update tests"
  on public.admission_tests for update
  to authenticated
  using (
    private.admin_has_permission((select auth.uid()), 'is_super_admin')
    or (
      private.has_role((select auth.uid()), 'admin'::public.app_role)
      and (select auth.uid()) = user_id
    )
  )
  with check (
    private.admin_has_permission((select auth.uid()), 'is_super_admin')
    or (
      private.has_role((select auth.uid()), 'admin'::public.app_role)
      and (select auth.uid()) = user_id
    )
  );

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

  if tg_op = 'INSERT' then
    if new.status is distinct from 'Pending' or new.student_code is not null or coalesce(new.is_synced, false) or coalesce(new.is_fee_synced, false) then
      raise exception 'New admission applications must be Pending and unsynced';
    end if;
    return new;
  end if;

  if not v_admin then
    raise exception 'Only administrators can update submitted applications';
  end if;

  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.application_id is distinct from old.application_id then
    raise exception 'Application identity fields cannot be modified';
  end if;

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
    is distinct from (to_jsonb(old) - array['status','student_code','is_synced','is_fee_synced','fee_sync_status','fee_sync_error','fee_sync_section','fee_sync_roll_number','fee_sync_admission_fee','fee_sync_monthly_fee','created_at','updated_at']);

  if v_sync_changed then
    raise exception 'Sync state can only be updated by the trusted sync service';
  end if;
  if v_workflow_changed and not private.admin_has_permission(auth.uid(), 'can_approve_reject') then
    raise exception 'You do not have permission to approve or change application status';
  end if;
  if v_content_changed and not private.admin_has_permission(auth.uid(), 'can_edit_applications') then
    raise exception 'You do not have permission to edit application information';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_admin_application_permissions() from public, anon, authenticated;
drop trigger if exists enforce_admin_application_permissions on public.applications;
create trigger enforce_admin_application_permissions
  before insert or update on public.applications
  for each row execute function private.enforce_admin_application_permissions();

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

  if tg_op = 'INSERT' then
    if new.status is distinct from 'Pending' or new.roll_no is not null then
      raise exception 'New admission test applications must be Pending and have no roll number';
    end if;
    return new;
  end if;

  if not v_admin then
    raise exception 'Only administrators can update submitted admission test records';
  end if;

  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.test_id is distinct from old.test_id then
    raise exception 'Admission test identity fields cannot be modified';
  end if;

  v_workflow_changed := new.status is distinct from old.status or new.roll_no is distinct from old.roll_no;
  v_content_changed := (to_jsonb(new) - array['status','roll_no','created_at','updated_at'])
    is distinct from (to_jsonb(old) - array['status','roll_no','created_at','updated_at']);

  if v_workflow_changed and not private.admin_has_permission(auth.uid(), 'can_approve_reject') then
    raise exception 'You do not have permission to approve or change test status';
  end if;
  if v_content_changed and not private.admin_has_permission(auth.uid(), 'can_edit_applications') then
    raise exception 'You do not have permission to edit application information';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_admin_test_permissions() from public, anon, authenticated;
drop trigger if exists enforce_admin_test_permissions on public.admission_tests;
create trigger enforce_admin_test_permissions
  before insert or update on public.admission_tests
  for each row execute function private.enforce_admin_test_permissions();
