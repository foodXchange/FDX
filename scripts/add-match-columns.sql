-- Run in Supabase SQL editor before deploying

ALTER TABLE sourcing_matches
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS match_summary text,
  ADD COLUMN IF NOT EXISTS whatsapp_message text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

ALTER TABLE sourcing_requests
  ADD COLUMN IF NOT EXISTS last_matched_at timestamptz,
  ADD COLUMN IF NOT EXISTS best_match_score int,
  ADD COLUMN IF NOT EXISTS match_count int DEFAULT 0;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('sourcing_matches', 'sourcing_requests')
  AND column_name IN (
    'product_name', 'company_name', 'country', 'match_summary',
    'whatsapp_message', 'approved_at', 'rejected_at', 'sent_at',
    'last_matched_at', 'best_match_score', 'match_count'
  )
ORDER BY table_name, column_name;
