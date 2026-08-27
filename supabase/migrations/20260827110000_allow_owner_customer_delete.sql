-- The owner-facing Customers screen supports deletion. Keep that operation
-- restricted to owners while allowing the existing worker insert workflow.
GRANT DELETE ON public.customers TO authenticated;
DROP POLICY IF EXISTS owner_delete_customers ON public.customers;
CREATE POLICY owner_delete_customers ON public.customers
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner'));
