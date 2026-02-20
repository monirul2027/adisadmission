
-- Create applications table
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id TEXT NOT NULL UNIQUE,
  photo_url TEXT NOT NULL,
  full_name TEXT NOT NULL,
  name_bengali TEXT,
  date_of_birth DATE NOT NULL,
  sex TEXT NOT NULL,
  religion TEXT NOT NULL,
  nationality TEXT NOT NULL DEFAULT 'INDIAN',
  aadhar_no TEXT,
  health_issue TEXT,
  father_name TEXT NOT NULL,
  father_occupation TEXT,
  father_qualification TEXT,
  mother_name TEXT NOT NULL,
  mother_occupation TEXT,
  mother_qualification TEXT,
  present_vill TEXT,
  present_po TEXT,
  present_ps TEXT,
  present_dist TEXT,
  present_pin TEXT,
  present_state TEXT,
  mobile_no TEXT NOT NULL,
  whatsapp_no TEXT,
  permanent_vill TEXT,
  permanent_po TEXT,
  permanent_ps TEXT,
  permanent_dist TEXT,
  permanent_pin TEXT,
  permanent_state TEXT,
  guardian_name TEXT,
  guardian_relation TEXT,
  desired_class TEXT NOT NULL,
  last_attended_class TEXT,
  last_institution TEXT,
  aadhar_doc_url TEXT,
  birth_cert_url TEXT,
  guardian_signature_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Public can insert (submit applications)
CREATE POLICY "Anyone can submit applications"
ON public.applications FOR INSERT
WITH CHECK (true);

-- Only authenticated admins can view
CREATE POLICY "Authenticated users can view applications"
ON public.applications FOR SELECT
TO authenticated
USING (true);

-- Only authenticated admins can update status
CREATE POLICY "Authenticated users can update applications"
ON public.applications FOR UPDATE
TO authenticated
USING (true);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('student-documents', 'student-documents', true);

-- Storage policies - anyone can upload
CREATE POLICY "Anyone can upload student photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "Anyone can upload student documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'student-documents');

-- Public read for photos and docs
CREATE POLICY "Public read student photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

CREATE POLICY "Public read student documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-documents');
