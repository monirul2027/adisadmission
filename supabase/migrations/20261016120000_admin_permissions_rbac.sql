-- Admin RBAC: explicit capabilities for the existing admin role.
-- This migration does not alter applications, admission tests, or student-code generation.

create table if not exists public.admin_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  is_super_admin boolean not null default false,
  can_approve_reject boolean not null default true,
  can_sync_system boolean not null default false,
  can_edit_applications boolean not null default false,
  can_edit_site boolean not null default false,
  can_manage_settings boolean not null default false,
  can_export_data boolean not null default false,
  is_active boolean not null default true,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_permissions enable row level security;
revoke all on public.admin_permissions from anon, authenticated;
grant select, insert, update, delete on public.admin_permissions to authenticated;
grant all on public.admin_permissions to service_role;

-- Seed all existing admins without changing their roles or any application data.
insert into public.admin_permissions (user_id, full_name, email, is_super_admin)
select u.id,
       coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
       u.email,
       lower(u.email) = 'alordishaislamicschool@gmail.com'
from auth.users u
join public.user_roles ur on ur.user_id = u.id and ur.role = 'admin'::public.app_role
on conflict (user_id) do update
set email = excluded.email,
    is_super_admin = (lower(public.admin_permissions.email) = 'alordishaislamicschool@gmail.com');

create or replace function private.admin_has_permission(_user_id uuid, _permission text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.admin_permissions ap on ap.user_id = ur.user_id
    where ur.user_id = _user_id
      and ur.role = 'admin'::public.app_role
      and ap.is_active
      and case _permission
        when 'is_super_admin' then ap.is_super_admin
        when 'can_approve_reject' then ap.is_super_admin or ap.can_approve_reject
        when 'can_sync_system' then ap.is_super_admin or ap.can_sync_system
        when 'can_edit_applications' then ap.is_super_admin or ap.can_edit_applications
        when 'can_edit_site' then ap.is_super_admin or ap.can_edit_site
        when 'can_manage_settings' then ap.is_super_admin or ap.can_manage_settings
        when 'can_export_data' then ap.is_super_admin or ap.can_export_data
        when 'is_active' then ap.is_active
        else false
      end
  );
$$;
revoke all on function private.admin_has_permission(uuid, text) from public, anon;
grant execute on function private.admin_has_permission(uuid, text) to authenticated, service_role;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select case when _role = 'admin'::public.app_role
    then private.admin_has_permission(_user_id, 'is_active')
    else exists (
      select 1 from public.user_roles ur
      where ur.user_id = _user_id and ur.role = _role
    )
  end;
$$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$ select private.has_role(_user_id, _role); $$;

create policy "Admins read own permissions"
  on public.admin_permissions for select to authenticated
  using (user_id = (select auth.uid()) or private.admin_has_permission((select auth.uid()), 'is_super_admin'));
create policy "Super admins manage permissions"
  on public.admin_permissions for all to authenticated
  using (private.admin_has_permission((select auth.uid()), 'is_super_admin'))
  with check (private.admin_has_permission((select auth.uid()), 'is_super_admin'));

create or replace function private.protect_admin_permission_rows()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_founder boolean;
begin
  select lower(u.email) = 'alordishaislamicschool@gmail.com'
    into v_founder from auth.users u where u.id = coalesce(new.user_id, old.user_id);

  if tg_op = 'DELETE' then
    if old.is_super_admin or v_founder then
      raise exception 'The founding Super Admin record cannot be removed';
    end if;
    return old;
  end if;

  if v_founder then
    new.is_super_admin := true;
    new.is_active := true;
  elsif new.is_super_admin then
    raise exception 'Only the founding school account can be a Super Admin';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.protect_admin_permission_rows() from public, anon, authenticated;
create trigger protect_admin_permission_rows
  before insert or update or delete on public.admin_permissions
  for each row execute function private.protect_admin_permission_rows();

-- Restrict privileged changes even when an active admin can update an application row.
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
begin
  if auth.role() = 'service_role' or auth.uid() is null then return new; end if;

  v_workflow_changed := new.status is distinct from old.status
    or new.student_code is distinct from old.student_code;
  v_content_changed := (to_jsonb(new) - array['status','student_code','is_synced','is_fee_synced','fee_sync_status','fee_sync_error','fee_sync_section','fee_sync_roll_number','fee_sync_admission_fee','fee_sync_monthly_fee','created_at','updated_at'])
    is distinct from
    (to_jsonb(old) - array['status','student_code','is_synced','is_fee_synced','fee_sync_status','fee_sync_error','fee_sync_section','fee_sync_roll_number','fee_sync_admission_fee','fee_sync_monthly_fee','created_at','updated_at']);

  if v_admin then
    if v_workflow_changed and not private.admin_has_permission(auth.uid(), 'can_approve_reject') then
      raise exception 'You do not have permission to approve or change application status';
    end if;
    if v_content_changed and not private.admin_has_permission(auth.uid(), 'can_edit_applications') then
      raise exception 'You do not have permission to edit application information';
    end if;
  elsif new.status is distinct from old.status or new.student_code is distinct from old.student_code
      or new.is_synced is distinct from old.is_synced or new.is_fee_synced is distinct from old.is_fee_synced then
    raise exception 'Applicants cannot change application status or sync state';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_admin_application_permissions() from public, anon, authenticated;
drop trigger if exists enforce_admin_application_permissions on public.applications;
create trigger enforce_admin_application_permissions
  before update on public.applications
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
revoke all on function private.enforce_admin_test_permissions() from public, anon, authenticated;
drop trigger if exists enforce_admin_test_permissions on public.admission_tests;
create trigger enforce_admin_test_permissions
  before update on public.admission_tests
  for each row execute function private.enforce_admin_test_permissions();

drop policy if exists "Admins can insert settings" on public.form_settings;
create policy "Settings managers can insert settings" on public.form_settings for insert to authenticated
  with check (private.admin_has_permission((select auth.uid()), 'can_manage_settings'));
drop policy if exists "Admins update settings" on public.form_settings;
create policy "Settings managers update settings" on public.form_settings for update to authenticated
  using (private.admin_has_permission((select auth.uid()), 'can_manage_settings'))
  with check (private.admin_has_permission((select auth.uid()), 'can_manage_settings'));

drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Site editors manage site settings" on public.site_settings for all to authenticated
  using (private.admin_has_permission((select auth.uid()), 'can_edit_site'))
  with check (private.admin_has_permission((select auth.uid()), 'can_edit_site'));
drop policy if exists "Allow admins full access on sections" on public.site_sections;
create policy "Site editors manage sections" on public.site_sections for all to authenticated
  using (private.admin_has_permission((select auth.uid()), 'can_edit_site'))
  with check (private.admin_has_permission((select auth.uid()), 'can_edit_site'));
