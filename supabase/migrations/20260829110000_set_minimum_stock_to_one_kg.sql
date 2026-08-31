-- Use one kilogram as the standard minimum-stock threshold.
UPDATE public.products
SET min_stock = 1
WHERE min_stock IS DISTINCT FROM 1;

ALTER TABLE public.products
ALTER COLUMN min_stock SET DEFAULT 1;
