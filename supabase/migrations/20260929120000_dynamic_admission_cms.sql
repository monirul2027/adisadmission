-- Public admission-site CMS with admin-only writes.
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  section_type text not null check (section_type in ('announcement', 'age_criteria', 'school_features', 'faq', 'custom_cards')),
  content jsonb not null default '{}'::jsonb,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.applications add column if not exists remarks text;
alter table public.admission_tests add column if not exists remarks text;
alter table public.site_settings enable row level security;
alter table public.site_sections enable row level security;

grant select on public.site_settings to anon, authenticated;
grant all on public.site_settings to authenticated, service_role;
grant select on public.site_sections to anon, authenticated;
grant all on public.site_sections to authenticated, service_role;

drop policy if exists "Public can read site settings" on public.site_settings;
drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings for select to anon, authenticated using (true);
create policy "Admins manage site settings" on public.site_settings for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));

drop policy if exists "Public can read active site sections" on public.site_sections;
drop policy if exists "Admins manage site sections" on public.site_sections;
drop policy if exists "Allow public read active sections" on public.site_sections;
drop policy if exists "Allow admins full access on sections" on public.site_sections;
create policy "Allow public read active sections" on public.site_sections for select to anon, authenticated using (is_active = true);
create policy "Allow admins full access on sections" on public.site_sections for all to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));

create or replace function public.set_site_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at before update on public.site_settings for each row execute function public.set_site_updated_at();
drop trigger if exists set_site_sections_updated_at on public.site_sections;
create trigger set_site_sections_updated_at before update on public.site_sections for each row execute function public.set_site_updated_at();

insert into public.site_settings (key, value) values
('hero_content', '{"badge_text":"Admissions open for the new session","title":"A confident start for every child.","subtitle":"Begin your child’s admission journey with a simple, guided online application. Save your progress, upload documents securely, and track every step from one place.","address":"Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202","journey_steps":["Create your student account","Complete the application form","Upload supporting documents","Submit and keep your application ID"],"primary_btn_text":"Apply for admission","secondary_btn_text":"Check application status"}'::jsonb),
('contact_settings', '{"phone_numbers":[],"whatsapp_number":"","whatsapp_message":"Assalamu Alaikum, I have an inquiry regarding ADIS school admission.","is_floating_whatsapp":false,"helpline_title":"Need help with your application?","helpline_subtitle":"We’re here to help every step of the way."}'::jsonb),
('quick_tracker_settings', '{"is_enabled":true,"search_placeholder":"Enter Application ID","helper_text":"Enter your application ID and registered mobile number to check your status."}'::jsonb),
('footer_content', '{"school_name":"Alor Disha Islamic School","address":"Dakshin Krishnanagar, Malancha-Antardwipa Road, Dhuliyan, Murshidabad, 742202","copyright_text":"© Alor Disha Islamic School. All rights reserved.","extra_links":[]}'::jsonb),
('admission_info_content', '{"eyebrow":"Admission information","title":"Everything parents need before applying.","subtitle":"Please keep the following items ready. You can submit your application online and return to your dashboard to view its progress.","cards":[{"title":"Important dates","items":["Applications are currently being accepted","Submit early to avoid last-minute delays","Admission test details will appear in your dashboard"]},{"title":"Documents to prepare","items":["Passport-size student photograph","Aadhaar card (if available)","Birth certificate and guardian signature"]},{"title":"What happens next","items":["Receive your application ID on submission","The school reviews your details","Check status and test updates online"]}]}'::jsonb),
('features_content', '{"eyebrow":"Why families choose us","title":"Learning, character and care.","cards":[{"title":"Supportive community","description":"A welcoming environment for students and families."},{"title":"Transparent process","description":"Clear steps and application updates in your own dashboard."},{"title":"Values-led learning","description":"A strong foundation for growth in and beyond the classroom."}]}'::jsonb)
on conflict (key) do nothing;

create index if not exists applications_application_id_mobile_idx on public.applications (application_id, mobile_no);
create index if not exists admission_tests_test_id_mobile_idx on public.admission_tests (test_id, mobile_no);

-- This intentionally provides a narrowly scoped public lookup. It requires two identifiers,
-- returns only status-safe fields, and never exposes form data or document URLs.
create or replace function public.check_application_quick_status(p_app_id text, p_phone text)
returns table(found boolean, student_name text, applying_for_class text, status text, session text, remarks text, has_admit_card boolean)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id text := btrim(coalesce(p_app_id, '')); v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if v_id = '' or length(v_id) > 100 or length(v_phone) <> 10 then return; end if;
  return query select true, a.full_name, a.desired_class, a.status, coalesce(a.session, ''), coalesce(a.remarks, ''), false
  from public.applications a where upper(a.application_id) = upper(v_id) and right(regexp_replace(a.mobile_no, '\D', '', 'g'), 10) = v_phone limit 1;
  if found then return; end if;
  return query select true, t.student_name, t.applying_for_class, t.status, t.session, coalesce(t.remarks, ''), (lower(t.status) = 'approved' and t.roll_no is not null)
  from public.admission_tests t where upper(t.test_id) = upper(v_id) and right(regexp_replace(t.mobile_no, '\D', '', 'g'), 10) = v_phone limit 1;
end;
$$;
revoke all on function public.check_application_quick_status(text, text) from public;
grant execute on function public.check_application_quick_status(text, text) to anon, authenticated, service_role;
