-- A single owner-managed instruction shown on the Sales Targets page.
CREATE TABLE IF NOT EXISTS public.sales_pricing_instruction (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.sales_pricing_instruction (id, content)
VALUES (
  TRUE,
  'Sell every product at its normal price shown in the system. Only the business owner may update product selling prices. Do not offer unapproved discounts or change a price during a sale.'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.sales_pricing_instruction ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.sales_pricing_instruction TO authenticated;
GRANT INSERT, UPDATE ON public.sales_pricing_instruction TO authenticated;

CREATE POLICY read_sales_pricing_instruction ON public.sales_pricing_instruction
FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY owner_manage_sales_pricing_instruction ON public.sales_pricing_instruction
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE OR REPLACE FUNCTION public.set_sales_pricing_instruction_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sales_pricing_instruction_updated_at
BEFORE INSERT OR UPDATE ON public.sales_pricing_instruction
FOR EACH ROW EXECUTE FUNCTION public.set_sales_pricing_instruction_updated_at();
