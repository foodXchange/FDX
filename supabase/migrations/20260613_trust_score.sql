-- Supplier trust score (0-100), recalculated on demand / via backfill script
alter table supplier_offerings add column if not exists trust_score integer default 0;
alter table supplier_offerings add column if not exists trust_score_updated_at timestamptz;
