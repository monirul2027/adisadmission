
-- Fix permissive RLS on id_sequences - restrict to admin only since generate_next_id is SECURITY DEFINER
DROP POLICY IF EXISTS "Authenticated insert sequences" ON public.id_sequences;
DROP POLICY IF EXISTS "Authenticated update sequences" ON public.id_sequences;

CREATE POLICY "Admins insert sequences"
  ON public.id_sequences FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update sequences"
  ON public.id_sequences FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
