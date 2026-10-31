-- Migration: Add structured matching attributes to sourcing_requests
-- Created at: 2026-10-30

ALTER TABLE public.sourcing_requests 
  ADD COLUMN IF NOT EXISTS dietary_requirements TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS temperature_regime VARCHAR(50) DEFAULT 'ambient',
  ADD COLUMN IF NOT EXISTS target_weight_min_g INTEGER NULL,
  ADD COLUMN IF NOT EXISTS target_weight_max_g INTEGER NULL,
  ADD COLUMN IF NOT EXISTS preferred_origins TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS excluded_ingredients TEXT[] DEFAULT '{}';

-- Btree index for temperature queries
CREATE INDEX IF NOT EXISTS idx_sourcing_requests_temperature_regime 
  ON public.sourcing_requests(temperature_regime) 
  WHERE deleted_at IS NULL;
