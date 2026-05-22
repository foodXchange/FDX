-- Run in Supabase SQL editor BEFORE deploying code changes
-- (matching query filters on needs_review column)

ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;

-- Remove low-confidence unverified products
DELETE FROM supplier_products
WHERE scrape_confidence < 0.4
  AND manually_verified = false;

-- Flag medium-confidence for review
UPDATE supplier_products
SET needs_review = true
WHERE scrape_confidence < 0.6
  AND scrape_confidence >= 0.4
  AND manually_verified = false;

-- Verify
SELECT
  COUNT(*) AS total,
  COUNT(CASE WHEN needs_review = true THEN 1 END) AS needs_review,
  COUNT(CASE WHEN scrape_confidence >= 0.6 THEN 1 END) AS good_quality,
  COUNT(CASE WHEN manually_verified = true THEN 1 END) AS verified
FROM supplier_products;
