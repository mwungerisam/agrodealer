-- Security hardening: close privilege-escalation paths and make first-owner
-- creation deterministic under concurrent signups.

DROP FUNCTION IF EXISTS public.claim_first_owner();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_exists BOOLEAN;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('ufbc:first-owner', 0));

  INSERT INTO public.profiles(id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE
      WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'owner'
  ) INTO owner_exists;

  INSERT INTO public.user_roles(user_id, role, is_primary_owner)
  VALUES (
    NEW.id,
    CASE WHEN owner_exists THEN 'manager'::public.app_role ELSE 'owner'::public.app_role END,
    NOT owner_exists
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- A missing role is an authorization configuration problem, not permission to
-- become an owner. Existing users retain their assigned role.
CREATE OR REPLACE FUNCTION public.ensure_user_role()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  curr_role public.app_role;
  curr_branch UUID;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  INSERT INTO public.profiles(id, full_name)
  VALUES (uid, '')
  ON CONFLICT (id) DO NOTHING;

  SELECT role, branch_id
  INTO curr_role, curr_branch
  FROM public.user_roles
  WHERE user_id = uid;

  RETURN jsonb_build_object(
    'role', curr_role,
    'branch_id', curr_branch
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_role() TO authenticated;
