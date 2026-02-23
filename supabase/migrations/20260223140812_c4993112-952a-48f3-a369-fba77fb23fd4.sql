-- Prevent race condition: only one row allowed in admin_setup
CREATE UNIQUE INDEX IF NOT EXISTS admin_setup_singleton ON public.admin_setup ((true));