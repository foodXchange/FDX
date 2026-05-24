-- Run in Supabase SQL editor.
-- Adds category_id FK to supplier_products and supplier_offerings,
-- then auto-maps existing text categories to IDs.
-- Safe to re-run (IF NOT EXISTS + IS NULL guards).

-- ── Step 1: Add columns ───────────────────────────────────────────────────────

ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.product_categories(id);

ALTER TABLE public.supplier_offerings
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.product_categories(id);

-- ── Step 2: Auto-map supplier_products ───────────────────────────────────────
-- Priority: exact match wins; then substring match

UPDATE public.supplier_products sp
SET category_id = pc.id
FROM public.product_categories pc
WHERE sp.category_id IS NULL
  AND sp.category IS NOT NULL
  AND (
    lower(sp.category) = lower(pc.name)
    OR lower(sp.category) LIKE '%' || lower(pc.name) || '%'
    OR lower(pc.name) LIKE '%' || lower(sp.category) || '%'
  );

-- ── Step 3: Auto-map supplier_offerings (uses categories[1] as primary) ──────

UPDATE public.supplier_offerings so
SET category_id = pc.id
FROM public.product_categories pc
WHERE so.category_id IS NULL
  AND so.categories IS NOT NULL
  AND array_length(so.categories, 1) > 0
  AND (
    lower(so.categories[1]) = lower(pc.name)
    OR lower(so.categories[1]) LIKE '%' || lower(pc.name) || '%'
    OR lower(pc.name) LIKE '%' || lower(so.categories[1]) || '%'
  );

-- ── Step 4: Report unmapped supplier_products ─────────────────────────────────

SELECT
  category,
  COUNT(*) AS unmapped_count
FROM public.supplier_products
WHERE category_id IS NULL
  AND category IS NOT NULL
GROUP BY category
ORDER BY COUNT(*) DESC;
