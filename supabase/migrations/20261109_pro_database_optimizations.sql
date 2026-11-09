-- ==============================================================================
-- Migration: 20261109_pro_database_optimizations.sql
-- Description: Performance & Indexing Optimizations for Supabase Pro Plan
-- Applied on 27,442 supplier offerings, 3,620 matches, and 203 requests.
-- ==============================================================================

-- 1. Accelerate Scraper Queue & Status Lookups
CREATE INDEX IF NOT EXISTS idx_supplier_offerings_scrape_status 
  ON supplier_offerings (scrape_status) 
  WHERE scrape_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_offerings_pending_scrape 
  ON supplier_offerings (id, company_name, website) 
  WHERE scrape_status = 'pending' OR scrape_status IS NULL;

-- 2. Fast Domain Deduplication & Verification Index
CREATE INDEX IF NOT EXISTS idx_supplier_offerings_website_domain 
  ON supplier_offerings (website_domain) 
  WHERE website_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_offerings_country_status 
  ON supplier_offerings (country_of_origin, status);

-- 3. High-Performance GIN Search Indexes for Categories & Certifications
-- Enables sub-millisecond filtering across thousands of tags, formats & certs
CREATE INDEX IF NOT EXISTS idx_supplier_offerings_certifications_gin 
  ON supplier_offerings USING gin (certifications);

CREATE INDEX IF NOT EXISTS idx_supplier_offerings_kosher_types_gin 
  ON supplier_offerings USING gin (kosher_types);

CREATE INDEX IF NOT EXISTS idx_supplier_offerings_categories_gin 
  ON supplier_offerings USING gin (categories);

-- 4. Match Engine & Deal Progression Pipeline Indexes
CREATE INDEX IF NOT EXISTS idx_sourcing_matches_req_score 
  ON sourcing_matches (request_id, match_score DESC);

CREATE INDEX IF NOT EXISTS idx_sourcing_matches_status_sent 
  ON sourcing_matches (status, sent_at);

CREATE INDEX IF NOT EXISTS idx_sourcing_matches_supplier_id 
  ON sourcing_matches (supplier_id);

-- 5. Supplier Contacts Fast Lookup
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier_id 
  ON supplier_contacts (supplier_id, scraped_at DESC);

-- 6. Enable pg_trgm for ultra-fast fuzzy name & product searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_supplier_offerings_company_name_trgm 
  ON supplier_offerings USING gin (company_name gin_trgm_ops);

-- End of migration
