-- Run once in Supabase SQL editor
-- Creates supplier_factories table and extends supplier_offerings + supplier_products

CREATE TABLE IF NOT EXISTS public.supplier_factories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL
    REFERENCES public.supplier_offerings(id)
    ON DELETE CASCADE,

  -- Identity
  factory_name text NOT NULL DEFAULT 'Main Factory',
  country text,
  city text,
  address text,
  is_primary boolean DEFAULT true,

  -- Kosher (per factory)
  kosher_types text[] DEFAULT '{}',
  -- Values: Chief Rabbinate, Badatz Beit Yosef, Badatz Eida Chareidis, Mehadrin, OU, OK, KF
  kosher_certifying_body text,
  -- e.g. "OU Kosher", "KSA", "Kedassia"
  kosher_passover boolean DEFAULT false,
  kosher_year_round boolean DEFAULT true,

  -- Quality certifications
  certifications_quality text[] DEFAULT '{}',
  -- BRC, IFS, FSSC 22000, ISO 22000, ISO 9001, HACCP, SQF, GlobalG.A.P.
  brc_grade text,
  -- AA, A, B, C
  ifs_grade text,
  -- Higher, Foundation

  -- Dietary certifications
  certifications_dietary text[] DEFAULT '{}',
  -- Organic, Halal, Gluten Free, Vegan, Non-GMO, Rainforest Alliance, Fair Trade

  -- Capacity
  production_capacity text,
  employees_count text,

  notes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS factories_supplier_idx
  ON public.supplier_factories (supplier_id);

ALTER TABLE public.supplier_factories
  ENABLE ROW LEVEL SECURITY;

-- Add factory_id to supplier_products
ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS factory_id uuid
    REFERENCES public.supplier_factories(id)
    ON DELETE SET NULL;

-- Add enhanced fields to supplier_offerings
ALTER TABLE public.supplier_offerings
  ADD COLUMN IF NOT EXISTS founded_year int,
  ADD COLUMN IF NOT EXISTS employees_range text,
  ADD COLUMN IF NOT EXISTS annual_revenue text,
  ADD COLUMN IF NOT EXISTS export_markets text[],
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_title text,
  ADD COLUMN IF NOT EXISTS scrape_log text,
  ADD COLUMN IF NOT EXISTS csv_import_batch text;

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'supplier_factories';
