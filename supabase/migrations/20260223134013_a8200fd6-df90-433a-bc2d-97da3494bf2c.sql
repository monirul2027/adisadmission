
-- 1. Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id = 'student-documents';
UPDATE storage.buckets SET public = false WHERE id = 'student-photos';

-- 2. Drop old overly permissive storage policies
DROP POLICY IF EXISTS "Anyone can upload student photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload student documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read student photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read student documents" ON storage.objects;

-- 3. Create authenticated-only storage policies
CREATE POLICY "Authenticated upload photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "Authenticated upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'student-documents');

CREATE POLICY "Authenticated read photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'student-photos');

CREATE POLICY "Authenticated read documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'student-documents');

-- 4. Create trigger to auto-assign student role on signup
CREATE OR REPLACE FUNCTION public.assign_student_role_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_student_role_on_signup();
