-- Anonymous reads must not invoke an admin role helper.
-- The wrapper preserves the existing private role architecture for authenticated calls.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public, private, pg_temp as $$
  select private.has_role(_user_id, _role);
$$;
revoke all on function public.has_role(uuid, public.app_role) from public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

grant select on public.site_sections to anon, authenticated;
drop policy if exists "Public can read active site sections" on public.site_sections;
drop policy if exists "Admins manage site sections" on public.site_sections;
drop policy if exists "Allow public read active sections" on public.site_sections;
drop policy if exists "Allow admins full access on sections" on public.site_sections;
create policy "Allow public read active sections" on public.site_sections
  for select to anon, authenticated using (is_active = true);
create policy "Allow admins full access on sections" on public.site_sections
  for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "Admins upload site assets" on storage.objects;
drop policy if exists "Admins update site assets" on storage.objects;
drop policy if exists "Admins delete site assets" on storage.objects;
create policy "Admins upload site assets" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-assets' and public.has_role((select auth.uid()), 'admin'));
create policy "Admins update site assets" on storage.objects for update to authenticated
  using (bucket_id = 'site-assets' and public.has_role((select auth.uid()), 'admin'))
  with check (bucket_id = 'site-assets' and public.has_role((select auth.uid()), 'admin'));
create policy "Admins delete site assets" on storage.objects for delete to authenticated
  using (bucket_id = 'site-assets' and public.has_role((select auth.uid()), 'admin'));
