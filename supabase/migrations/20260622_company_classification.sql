-- Multi-sector company classification
-- Every scraped company is classified (sector + business role + category) instead of
-- being discarded as "not a manufacturer". scrape_status keeps its existing meaning
-- ("skipped" = no product extraction); classification_route says what we did instead.

ALTER TABLE supplier_offerings
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS business_role text,
  ADD COLUMN IF NOT EXISTS taxonomy_category text,
  ADD COLUMN IF NOT EXISTS taxonomy_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS capabilities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS offerings_summary text,
  ADD COLUMN IF NOT EXISTS is_potential_buyer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS classification_route text,        -- food_pipeline | profiled | invalid
  ADD COLUMN IF NOT EXISTS classification_confidence real,
  ADD COLUMN IF NOT EXISTS classification_reason text,
  ADD COLUMN IF NOT EXISTS classification_source text,       -- crawl | backfill_summary
  ADD COLUMN IF NOT EXISTS needs_classification_review boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS classified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_supplier_offerings_sector ON supplier_offerings (sector);
CREATE INDEX IF NOT EXISTS idx_supplier_offerings_business_role ON supplier_offerings (business_role);
CREATE INDEX IF NOT EXISTS idx_supplier_offerings_taxonomy_category ON supplier_offerings (taxonomy_category);
CREATE INDEX IF NOT EXISTS idx_supplier_offerings_potential_buyer
  ON supplier_offerings (is_potential_buyer) WHERE is_potential_buyer = true;
CREATE INDEX IF NOT EXISTS idx_supplier_offerings_taxonomy_tags
  ON supplier_offerings USING gin (taxonomy_tags);

-- Latest crawled content per company, so future re-classification never needs a re-crawl.
-- One row per supplier, content capped at 15k chars by the app (~15 KB per row).
CREATE TABLE IF NOT EXISTS crawl_snapshots (
  supplier_id uuid PRIMARY KEY REFERENCES supplier_offerings(id) ON DELETE CASCADE,
  source_url text,
  source text,                 -- firecrawl | search_grounding | perplexity
  content text NOT NULL,
  content_chars int,
  created_at timestamptz DEFAULT now()
);
