-- Block direct API sales into branches that the owner has deactivated.
-- UI checks are helpful, but inventory mutations must be protected at the database boundary.

CREATE OR REPLACE FUNCTION public.apply_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_qty NUMERIC(12,2);
  cost NUMERIC(12,2);
  catalog_price NUMERIC(12,2);
  branch_active BOOLEAN;
BEGIN
  IF NEW.customer_name IS NULL OR length(trim(NEW.customer_name)) = 0 THEN
    RAISE EXCEPTION 'Umukiriya ni ngombwa' USING ERRCODE = 'check_violation';
  END IF;

  SELECT status INTO branch_active
  FROM public.branches
  WHERE id = NEW.branch_id;
  IF branch_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Ishami ntirikora' USING ERRCODE = 'check_violation';
  END IF;

  SELECT quantity INTO current_qty FROM public.inventory
  WHERE branch_id = NEW.branch_id AND product_id = NEW.product_id FOR UPDATE;
  IF current_qty IS NULL OR current_qty < NEW.quantity THEN
    RAISE EXCEPTION 'Ntibishoboka: ububiko ntibuhagije' USING ERRCODE = 'check_violation';
  END IF;

  SELECT buying_price, selling_price INTO cost, catalog_price
  FROM public.products WHERE id = NEW.product_id AND status = true;
  IF catalog_price IS NULL THEN
    RAISE EXCEPTION 'Igicuruzwa ntikiboneka cyangwa ntigikora' USING ERRCODE = 'check_violation';
  END IF;

  NEW.selling_price := catalog_price;
  NEW.unit_cost := COALESCE(cost, 0);
  NEW.profit := (NEW.selling_price - NEW.unit_cost) * NEW.quantity;
  UPDATE public.inventory SET quantity = quantity - NEW.quantity, updated_at = now()
  WHERE branch_id = NEW.branch_id AND product_id = NEW.product_id;
  RETURN NEW;
END;
$$;