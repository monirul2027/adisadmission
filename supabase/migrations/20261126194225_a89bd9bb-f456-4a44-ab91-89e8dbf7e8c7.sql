INSERT INTO public.form_settings (setting_key, setting_value)
VALUES ('active_session', '{"session":"2027"}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enforce_active_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE v_session text;
BEGIN
  IF auth.role() = 'service_role' OR auth.uid() IS NULL
     OR private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  SELECT NULLIF(BTRIM(setting_value->>'session'), '') INTO v_session
  FROM public.form_settings WHERE setting_key = 'active_session';
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Active academic session is not configured' USING ERRCODE = 'P0001';
  END IF;
  NEW.session := v_session;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_active_session() FROM public, anon;

CREATE TRIGGER trg_a_enforce_active_session BEFORE INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_active_session();
CREATE TRIGGER trg_a_enforce_active_session BEFORE INSERT ON public.admission_tests
FOR EACH ROW EXECUTE FUNCTION public.enforce_active_session();