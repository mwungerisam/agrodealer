-- Lock down SECURITY DEFINER functions: revoke broad EXECUTE, grant only what the app needs.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Functions used inside RLS policies must stay callable by signed-in users.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_branch() TO authenticated;
GRANT EXECUTE ON FUNCTION public."current_role"() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_role() TO authenticated;