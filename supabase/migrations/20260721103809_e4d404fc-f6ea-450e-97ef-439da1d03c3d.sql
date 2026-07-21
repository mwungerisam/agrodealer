
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('owner','manager');
CREATE TYPE public.product_category AS ENUM ('ifumbire','imbuto');
CREATE TYPE public.movement_type AS ENUM ('in','out');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all_profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- BRANCHES
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  status BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_branch()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT branch_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- user_roles policies
CREATE POLICY "read_own_role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'owner'));
CREATE POLICY "owner_manage_roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));

-- branches policies
CREATE POLICY "read_branches" ON public.branches FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'owner') OR id = public.current_branch()
);
CREATE POLICY "owner_manage_branches" ON public.branches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category public.product_category NOT NULL,
  buying_price NUMERIC(12,2) NOT NULL CHECK (buying_price >= 0),
  selling_price NUMERIC(12,2) NOT NULL CHECK (selling_price >= 0),
  unit TEXT NOT NULL DEFAULT 'kg',
  status BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_manage_products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));

-- INVENTORY (current stock per branch/product)
CREATE TABLE public.inventory (
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT ALL ON public.inventory TO service_role;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_inventory" ON public.inventory FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'owner') OR branch_id = public.current_branch()
);

-- INVENTORY MOVEMENTS
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type public.movement_type NOT NULL,
  quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  ref_type TEXT,
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_movements" ON public.inventory_movements FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'owner') OR branch_id = public.current_branch()
);

-- PURCHASES
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  supplier TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  buying_price NUMERIC(12,2) NOT NULL CHECK (buying_price >= 0),
  transport_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (transport_cost >= 0),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_purchases" ON public.purchases FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'owner') OR branch_id = public.current_branch()
);
CREATE POLICY "insert_purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'owner') OR branch_id = public.current_branch()
);
CREATE POLICY "owner_modify_purchases" ON public.purchases FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'owner'));
CREATE POLICY "owner_delete_purchases" ON public.purchases FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'owner'));

-- SALES
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  selling_price NUMERIC(12,2) NOT NULL CHECK (selling_price >= 0),
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_sales" ON public.sales FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'owner') OR branch_id = public.current_branch()
);
CREATE POLICY "insert_sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'owner') OR branch_id = public.current_branch()
);
CREATE POLICY "owner_modify_sales" ON public.sales FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'owner'));
CREATE POLICY "owner_delete_sales" ON public.sales FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'owner'));

-- EXPENSES
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_expenses" ON public.expenses FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'owner') OR branch_id = public.current_branch()
);
CREATE POLICY "insert_expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'owner') OR branch_id = public.current_branch()
);
CREATE POLICY "owner_modify_expenses" ON public.expenses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'owner'));
CREATE POLICY "owner_delete_expenses" ON public.expenses FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'owner'));

-- TRIGGERS: purchase -> stock in
CREATE OR REPLACE FUNCTION public.apply_purchase()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.inventory(branch_id, product_id, quantity, updated_at)
  VALUES (NEW.branch_id, NEW.product_id, NEW.quantity, now())
  ON CONFLICT (branch_id, product_id)
  DO UPDATE SET quantity = public.inventory.quantity + EXCLUDED.quantity, updated_at = now();

  INSERT INTO public.inventory_movements(branch_id, product_id, type, quantity, ref_type, ref_id)
  VALUES (NEW.branch_id, NEW.product_id, 'in', NEW.quantity, 'purchase', NEW.id);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_apply_purchase
AFTER INSERT ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.apply_purchase();

-- sale -> stock out + profit
CREATE OR REPLACE FUNCTION public.apply_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_qty NUMERIC(12,2);
  cost NUMERIC(12,2);
BEGIN
  SELECT quantity INTO current_qty FROM public.inventory
  WHERE branch_id = NEW.branch_id AND product_id = NEW.product_id FOR UPDATE;

  IF current_qty IS NULL OR current_qty < NEW.quantity THEN
    RAISE EXCEPTION 'Ntibishoboka: ububiko ntibuhagije' USING ERRCODE = 'check_violation';
  END IF;

  SELECT buying_price INTO cost FROM public.products WHERE id = NEW.product_id;
  NEW.unit_cost := COALESCE(cost, 0);
  NEW.profit := (NEW.selling_price - NEW.unit_cost) * NEW.quantity;

  UPDATE public.inventory
     SET quantity = quantity - NEW.quantity, updated_at = now()
   WHERE branch_id = NEW.branch_id AND product_id = NEW.product_id;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_apply_sale
BEFORE INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.apply_sale();

CREATE OR REPLACE FUNCTION public.record_sale_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.inventory_movements(branch_id, product_id, type, quantity, ref_type, ref_id)
  VALUES (NEW.branch_id, NEW.product_id, 'out', NEW.quantity, 'sale', NEW.id);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_record_sale_movement
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.record_sale_movement();

-- Auto-create profile + first user becomes owner
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INTEGER;
BEGIN
  INSERT INTO public.profiles(id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'owner');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
