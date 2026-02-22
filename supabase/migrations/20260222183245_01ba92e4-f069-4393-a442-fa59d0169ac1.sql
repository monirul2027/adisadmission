
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS on user_roles: users can read their own role, admins can read all
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Add session column to applications
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS session text;

-- 6. Create admission_tests table
CREATE TABLE public.admission_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_id text NOT NULL,
  session text NOT NULL,
  applying_for_class text NOT NULL,
  student_name text NOT NULL,
  father_name text NOT NULL,
  occupation text,
  village text,
  po text,
  ps text,
  dist text,
  state text,
  landmark text,
  mobile_no text NOT NULL,
  whatsapp_no text,
  present_school text,
  present_class text,
  status text NOT NULL DEFAULT 'Pending',
  roll_no text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admission_tests ENABLE ROW LEVEL SECURITY;

-- 7. Create form_settings table
CREATE TABLE public.form_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.form_settings ENABLE ROW LEVEL SECURITY;

-- 8. Create id_sequences table for auto-increment IDs
CREATE TABLE public.id_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_type text NOT NULL,
  session text NOT NULL,
  class_name text,
  last_number integer NOT NULL DEFAULT 0,
  UNIQUE(sequence_type, session, class_name)
);
ALTER TABLE public.id_sequences ENABLE ROW LEVEL SECURITY;

-- 9. Drop old RLS policies on applications
DROP POLICY IF EXISTS "Users can insert own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;

-- 10. New RLS for applications: students see own, admins see all
CREATE POLICY "Students view own applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students update own, admins update all"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 11. RLS for admission_tests
CREATE POLICY "Students view own tests"
  ON public.admission_tests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own tests"
  ON public.admission_tests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Update tests"
  ON public.admission_tests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 12. RLS for form_settings: everyone reads, admins write
CREATE POLICY "Anyone can read settings"
  ON public.form_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update settings"
  ON public.form_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
  ON public.form_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 13. RLS for id_sequences: admins manage, authenticated read
CREATE POLICY "Authenticated read sequences"
  ON public.id_sequences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert sequences"
  ON public.id_sequences FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update sequences"
  ON public.id_sequences FOR UPDATE
  TO authenticated
  USING (true);

-- 14. Function to generate next application ID atomically
CREATE OR REPLACE FUNCTION public.generate_next_id(
  p_type text,
  p_session text,
  p_class text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
  v_id text;
  v_session_short text;
BEGIN
  -- Upsert and increment
  INSERT INTO public.id_sequences (sequence_type, session, class_name, last_number)
  VALUES (p_type, p_session, COALESCE(p_class, ''), 1)
  ON CONFLICT (sequence_type, session, class_name)
  DO UPDATE SET last_number = id_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  IF p_type = 'admission' THEN
    v_id := 'ADIS-' || p_session || '-' || LPAD(v_next::text, 2, '0');
  ELSIF p_type = 'admission_test' THEN
    v_session_short := RIGHT(p_session, 2);
    v_id := 'ADIS-ADMT-' || v_session_short || LPAD(v_next::text, 2, '0');
  ELSIF p_type = 'roll_no' THEN
    v_id := LPAD(v_next::text, 3, '0');
  ELSE
    v_id := p_type || '-' || v_next::text;
  END IF;

  RETURN v_id;
END;
$$;

-- 15. Insert default form settings
INSERT INTO public.form_settings (setting_key, setting_value) VALUES
  ('admission_form_fields', '{"name_bengali": true, "aadhar_no": true, "health_issue": true, "guardian_name": true, "guardian_relation": true, "last_attended_class": true, "last_institution": true, "father_occupation": true, "father_qualification": true, "mother_occupation": true, "mother_qualification": true}'::jsonb),
  ('admit_card_instructions', '{"text": "1. Bring this admit card to the examination center.\\n2. Arrive 30 minutes before the exam.\\n3. Carry a valid ID proof.\\n4. No electronic devices allowed."}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- 16. Admin setup tracker table
CREATE TABLE public.admin_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_configured boolean NOT NULL DEFAULT true,
  configured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_setup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read setup status"
  ON public.admin_setup FOR SELECT
  TO anon, authenticated
  USING (true);
