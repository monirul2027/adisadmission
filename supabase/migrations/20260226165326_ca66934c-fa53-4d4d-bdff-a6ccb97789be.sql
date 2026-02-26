
-- Add landmark field to applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS landmark text;

-- Add student_signature_url to admission_tests table
ALTER TABLE public.admission_tests ADD COLUMN IF NOT EXISTS student_signature_url text;
