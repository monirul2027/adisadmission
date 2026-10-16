-- Keep the founding account's Super Admin capability permanent even if its email changes.
create or replace function private.protect_admin_permission_rows()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_founder boolean;
begin
  if tg_op = 'DELETE' then
    if old.is_super_admin or exists (
      select 1 from auth.users u where u.id = old.user_id and lower(u.email) = 'alordishaislamicschool@gmail.com'
    ) then
      raise exception 'The founding Super Admin record cannot be removed';
    end if;
    return old;
  end if;

  select lower(u.email) = 'alordishaislamicschool@gmail.com'
    into v_founder from auth.users u where u.id = new.user_id;
  if tg_op = 'UPDATE' and old.is_super_admin then
    if new.user_id <> old.user_id then raise exception 'The founding Super Admin identity cannot be changed'; end if;
    new.is_super_admin := true;
    new.is_active := true;
  elsif v_founder then
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
