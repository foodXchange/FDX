-- Tracks when a buyer first opens a match's details slide-over, for future
-- QA-metrics use. Additive only — does not touch existing columns/policies.
alter table sourcing_matches
  add column if not exists viewed_by_buyer_at timestamptz;
