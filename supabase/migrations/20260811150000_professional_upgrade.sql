-- =====================================================================
-- UFBC AGRODEALER - PROFESSIONAL UPGRADE MIGRATION
-- Adds branch codes, product SKU/min-stock, weighted-average inventory
-- costing, customers, sales targets, audit log, stock adjustments,
-- branch-to-branch transfers, and tighter row-level security.
-- =====================================================================

-- 1. BRANCHES: add branch code
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS branches_code_key ON public.branches(code) WHERE code IS NOT NULL;

-- 2. PRODUCTS: add SKU, minimum stock, description
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (min_stock >= 0);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. INVENTORY: weighted-average cost
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS avg_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (avg_cost >= 0);
UPDATE public.inventory i SET avg_cost = p.buying_price FROM public.products p WHERE i.product_id = p.id AND i.avg_cost = 0;

-- 4. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_customers" ON public.customers FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'owner') OR branch_id = public.current_branch());
CREATE POLICY "insert_customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'owner') OR branch_id = public.current_branch());
CREATE POLICY "update_customers" ON public.customers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'owner') OR branch_id = public.current_branch());

-- 5. SALES: attach customer info (denormalized snapshot)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- 6. SALES TARGETS (admin-controlled, worker read-only)
CREATE TABLE IF NOT EXISTS public.sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily','monthly')),
  period_date DATE NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount >= 0),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, user_id, period_type, period_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_targets TO authenticated;
GRANT ALL ON public.sales_targets TO service_role;
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_targets" ON public.sales_targets FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'owner') OR user_id = auth.uid() OR (user_id IS NULL AND branch_id = public.current_branch()));
CREATE POLICY "owner_manage_targets" ON public.sales_targets FOR ALL TO authenticated USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));

-- 7. AUDIT LOG (owner-read only; writes only via SECURITY DEFINER trigger)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_read_audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'owner'));

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ent_id UUID;
  br_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    ent_id := OLD.id;
    br_id := CASE WHEN TG_TABLE_NAME = 'branches' THEN OLD.id ELSE (to_jsonb(OLD)->>'branch_id')::uuid END;
    INSERT INTO public.audit_log(user_id, action, entity, entity_id, branch_id, details)
    VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, ent_id, br_id, to_jsonb(OLD));
    RETURN OLD;
  ELSE
    ent_id := NEW.id;
    br_id := CASE WHEN TG_TABLE_NAME = 'branches' THEN NEW.id ELSE (to_jsonb(NEW)->>'branch_id')::uuid END;
    INSERT INTO public.audit_log(user_id, action, entity, entity_id, branch_id, details)
    VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, ent_id, br_id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_branches ON public.branches;
CREATE TRIGGER trg_audit_branches AFTER INSERT OR UPDATE OR DELETE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.log_audit();
DROP TRIGGER IF EXISTS trg_audit_products ON public.products;
CREATE TRIGGER trg_audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_audit();
DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_audit();
DROP TRIGGER IF EXISTS trg_audit_sales_targets ON public.sales_targets;
CREATE TRIGGER trg_audit_sales_targets AFTER INSERT OR UPDATE OR DELETE ON public.sales_targets FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- 8. PURCHASE TRIGGER - weighted average cost
CREATE OR REPLACE FUNCTION public.apply_purchase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  landed_cost NUMERIC(14,4);
  cur_qty NUMERIC(12,2);
  cur_cost NUMERIC(12,2);
  new_qty NUMERIC(12,2);
  new_cost NUMERIC(12,2);
BEGIN
  landed_cost := NEW.buying_price + (CASE WHEN NEW.quantity > 0 THEN NEW.transport_cost / NEW.quantity ELSE 0 END);
  SELECT quantity, avg_cost INTO cur_qty, cur_cost FROM public.inventory
  WHERE branch_id = NEW.branch_id AND product_id = NEW.product_id FOR UPDATE;
  IF cur_qty IS NULL THEN
    INSERT INTO public.inventory(branch_id, product_id, quantity, avg_cost, updated_at)
    VALUES (NEW.branch_id, NEW.product_id, NEW.quantity, landed_cost, now());
  ELSE
    new_qty := cur_qty + NEW.quantity;
    new_cost := CASE WHEN new_qty > 0 THEN ((cur_qty * cur_cost) + (NEW.quantity * landed_cost)) / new_qty ELSE landed_cost END;
    UPDATE public.inventory SET quantity = new_qty, avg_cost = new_cost, updated_at = now()
    WHERE branch_id = NEW.branch_id AND product_id = NEW.product_id;
  END IF;
  INSERT INTO public.inventory_movements(branch_id, product_id, type, quantity, ref_type, ref_id)
  VALUES (NEW.branch_id, NEW.product_id, 'in', NEW.quantity, 'purchase', NEW.id);
  RETURN NEW;
END; $$;

-- 9. SALE TRIGGER - weighted average cost, require customer, validate stock
CREATE OR REPLACE FUNCTION public.apply_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_qty NUMERIC(12,2);
  cost NUMERIC(12,2);
BEGIN
  IF NEW.customer_name IS NULL OR length(trim(NEW.customer_name)) = 0 THEN
    RAISE EXCEPTION 'Umukiriya ni ngombwa' USING ERRCODE = 'check_violation';
  END IF;
  SELECT quantity, avg_cost INTO current_qty, cost FROM public.inventory
  WHERE branch_id = NEW.branch_id AND product_id = NEW.product_id FOR UPDATE;
  IF current_qty IS NULL OR current_qty < NEW.quantity THEN
    RAISE EXCEPTION 'Ntibishoboka: ububiko ntibuhagije' USING ERRCODE = 'check_violation';
  END IF;
  NEW.unit_cost := COALESCE(cost, 0);
  NEW.profit := (NEW.selling_price - NEW.unit_cost) * NEW.quantity;
  UPDATE public.inventory SET quantity = quantity - NEW.quantity, updated_at = now()
  WHERE branch_id = NEW.branch_id AND product_id = NEW.product_id;
  RETURN NEW;
END; $$;

-- 10. STOCK ADJUSTMENT - admin only, atomic, audited
CREATE OR REPLACE FUNCTION public.adjust_stock(p_branch_id UUID, p_product_id UUID, p_new_quantity NUMERIC, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cur_qty NUMERIC(12,2);
  delta NUMERIC(12,2);
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Ntibyemewe: gusa umuyobozi wemerewe guhindura ububiko' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_new_quantity < 0 THEN
    RAISE EXCEPTION 'Ingano ntishobora kuba munsi ya zero' USING ERRCODE = 'check_violation';
  END IF;
  SELECT quantity INTO cur_qty FROM public.inventory
  WHERE branch_id = p_branch_id AND product_id = p_product_id FOR UPDATE;
  IF cur_qty IS NULL THEN
    cur_qty := 0;
    INSERT INTO public.inventory(branch_id, product_id, quantity, avg_cost, updated_at)
    VALUES (p_branch_id, p_product_id, p_new_quantity, 0, now());
  ELSE
    UPDATE public.inventory SET quantity = p_new_quantity, updated_at = now()
    WHERE branch_id = p_branch_id AND product_id = p_product_id;
  END IF;
  delta := p_new_quantity - cur_qty;
  IF delta <> 0 THEN
    INSERT INTO public.inventory_movements(branch_id, product_id, type, quantity, ref_type, ref_id)
    VALUES (p_branch_id, p_product_id, CASE WHEN delta > 0 THEN 'in' ELSE 'out' END, abs(delta), 'adjustment', NULL);
  END IF;
  INSERT INTO public.audit_log(user_id, action, entity, entity_id, branch_id, details)
  VALUES (auth.uid(), 'adjust_stock', 'inventory', p_product_id, p_branch_id,
    jsonb_build_object('previous_quantity', cur_qty, 'new_quantity', p_new_quantity, 'reason', p_reason));
END; $$;
GRANT EXECUTE ON FUNCTION public.adjust_stock(UUID, UUID, NUMERIC, TEXT) TO authenticated;

-- 11. BRANCH-TO-BRANCH STOCK TRANSFER - admin only, atomic, audited
CREATE OR REPLACE FUNCTION public.transfer_stock(p_from_branch UUID, p_to_branch UUID, p_product_id UUID, p_quantity NUMERIC, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  from_qty NUMERIC(12,2);
  from_cost NUMERIC(12,2);
  to_qty NUMERIC(12,2);
  to_cost NUMERIC(12,2);
  new_to_qty NUMERIC(12,2);
  new_to_cost NUMERIC(12,2);
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Ntibyemewe: gusa umuyobozi wemerewe kohereza ububiko' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Ingano igomba kuba nziza' USING ERRCODE = 'check_violation';
  END IF;
  IF p_from_branch = p_to_branch THEN
    RAISE EXCEPTION 'Amashami agomba kuba atandukanye' USING ERRCODE = 'check_violation';
  END IF;
  SELECT quantity, avg_cost INTO from_qty, from_cost FROM public.inventory
  WHERE branch_id = p_from_branch AND product_id = p_product_id FOR UPDATE;
  IF from_qty IS NULL OR from_qty < p_quantity THEN
    RAISE EXCEPTION 'Ntibishoboka: ububiko ntibuhagije' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.inventory SET quantity = quantity - p_quantity, updated_at = now()
  WHERE branch_id = p_from_branch AND product_id = p_product_id;
  SELECT quantity, avg_cost INTO to_qty, to_cost FROM public.inventory
  WHERE branch_id = p_to_branch AND product_id = p_product_id FOR UPDATE;
  IF to_qty IS NULL THEN
    INSERT INTO public.inventory(branch_id, product_id, quantity, avg_cost, updated_at)
    VALUES (p_to_branch, p_product_id, p_quantity, from_cost, now());
  ELSE
    new_to_qty := to_qty + p_quantity;
    new_to_cost := CASE WHEN new_to_qty > 0 THEN ((to_qty * to_cost) + (p_quantity * from_cost)) / new_to_qty ELSE from_cost END;
    UPDATE public.inventory SET quantity = new_to_qty, avg_cost = new_to_cost, updated_at = now()
    WHERE branch_id = p_to_branch AND product_id = p_product_id;
  END IF;
  INSERT INTO public.inventory_movements(branch_id, product_id, type, quantity, ref_type, ref_id)
  VALUES (p_from_branch, p_product_id, 'out', p_quantity, 'transfer', NULL);
  INSERT INTO public.inventory_movements(branch_id, product_id, type, quantity, ref_type, ref_id)
  VALUES (p_to_branch, p_product_id, 'in', p_quantity, 'transfer', NULL);
  INSERT INTO public.audit_log(user_id, action, entity, entity_id, branch_id, details)
  VALUES (auth.uid(), 'transfer_stock', 'inventory', p_product_id, p_from_branch,
    jsonb_build_object('to_branch', p_to_branch, 'quantity', p_quantity, 'reason', p_reason));
END; $$;
GRANT EXECUTE ON FUNCTION public.transfer_stock(UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated;

-- 12. LOCK DOWN DIRECT STOCK WRITES
REVOKE INSERT, UPDATE, DELETE ON public.inventory FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.inventory_movements FROM authenticated;

-- 13. Require branch active on sales/purchases
DROP POLICY IF EXISTS "insert_sales" ON public.sales;
CREATE POLICY "insert_sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (
  (public.has_role(auth.uid(),'owner') OR branch_id = public.current_branch())
  AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = branch_id AND b.status = true)
);
DROP POLICY IF EXISTS "insert_purchases" ON public.purchases;
CREATE POLICY "insert_purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (
  (public.has_role(auth.uid(),'owner') OR branch_id = public.current_branch())
  AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = branch_id AND b.status = true)
);
