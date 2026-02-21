
-- Add user_id and financial fields to applications
ALTER TABLE public.applications 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS monthly_fees TEXT,
  ADD COLUMN IF NOT EXISTS admission_fee TEXT;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.applications;
DROP POLICY IF EXISTS "Authenticated users can update applications" ON public.applications;
DROP POLICY IF EXISTS "Authenticated users can view applications" ON public.applications;

-- New RLS: staff can only see their own records
CREATE POLICY "Users can insert own applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
