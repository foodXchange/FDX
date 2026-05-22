-- Factory certification inheritance: add override flag to products
-- Run in Supabase SQL editor

ALTER TABLE supplier_products
  ADD COLUMN IF NOT EXISTS product_override_kosher boolean DEFAULT false;
