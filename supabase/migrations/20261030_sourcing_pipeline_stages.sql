-- Migration: Add Manual Pipeline Stage Management to sourcing_requests
-- Created at: 2026-10-30

-- 1. Extend sourcing_requests with pipeline stage columns
ALTER TABLE sourcing_requests 
  ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'stage_1_brief',
  ADD COLUMN IF NOT EXISTS pipeline_substage VARCHAR(50) DEFAULT '1.1_draft',
  ADD COLUMN IF NOT EXISTS exception_status VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS exception_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS active_supplier_id UUID REFERENCES supplier_offerings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS stage_updated_by VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS stage_notes TEXT NULL;

-- 2. Create index for fast pipeline filtering & radar view
CREATE INDEX IF NOT EXISTS idx_sourcing_requests_pipeline_stage 
  ON sourcing_requests(pipeline_stage, exception_status) 
  WHERE deleted_at IS NULL;

-- 3. Create stage transition audit history table
CREATE TABLE IF NOT EXISTS request_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES sourcing_requests(id) ON DELETE CASCADE,
  from_stage VARCHAR(50) NOT NULL,
  to_stage VARCHAR(50) NOT NULL,
  from_substage VARCHAR(50) NULL,
  to_substage VARCHAR(50) NULL,
  exception_status VARCHAR(50) NULL,
  changed_by VARCHAR(100) NOT NULL DEFAULT 'Admin',
  change_notes TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_stage_history_req ON request_stage_history(request_id, created_at DESC);

-- 4. Sensible backfill of existing requests based on their current status and brief_status
UPDATE sourcing_requests
SET 
  pipeline_stage = CASE
    WHEN status = 'matched' THEN 'stage_2_sourcing'
    WHEN brief_status = 'confirmed' THEN 'stage_2_sourcing'
    WHEN brief_status = 'sent' THEN 'stage_1_brief'
    ELSE 'stage_1_brief'
  END,
  pipeline_substage = CASE
    WHEN status = 'matched' THEN '2.1_matches_found'
    WHEN brief_status = 'confirmed' THEN '2.1_matches_found'
    WHEN brief_status = 'sent' THEN '1.2_waiting_buyer'
    ELSE '1.1_draft'
  END,
  stage_updated_at = COALESCE(confirmed_at, created_at, NOW())
WHERE pipeline_stage IS NULL OR pipeline_stage = 'stage_1_brief';
