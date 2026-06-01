-- 20260601_reclassify_categories.sql
--
-- Category reclassification — dry-run approved 2026-06-01
-- Root cause fixed: lib/pip/resolveCategoryId.ts now uses LLM classifier
-- constrained to 21 canonical leaf IDs (never substring match).
--
-- HOW TO APPLY
--   1. Run this file in the Supabase SQL editor (creates snapshot + renames).
--   2. Run the apply script for data updates:
--        npx tsx --tsconfig tsconfig.json --env-file .env.local scripts/apply-reclass.ts
--
-- ROLLBACK
--   1. Restore supplier_products from the snapshot table (SQL below).
--   2. Restore sourcing_requests from migrations/reports/reclass_requests_backup_20260601.json.
--   3. Run the undo renames (SQL below).

-- ── 1. Reversible snapshot ───────────────────────────────────────────────────
-- Must run BEFORE apply-reclass.ts.  Captures current category_id for all
-- products in the two dump buckets so they can be restored on rollback.

CREATE TABLE IF NOT EXISTS public._reclass_snapshot_20260601 AS
SELECT id, category_id AS old_category_id
FROM public.supplier_products
WHERE category_id IN (
  'd1adcc9f-c6a7-40a2-a4a9-5cfbc7d10dad', -- "Organic Focaccia" dump  (236 rows)
  '18f4fb10-0337-45c8-a9d3-d063052db846'  -- "Other Plant Proteins" dump (271 rows)
);

-- ── 2. Rename categories ─────────────────────────────────────────────────────
-- "Tomato & Ketchup-Based" → "Tomato Products"
UPDATE public.product_categories
SET name = 'Tomato Products'
WHERE id = '2b5f3c21-1770-4da3-b0ec-6147ffbcc8c7'
  AND name != 'Tomato Products';            -- idempotent

-- "Other Plant Proteins" → "Plant-Based Proteins"
UPDATE public.product_categories
SET name = 'Plant-Based Proteins'
WHERE id = '18f4fb10-0337-45c8-a9d3-d063052db846'
  AND name != 'Plant-Based Proteins';       -- idempotent

-- ── 3. Unclassified category ─────────────────────────────────────────────────
-- NOTE: product_categories requires NOT NULL on tier1/tier2, so a bare INSERT
-- is not safe here.  Products with no valid classification get category_id = NULL
-- (handled in apply-reclass.ts).  No row insert needed.

-- ── Verify (run after this file to confirm before running apply-reclass.ts) ──
-- SELECT id, name FROM public.product_categories
--   WHERE id IN ('2b5f3c21-1770-4da3-b0ec-6147ffbcc8c7',
--                '18f4fb10-0337-45c8-a9d3-d063052db846');
-- SELECT COUNT(*) FROM public._reclass_snapshot_20260601;   -- expect 507

-- ── ROLLBACK SCRIPT (uncomment to undo data changes) ────────────────────────
-- Step 1: restore supplier_products category_ids
-- UPDATE public.supplier_products sp
-- SET    category_id = s.old_category_id
-- FROM   public._reclass_snapshot_20260601 s
-- WHERE  sp.id = s.id;
--
-- Step 2: undo category renames
-- UPDATE public.product_categories
-- SET name = 'Tomato & Ketchup-Based'
-- WHERE id = '2b5f3c21-1770-4da3-b0ec-6147ffbcc8c7';
--
-- UPDATE public.product_categories
-- SET name = 'Other Plant Proteins'
-- WHERE id = '18f4fb10-0337-45c8-a9d3-d063052db846';
--
-- Step 3: drop snapshot
-- DROP TABLE IF EXISTS public._reclass_snapshot_20260601;
--
-- Step 4: restore sourcing_requests from JSON backup
-- (see migrations/reports/reclass_requests_backup_20260601.json)
