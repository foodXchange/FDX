-- Run in Supabase SQL editor BEFORE deploying Workflow Automation code.
-- Adds new columns to sourcing_matches for the full approve→send→respond→close pipeline.

ALTER TABLE public.sourcing_matches
  ADD COLUMN IF NOT EXISTS responded_at  timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS response_note text,
  ADD COLUMN IF NOT EXISTS sent_via      text;

-- Indexes for pipeline queries
CREATE INDEX IF NOT EXISTS sourcing_matches_status_idx
  ON public.sourcing_matches(status);

CREATE INDEX IF NOT EXISTS sourcing_matches_request_idx
  ON public.sourcing_matches(request_id);
