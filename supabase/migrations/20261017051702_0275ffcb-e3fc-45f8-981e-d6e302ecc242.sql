DROP POLICY IF EXISTS "Students view own applications" ON public.applications;
CREATE POLICY "Students view own applications" ON public.applications FOR SELECT TO authenticated
USING ((( SELECT auth.uid()) = user_id) OR private.admin_has_permission(( SELECT auth.uid()), 'is_super_admin'));
DROP POLICY IF EXISTS "Students update own, admins update all" ON public.applications;
CREATE POLICY "Students update own, admins update all" ON public.applications FOR UPDATE TO authenticated
USING ((( SELECT auth.uid()) = user_id) OR private.admin_has_permission(( SELECT auth.uid()), 'is_super_admin'))
WITH CHECK ((( SELECT auth.uid()) = user_id) OR private.admin_has_permission(( SELECT auth.uid()), 'is_super_admin'));
DROP POLICY IF EXISTS "Students view own tests" ON public.admission_tests;
CREATE POLICY "Students view own tests" ON public.admission_tests FOR SELECT TO authenticated
USING ((( SELECT auth.uid()) = user_id) OR private.admin_has_permission(( SELECT auth.uid()), 'is_super_admin'));
DROP POLICY IF EXISTS "Update tests" ON public.admission_tests;
CREATE POLICY "Update tests" ON public.admission_tests FOR UPDATE TO authenticated
USING ((( SELECT auth.uid()) = user_id) OR private.admin_has_permission(( SELECT auth.uid()), 'is_super_admin'))
WITH CHECK ((( SELECT auth.uid()) = user_id) OR private.admin_has_permission(( SELECT auth.uid()), 'is_super_admin'));