-- Run in Supabase SQL editor.
-- Adds duplicate_of_supplier_id flag column, then surfaces potential duplicates.
-- Does NOT auto-merge — output is for human review.

-- ── Step 1: Add flag column ───────────────────────────────────────────────────

ALTER TABLE public.supplier_offerings
  ADD COLUMN IF NOT EXISTS duplicate_of_supplier_id uuid
  REFERENCES public.supplier_offerings(id);

-- ── Step 2: Detect duplicates by normalized company name ─────────────────────
-- Returns pairs where name matches; a.id < b.id ensures no double-counting.
-- "keep_id" is the record with the lexicographically smaller UUID (arbitrary —
--  admin should verify which record has better data before marking).

SELECT
  a.id               AS keep_id,
  b.id               AS duplicate_id,
  a.company_name,
  a.country_of_origin AS country,
  a.status           AS keep_status,
  b.status           AS dup_status
FROM public.supplier_offerings a
JOIN public.supplier_offerings b
  ON lower(trim(a.company_name)) = lower(trim(b.company_name))
  AND a.id < b.id
ORDER BY a.company_name;

-- ── Step 3 (optional): Count duplicate groups ─────────────────────────────────

SELECT
  lower(trim(company_name)) AS normalized_name,
  COUNT(*) AS duplicate_count
FROM public.supplier_offerings
GROUP BY lower(trim(company_name))
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;
