-- Run this in the Supabase SQL editor before deploying Matching v1.
-- Safe to run multiple times (IF NOT EXISTS guards).

-- Enable trigram extension for fuzzy text search
create extension if not exists pg_trgm;

-- Fast JSON queries on PIP (intent_json column)
create index if not exists sourcing_requests_intent_gin
  on public.sourcing_requests using gin (intent_json jsonb_path_ops);

-- Text similarity on supplier product names
create index if not exists supplier_products_name_trgm
  on public.supplier_products using gin (product_name gin_trgm_ops);

-- Text similarity on supplier product categories
create index if not exists supplier_products_category_trgm
  on public.supplier_products using gin (category gin_trgm_ops);

-- Array overlap acceleration for formats
create index if not exists supplier_products_formats_gin
  on public.supplier_products using gin (formats);

-- Array overlap acceleration for certifications
create index if not exists supplier_products_certs_gin
  on public.supplier_products using gin (certifications);
