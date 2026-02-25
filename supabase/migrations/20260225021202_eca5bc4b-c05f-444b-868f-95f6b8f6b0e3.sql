
-- Add form_filled_by column to applications
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS form_filled_by text;

-- Create signature-uploads bucket for head master and exam controller signatures
INSERT INTO storage.buckets (id, name, public) VALUES ('signature-uploads', 'signature-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Only admins can upload signatures
CREATE POLICY "Admins can upload signatures" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'signature-uploads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update signatures" ON storage.objects FOR UPDATE
USING (bucket_id = 'signature-uploads' AND public.has_role(auth.uid(), 'admin'));

-- Anyone authenticated can read signatures (needed for print rendering)
CREATE POLICY "Authenticated can read signatures" ON storage.objects FOR SELECT
USING (bucket_id = 'signature-uploads' AND auth.role() = 'authenticated');
