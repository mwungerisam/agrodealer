-- Owner-managed operating model:
-- workers can sell approved products and add customers at their assigned branch;
-- all stock receiving, purchases, expenses, reports, and catalogue management remain owner-controlled.

DROP POLICY IF EXISTS "read_purchases" ON public.purchases;
CREATE POLICY "owner_read_purchases"
ON public.purchases
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "read_expenses" ON public.expenses;
DROP POLICY IF EXISTS "insert_expenses" ON public.expenses;
CREATE POLICY "owner_read_expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "owner_insert_expenses"
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "update_customers" ON public.customers;
CREATE POLICY "owner_update_customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'owner'));
