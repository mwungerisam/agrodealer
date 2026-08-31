-- Production hardening: preserve financial/stock integrity and reduce worker data exposure.

-- Owners may share operational control, but only the primary owner may change access roles.
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS is_primary_owner BOOLEAN NOT NULL DEFAULT FALSE;

WITH first_owner AS (
  SELECT id
  FROM public.user_roles
  WHERE role = 'owner'
  ORDER BY created_at, id
  LIMIT 1
)
UPDATE public.user_roles
SET is_primary_owner = (id = (SELECT id FROM first_owner));

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_one_primary_owner
  ON public.user_roles (is_primary_owner)
  WHERE is_primary_owner;

CREATE OR REPLACE FUNCTION public.is_primary_owner(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = 'owner'
      AND is_primary_owner
  );
$$;

CREATE OR REPLACE FUNCTION public.protect_primary_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.is_primary_owner
     AND (NEW.role <> 'owner' OR NOT NEW.is_primary_owner) THEN
    RAISE EXCEPTION 'The primary owner cannot be demoted or removed without a controlled ownership transfer'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF TG_OP = 'DELETE' AND OLD.is_primary_owner THEN
    RAISE EXCEPTION 'The primary owner cannot be removed without a controlled ownership transfer'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_primary_owner ON public.user_roles;
CREATE TRIGGER trg_protect_primary_owner
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_primary_owner();

DROP POLICY IF EXISTS owner_manage_roles ON public.user_roles;
CREATE POLICY primary_owner_manage_roles ON public.user_roles
FOR ALL TO authenticated
USING (public.is_primary_owner(auth.uid()))
WITH CHECK (public.is_primary_owner(auth.uid()));

-- Workers may only see their own identity, role and assigned branch.
DROP POLICY IF EXISTS read_all_profiles ON public.profiles;
CREATE POLICY read_own_or_owner_profile ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS read_own_role ON public.user_roles;
DROP POLICY IF EXISTS read_user_roles ON public.user_roles;
CREATE POLICY read_own_or_owner_role ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS read_branches ON public.branches;
CREATE POLICY read_assigned_branch_or_owner ON public.branches
FOR SELECT TO authenticated
USING (id = public.current_branch() OR public.has_role(auth.uid(), 'owner'));

-- Purchase cost is owner-only. Workers use this deliberately limited view.
DROP POLICY IF EXISTS read_products ON public.products;
DROP POLICY IF EXISTS owner_read_products ON public.products;
CREATE POLICY owner_read_products ON public.products
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE OR REPLACE VIEW public.worker_products
WITH (security_invoker = false)
AS
SELECT id, name, category, selling_price, unit, status, sku, description, min_stock, created_at
FROM public.products
WHERE status = TRUE;

REVOKE ALL ON public.worker_products FROM PUBLIC, anon;
GRANT SELECT ON public.worker_products TO authenticated;

-- Never trust a browser-supplied author. Keep historical authors unchanged on edits.
CREATE OR REPLACE FUNCTION public.enforce_record_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.created_by := OLD.created_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_creator ON public.sales;
CREATE TRIGGER trg_sales_creator BEFORE INSERT OR UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.enforce_record_creator();
DROP TRIGGER IF EXISTS trg_purchases_creator ON public.purchases;
CREATE TRIGGER trg_purchases_creator BEFORE INSERT OR UPDATE ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.enforce_record_creator();
DROP TRIGGER IF EXISTS trg_expenses_creator ON public.expenses;
CREATE TRIGGER trg_expenses_creator BEFORE INSERT OR UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.enforce_record_creator();
DROP TRIGGER IF EXISTS trg_customers_creator ON public.customers;
CREATE TRIGGER trg_customers_creator BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.enforce_record_creator();

-- Workers can record activity only for today; owners retain legitimate correction access.
CREATE OR REPLACE FUNCTION public.enforce_worker_activity_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE activity_date DATE;
BEGIN
  activity_date := CASE TG_TABLE_NAME
    WHEN 'sales' THEN NEW.sale_date
    WHEN 'purchases' THEN NEW.purchase_date
    WHEN 'expenses' THEN NEW.expense_date
  END;

  IF NOT public.has_role(auth.uid(), 'owner') AND activity_date <> CURRENT_DATE THEN
    RAISE EXCEPTION 'Workers may only record activity for the current date'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_activity_date ON public.sales;
CREATE TRIGGER trg_sales_activity_date BEFORE INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.enforce_worker_activity_date();
DROP TRIGGER IF EXISTS trg_purchases_activity_date ON public.purchases;
CREATE TRIGGER trg_purchases_activity_date BEFORE INSERT ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.enforce_worker_activity_date();
DROP TRIGGER IF EXISTS trg_expenses_activity_date ON public.expenses;
CREATE TRIGGER trg_expenses_activity_date BEFORE INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.enforce_worker_activity_date();

-- Sales and purchases are immutable after posting. Their inventory effects are
-- atomic, so corrections must use an audited stock adjustment instead of deletion.
REVOKE UPDATE, DELETE ON public.sales FROM authenticated;
REVOKE UPDATE, DELETE ON public.purchases FROM authenticated;
DROP POLICY IF EXISTS owner_modify_sales ON public.sales;
DROP POLICY IF EXISTS owner_delete_sales ON public.sales;
DROP POLICY IF EXISTS owner_modify_purchases ON public.purchases;
DROP POLICY IF EXISTS owner_delete_purchases ON public.purchases;

-- Extend the audit trail to all operational records, including permitted deletes.
DROP TRIGGER IF EXISTS trg_audit_sales ON public.sales;
CREATE TRIGGER trg_audit_sales AFTER INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.log_audit();
DROP TRIGGER IF EXISTS trg_audit_purchases ON public.purchases;
CREATE TRIGGER trg_audit_purchases AFTER INSERT OR UPDATE OR DELETE ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.log_audit();
DROP TRIGGER IF EXISTS trg_audit_expenses ON public.expenses;
CREATE TRIGGER trg_audit_expenses AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.log_audit();
DROP TRIGGER IF EXISTS trg_audit_customers ON public.customers;
CREATE TRIGGER trg_audit_customers AFTER INSERT OR UPDATE OR DELETE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- The previous function hardening migration revokes all SECURITY DEFINER calls.
-- Re-grant only functions intentionally invoked by the browser or RLS.
GRANT EXECUTE ON FUNCTION public.is_primary_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_branch() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_stock(UUID, UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_stock(UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_worker(UUID) TO authenticated;
