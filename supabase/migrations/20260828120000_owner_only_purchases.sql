-- Product catalogue and stock receiving are controlled by the business owner.
-- Workers can sell from the approved catalogue but cannot create purchase records.
DROP POLICY IF EXISTS "insert_purchases" ON public.purchases;

CREATE POLICY "owner_insert_purchases"
ON public.purchases
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));
