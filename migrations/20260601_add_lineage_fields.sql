-- Lineage fields for supplier_products: which page each product was extracted from.
-- extraction_confidence is already stored as scrape_confidence — no new column needed.
alter table public.supplier_products
  add column if not exists source_url text;

alter table public.supplier_products
  add column if not exists page_type  text;
