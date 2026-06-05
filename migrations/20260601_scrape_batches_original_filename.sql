-- Add original_filename to scrape_batches so the real file name is
-- queryable directly from the batch record, independent of scraper_csv_uploads.

ALTER TABLE public.scrape_batches
  ADD COLUMN IF NOT EXISTS original_filename text;
