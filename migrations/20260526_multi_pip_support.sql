-- Phase 3 prerequisite: allow multiple PIPs per request (v2 image PIPs).
-- The original migration created a unique index on sourcing_request_id which
-- prevents inserting a second PIP for the same request. Drop it.

drop index if exists public.pips_sourcing_request_id_key;

-- Keep a non-unique index for fast lookups by request.
create index if not exists pips_sourcing_request_id_idx
  on public.pips (sourcing_request_id);

-- Enable deterministic upsert on grouping decisions (one row per request).
create unique index if not exists pip_grouping_decisions_request_id_key
  on public.pip_grouping_decisions (request_id);

-- Verify: should still be 223 after this migration.
-- select count(*) from public.pips;
