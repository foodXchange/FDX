-- Migration: 20260624_buyer_assortments_and_retail_trends.sql
-- Enables buyer assortment scraping, private label mapping, and retail trend intelligence

-- 1. BUYER ASSORTMENTS (Store private labels and brand lines stocked by enterprise buyers)
create table if not exists public.buyer_assortments (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.buyers(id) on delete cascade,
  buyer_company_id uuid references public.buyer_companies(id) on delete set null,
  category_id uuid references public.product_categories(id) on delete set null,
  product_name text not null,
  brand_name text,
  is_private_label boolean default false,
  manufacturer_name text,
  manufacturer_country text,
  barcode_gtin text,
  package_size text,
  retail_price_ils numeric(10, 2),
  source_url text,
  ingredients text,
  certifications text[] default '{}',
  kosher_types text[] default '{}',
  scrape_confidence numeric(3, 2) default 1.00,
  embedding vector(1024),
  raw_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_assortments_buyer_id_idx on public.buyer_assortments(buyer_id);
create index if not exists buyer_assortments_category_id_idx on public.buyer_assortments(category_id);
create index if not exists buyer_assortments_is_pl_idx on public.buyer_assortments(is_private_label);
create index if not exists buyer_assortments_barcode_idx on public.buyer_assortments(barcode_gtin);

alter table public.buyer_assortments enable row level security;

-- Policies for buyer_assortments
create policy "Allow public read access to buyer assortments"
  on public.buyer_assortments for select using (true);

create policy "Allow service role full access to buyer assortments"
  on public.buyer_assortments for all
  using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');


-- 2. BUYER SOURCING SPECS (Buyer RFQs & Sourcing criteria for reverse matching)
create table if not exists public.buyer_sourcing_specs (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.buyers(id) on delete cascade,
  category_id uuid references public.product_categories(id) on delete set null,
  target_product text not null,
  target_format text,
  preferred_origin text[] default '{}',
  required_certifications text[] default '{}',
  target_volume text,
  packaging_type text,
  status text check (status in ('active', 'matched', 'closed')) default 'active',
  urgency text check (urgency in ('low', 'normal', 'high', 'critical')) default 'normal',
  embedding vector(1024),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_sourcing_specs_buyer_idx on public.buyer_sourcing_specs(buyer_id);
create index if not exists buyer_sourcing_specs_category_idx on public.buyer_sourcing_specs(category_id);
create index if not exists buyer_sourcing_specs_status_idx on public.buyer_sourcing_specs(status);

alter table public.buyer_sourcing_specs enable row level security;

create policy "Allow public read access to buyer sourcing specs"
  on public.buyer_sourcing_specs for select using (true);

create policy "Allow service role full access to buyer sourcing specs"
  on public.buyer_sourcing_specs for all
  using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');


-- 3. RETAIL TRENDS (Shelf shifts, rising categories, private-label demand surges)
create table if not exists public.retail_trends (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  trend_title text not null,
  market_region text default 'Israel',
  trend_direction text check (trend_direction in ('rising', 'stable', 'declining')) default 'rising',
  momentum_score numeric(5, 2) default 75.00,
  price_index_change_pct numeric(5, 2) default 0.00,
  summary text,
  key_drivers text[] default '{}',
  consumer_keywords text[] default '{}',
  sample_skus jsonb default '[]'::jsonb,
  data_source text default 'retail_scraper',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists retail_trends_category_idx on public.retail_trends(category_id);
create index if not exists retail_trends_region_idx on public.retail_trends(market_region);
create index if not exists retail_trends_direction_idx on public.retail_trends(trend_direction);

alter table public.retail_trends enable row level security;

create policy "Allow public read access to retail trends"
  on public.retail_trends for select using (true);

create policy "Allow service role full access to retail trends"
  on public.retail_trends for all
  using (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role' or auth.role() = 'service_role');
