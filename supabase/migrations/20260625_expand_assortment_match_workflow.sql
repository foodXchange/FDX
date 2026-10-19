-- Migration: 20260625_expand_assortment_match_workflow.sql
-- Expands assortment_matches status check constraint to support the full B2B commercial lifecycle:
-- proposed -> reviewed -> pitched -> in_negotiation -> accepted -> deal_won / rejected

ALTER TABLE public.assortment_matches 
  DROP CONSTRAINT IF EXISTS assortment_matches_status_check;

ALTER TABLE public.assortment_matches 
  ADD CONSTRAINT assortment_matches_status_check 
  CHECK (status IN (
    'proposed',
    'reviewed',
    'pitched',
    'in_negotiation',
    'accepted',
    'deal_won',
    'rejected'
  ));
