-- Public CMS media is intentionally isolated from private student documents.
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read site assets" on storage.objects;
drop policy if exists "Admins upload site assets" on storage.objects;
drop policy if exists "Admins update site assets" on storage.objects;
drop policy if exists "Admins delete site assets" on storage.objects;

create policy "Public read site assets" on storage.objects for select to anon, authenticated
  using (bucket_id = 'site-assets');
create policy "Admins upload site assets" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-assets' and public.has_role((select auth.uid()), 'admin'));
create policy "Admins update site assets" on storage.objects for update to authenticated
  using (bucket_id = 'site-assets' and public.has_role((select auth.uid()), 'admin'))
  with check (bucket_id = 'site-assets' and public.has_role((select auth.uid()), 'admin'));
create policy "Admins delete site assets" on storage.objects for delete to authenticated
  using (bucket_id = 'site-assets' and public.has_role((select auth.uid()), 'admin'));
