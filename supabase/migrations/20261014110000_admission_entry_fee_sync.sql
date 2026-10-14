ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS is_fee_synced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee_sync_status text NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS fee_sync_error text,
  ADD COLUMN IF NOT EXISTS fee_sync_section text,
  ADD COLUMN IF NOT EXISTS fee_sync_roll_number text,
  ADD COLUMN IF NOT EXISTS fee_sync_admission_fee numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_sync_monthly_fee numeric(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.admission_tests
  ADD COLUMN IF NOT EXISTS form_filled_by text;

UPDATE public.applications
SET desired_class = upper(regexp_replace(btrim(desired_class), '^class[[:space:]]+', '', 'i'))
WHERE desired_class ~* '^class[[:space:]]+';

UPDATE public.admission_tests
SET applying_for_class = upper(regexp_replace(btrim(applying_for_class), '^class[[:space:]]+', '', 'i'))
WHERE applying_for_class ~* '^class[[:space:]]+';

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_desired_class_bare_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_desired_class_bare_check
  CHECK (desired_class = ANY (ARRAY['LKG', 'UKG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']::text[]));

ALTER TABLE public.admission_tests
  DROP CONSTRAINT IF EXISTS admission_tests_applying_for_class_bare_check;
ALTER TABLE public.admission_tests
  ADD CONSTRAINT admission_tests_applying_for_class_bare_check
  CHECK (applying_for_class = ANY (ARRAY['LKG', 'UKG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']::text[]));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'applications_fee_sync_status_check'
      AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_fee_sync_status_check
      CHECK (fee_sync_status = ANY (ARRAY['not_requested', 'pending', 'synced', 'failed']::text[]));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.keep_new_admissions_pending()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.status := 'Pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_pending_on_insert ON public.applications;
CREATE TRIGGER applications_pending_on_insert
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.keep_new_admissions_pending();

DROP TRIGGER IF EXISTS admission_tests_pending_on_insert ON public.admission_tests;
CREATE TRIGGER admission_tests_pending_on_insert
  BEFORE INSERT ON public.admission_tests
  FOR EACH ROW EXECUTE FUNCTION public.keep_new_admissions_pending();

REVOKE ALL ON FUNCTION public.keep_new_admissions_pending() FROM PUBLIC, anon, authenticated;
