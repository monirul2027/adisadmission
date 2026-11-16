-- Atomic Application ID & Admission Test ID generation inside BEFORE INSERT triggers.
-- Ensures sequence numbers in public.id_sequences are only incremented within the
-- row INSERT transaction and automatically roll back if an insert ever fails or aborts.
-- Strictly preserves all existing rows, id_sequences counters, student_code logic,
-- EduNest sync, RLS policies, and admin permission triggers.

-- 1. Allow omitting application_id / test_id in client INSERT payloads without
--    breaking NOT NULL constraints before/after trigger execution.
ALTER TABLE public.applications
  ALTER COLUMN application_id SET DEFAULT '';

ALTER TABLE public.admission_tests
  ALTER COLUMN test_id SET DEFAULT '';

-- 2. Trigger function for public.applications
CREATE OR REPLACE FUNCTION public.assign_application_id_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.application_id IS NULL OR BTRIM(NEW.application_id) = '' THEN
    NEW.application_id := public.generate_next_id(
      'admission',
      COALESCE(NULLIF(BTRIM(NEW.session), ''), '2027')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_application_id ON public.applications;
CREATE TRIGGER trg_assign_application_id
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_application_id_before_insert();

-- 3. Trigger function for public.admission_tests
CREATE OR REPLACE FUNCTION public.assign_admission_test_id_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.test_id IS NULL OR BTRIM(NEW.test_id) = '' THEN
    NEW.test_id := public.generate_next_id(
      'admission_test',
      COALESCE(NULLIF(BTRIM(NEW.session), ''), '2027')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_admission_test_id ON public.admission_tests;
CREATE TRIGGER trg_assign_admission_test_id
  BEFORE INSERT ON public.admission_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admission_test_id_before_insert();
