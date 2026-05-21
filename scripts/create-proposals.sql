-- ─────────────────────────────────────────────────────────
-- Proposals tables
-- Run this in the Supabase SQL editor
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 12),
  buyer_id uuid,              -- no FK (buyers table not guaranteed to exist)
  buyer_name text NOT NULL,
  buyer_company text,
  product_ids uuid[] NOT NULL,
  title text,
  personal_message text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted')),
  expires_at timestamptz,
  view_count int DEFAULT 0,
  last_viewed_at timestamptz,
  viewed_product_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposals_token_idx ON public.proposals (token);
CREATE INDEX IF NOT EXISTS proposals_buyer_idx ON public.proposals (buyer_id);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Public can read active proposals by token
CREATE POLICY "Public read active proposals"
  ON public.proposals
  FOR SELECT
  USING (status = 'active');

-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.proposal_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.catalogue_products(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'page_view',
    'product_view',
    'request_click',
    'whatsapp_click'
  )),
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposal_views_proposal_idx
  ON public.proposal_views (proposal_id, created_at);

ALTER TABLE public.proposal_views ENABLE ROW LEVEL SECURITY;

-- Allow public insert of view events (tracking)
CREATE POLICY "Allow public insert proposal views"
  ON public.proposal_views
  FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('proposals', 'proposal_views');
