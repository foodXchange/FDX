-- Migration: Add scrape_batches and scrape_batch_logs tables for persistent logging and batch tracking

-- Create scrape_batches table
CREATE TABLE IF NOT EXISTS public.scrape_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_key text NOT NULL UNIQUE,
  filenames text[] DEFAULT ARRAY[]::text[],
  uploader_id uuid NULL,
  status text NOT NULL DEFAULT 'pending',
  total_rows integer DEFAULT 0,
  processed integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  perplexity_fallback_count integer DEFAULT 0,
  skipped_count integer DEFAULT 0,
  products_found integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scrape_batches_batch_key ON public.scrape_batches(batch_key);
CREATE INDEX IF NOT EXISTS idx_scrape_batches_status ON public.scrape_batches(status);
CREATE INDEX IF NOT EXISTS idx_scrape_batches_created_at ON public.scrape_batches(created_at DESC);

-- Create scrape_batch_logs table
CREATE TABLE IF NOT EXISTS public.scrape_batch_logs (
  id bigserial PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES public.scrape_batches(id) ON DELETE CASCADE,
  supplier_id uuid NULL,
  row_index integer NULL,
  result text NULL,
  products_found integer DEFAULT 0,
  message text NULL,
  source text NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scrape_batch_logs_batch_id_created_at ON public.scrape_batch_logs(batch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_scrape_batch_logs_supplier_id ON public.scrape_batch_logs(supplier_id);

-- Optional: Set up RLS (row level security) if needed
ALTER TABLE public.scrape_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_batch_logs ENABLE ROW LEVEL SECURITY;

-- Allow all access for authenticated users (adjust as needed)
CREATE POLICY "allow_all_scrape_batches" ON public.scrape_batches FOR ALL USING (true);
CREATE POLICY "allow_all_scrape_batch_logs" ON public.scrape_batch_logs FOR ALL USING (true);
