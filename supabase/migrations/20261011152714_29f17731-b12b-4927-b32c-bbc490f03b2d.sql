ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS student_code text;
CREATE UNIQUE INDEX IF NOT EXISTS applications_student_code_key ON public.applications (student_code) WHERE student_code IS NOT NULL;

INSERT INTO public.id_sequences (sequence_type, session, class_name, last_number)
VALUES ('student_code_seq', 'global', '', 436)
ON CONFLICT (sequence_type, session, class_name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.generate_new_student_code(p_session_year text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  v_year text := regexp_replace(coalesce(p_session_year, ''), '\D', '', 'g');
  v_next integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can generate student codes' USING ERRCODE = '42501';
  END IF;
  IF length(v_year) < 2 THEN
    RAISE EXCEPTION 'Invalid session year';
  END IF;

  PERFORM 1 FROM public.id_sequences
    WHERE sequence_type = 'student_code_seq' AND session = 'global' AND class_name = ''
    FOR UPDATE;

  UPDATE public.id_sequences
    SET last_number = last_number + 1
    WHERE sequence_type = 'student_code_seq' AND session = 'global' AND class_name = ''
    RETURNING last_number INTO v_next;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'Student code sequence missing';
  END IF;

  RETURN 'ADIS-' || right(v_year, 2) || '-' || lpad(v_next::text, 5, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_new_student_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.generate_new_student_code(text) TO authenticated, service_role;