-- RLS now uses private role/permission helpers directly; callers do not need a public RPC for role checks.
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
