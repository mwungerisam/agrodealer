-- =====================================================================
-- UFBC AGRODEALER - ROBUST ROLE BOOTSTRAPPING & BRANCH RLS FIX
-- Ensures all users receive proper roles, owners can manage branches,
-- and unassigned users self-heal on first login.
-- =====================================================================

-- 1. Ensure profiles table and trigger handle every user reliably
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_count INTEGER;
BEGIN
  -- Insert or update profile
  INSERT INTO public.profiles(id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  -- Determine if any owner exists
  SELECT COUNT(*) INTO owner_count FROM public.user_roles WHERE role = 'owner';
  
  IF owner_count = 0 THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (NEW.id, 'owner')
    ON CONFLICT (user_id) DO UPDATE SET role = 'owner';
  ELSE
    INSERT INTO public.user_roles(user_id, role)
    VALUES (NEW.id, 'manager')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill existing users in auth.users that don't have user_roles
DO $$
DECLARE
  r RECORD;
  owner_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO owner_count FROM public.user_roles WHERE role = 'owner';

  FOR r IN SELECT id, raw_user_meta_data FROM auth.users LOOP
    -- Ensure profile exists
    INSERT INTO public.profiles(id, full_name, phone)
    VALUES (
      r.id,
      COALESCE(r.raw_user_meta_data->>'full_name', ''),
      r.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Ensure role exists
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = r.id) THEN
      IF owner_count = 0 THEN
        INSERT INTO public.user_roles(user_id, role) VALUES (r.id, 'owner');
        owner_count := 1;
      ELSE
        INSERT INTO public.user_roles(user_id, role) VALUES (r.id, 'manager');
      END IF;
    END IF;
  END LOOP;
END $$;

-- 3. Self-healing RPC for authenticated users
-- PostgreSQL cannot alter a function's return type with CREATE OR REPLACE.
-- The preceding hardening migration defined this RPC as RETURNS VOID.
DROP FUNCTION IF EXISTS public.ensure_user_role();
CREATE OR REPLACE FUNCTION public.ensure_user_role()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  curr_role public.app_role;
  curr_branch UUID;
  owner_count INTEGER;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Ensure profile exists
  INSERT INTO public.profiles(id, full_name)
  VALUES (uid, '')
  ON CONFLICT (id) DO NOTHING;

  -- Check existing role
  SELECT role, branch_id INTO curr_role, curr_branch FROM public.user_roles WHERE user_id = uid;

  IF curr_role IS NULL THEN
    SELECT COUNT(*) INTO owner_count FROM public.user_roles WHERE role = 'owner';
    IF owner_count = 0 THEN
      INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'owner')
      ON CONFLICT (user_id) DO UPDATE SET role = 'owner';
      curr_role := 'owner';
    ELSE
      INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'manager')
      ON CONFLICT (user_id) DO NOTHING;
      curr_role := 'manager';
    END IF;
  END IF;

  RETURN jsonb_build_object('role', curr_role, 'branch_id', curr_branch);
END; $$;

GRANT EXECUTE ON FUNCTION public.ensure_user_role() TO authenticated;

-- 4. Ensure owner can claim if no active owner exists
CREATE OR REPLACE FUNCTION public.claim_first_owner()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  owner_count INTEGER;
BEGIN
  IF uid IS NULL THEN RETURN FALSE; END IF;
  SELECT COUNT(*) INTO owner_count FROM public.user_roles WHERE role = 'owner';
  IF owner_count = 0 THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (uid, 'owner')
    ON CONFLICT (user_id) DO UPDATE SET role = 'owner';
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END; $$;

GRANT EXECUTE ON FUNCTION public.claim_first_owner() TO authenticated;
