-- ─── CATALOGUE PRODUCTS TABLE ───────────────────────────────────────────────
create table if not exists public.catalogue_products (
  id uuid primary key default gen_random_uuid(),

  -- Product identity
  product_name text not null,
  brand_name text,
  tagline text,

  -- Link to supplier (optional)
  supplier_id uuid references public.supplier_offerings(id) on delete set null,

  -- Category
  category text not null,
  subcategory text,

  -- Product specs
  format text,
  size text,
  country_of_origin text,
  certifications text[] default '{}',
  private_label_available boolean default false,

  -- Catalogue image (AI-generated or uploaded)
  catalogue_image_url text,

  -- AI generation fields
  image_prompt text,
  brand_name_rationale text,

  -- Status
  status text default 'draft'
    check (status in ('draft', 'ready', 'archived')),
  featured boolean default false,

  -- Tags for matching to buyer requests
  tags text[] default '{}',

  -- Internal notes
  internal_notes text,

  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists catalogue_category_idx
  on public.catalogue_products (category, status);

create index if not exists catalogue_supplier_idx
  on public.catalogue_products (supplier_id);

create index if not exists catalogue_tags_gin
  on public.catalogue_products using gin (tags);

create index if not exists catalogue_featured_idx
  on public.catalogue_products (featured, status);


-- ─── CATALOGUE PRESENTATIONS TABLE ──────────────────────────────────────────
create table if not exists public.catalogue_presentations (
  id uuid primary key default gen_random_uuid(),

  -- Who it was for (buyer_id is optional — no FK since buyers table may not exist)
  buyer_id uuid,
  buyer_name text,

  -- Which products (ordered)
  product_ids uuid[] not null,

  -- PDF (stored in Supabase suppliers bucket after generation)
  pdf_url text,

  -- Metadata
  title text,
  notes text,
  status text default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'converted')),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists presentations_buyer_idx
  on public.catalogue_presentations (buyer_id);


-- ─── AUTO-UPDATE TRIGGERS ────────────────────────────────────────────────────
create or replace function set_catalogue_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_catalogue_products_updated_at
  on public.catalogue_products;

create trigger trg_catalogue_products_updated_at
before update on public.catalogue_products
for each row execute function set_catalogue_updated_at();

drop trigger if exists trg_catalogue_presentations_updated_at
  on public.catalogue_presentations;

create trigger trg_catalogue_presentations_updated_at
before update on public.catalogue_presentations
for each row execute function set_catalogue_updated_at();


-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.catalogue_products enable row level security;
alter table public.catalogue_presentations enable row level security;


-- ─── SEED: 3 SAMPLE PRODUCTS ─────────────────────────────────────────────────
insert into public.catalogue_products (
  product_name, brand_name, tagline, category,
  format, size, country_of_origin, certifications,
  private_label_available, status, featured, tags, image_prompt
) values
(
  'Extra Virgin Olive Oil',
  'Valloria',
  'From the hills of Andalusia',
  'Oils & Fats',
  'Glass bottle 750ml',
  '750ml',
  'Spain',
  array['Kosher', 'BRC', 'IFS'],
  true,
  'ready',
  true,
  array['olive oil', 'evoo', 'spain', 'kosher', 'private label', 'retail'],
  'Professional food photography of a 750ml glass bottle of extra virgin olive oil, pure white background, studio lighting, elegant label reading VALLORIA, gold and green color scheme, photorealistic, high resolution'
),
(
  'Albacore Tuna Fillets',
  'Mareblu Reserve',
  'Wild caught, hand packed',
  'Fish & Seafood',
  'Glass jar 180g',
  '180g',
  'Spain',
  array['Kosher', 'BRC'],
  true,
  'ready',
  false,
  array['tuna', 'albacore', 'glass jar', 'kosher', 'seafood', 'premium'],
  'Professional food photography of a 180g glass jar of premium tuna fillets in olive oil, pure white background, studio lighting, elegant navy and gold label reading MAREBLU RESERVE, photorealistic'
),
(
  'Harissa Pepper Sauce',
  'Medina Gold',
  'Authentic Moroccan heat',
  'Sauces & Condiments',
  'Glass jar 280g',
  '280g',
  'Morocco',
  array['Kosher', 'Halal'],
  true,
  'ready',
  false,
  array['harissa', 'sauce', 'moroccan', 'kosher', 'halal', 'spicy'],
  'Professional food photography of a 280g glass jar of harissa sauce, pure white background, studio lighting, rich dark label with gold accents reading MEDINA GOLD, photorealistic'
);


-- ─── VERIFICATION ─────────────────────────────────────────────────────────────
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('catalogue_products', 'catalogue_presentations');
