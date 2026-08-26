-- Allow an owner to permanently remove a worker while retaining business history.
ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_created_by_fkey;
ALTER TABLE public.purchases ADD CONSTRAINT purchases_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_created_by_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_created_by_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_created_by_fkey;
ALTER TABLE public.customers ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.sales_targets DROP CONSTRAINT IF EXISTS sales_targets_created_by_fkey;
ALTER TABLE public.sales_targets ADD CONSTRAINT sales_targets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.delete_worker(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_role public.app_role;
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Only an owner can remove a worker' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot remove your own account' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT role INTO target_role FROM public.user_roles WHERE user_id = p_user_id;
  IF target_role IS DISTINCT FROM 'manager' THEN
    RAISE EXCEPTION 'Only worker accounts can be removed' USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_worker(UUID) TO authenticated;
