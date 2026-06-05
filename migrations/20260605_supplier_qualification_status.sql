ALTER TABLE supplier_offerings
  ADD COLUMN IF NOT EXISTS product_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qualification_status text DEFAULT 'empty';

UPDATE supplier_offerings AS so
SET
  product_count = (
    SELECT COUNT(*) FROM supplier_products sp WHERE sp.supplier_id = so.id
  ),
  qualification_status = CASE
    WHEN (
      SELECT COUNT(*) FROM supplier_products sp WHERE sp.supplier_id = so.id
    ) >= 3 THEN 'strong'
    WHEN (
      SELECT COUNT(*) FROM supplier_products sp WHERE sp.supplier_id = so.id
    ) IN (1, 2) THEN 'thin'
    ELSE 'empty'
  END;
