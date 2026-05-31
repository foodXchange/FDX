-- Add processing_type and ingredients to supplier_products
alter table public.supplier_products
  add column if not exists processing_type text;

alter table public.supplier_products
  add column if not exists ingredients text;

-- No NOT NULL constraints; these are optional enrichment fields
