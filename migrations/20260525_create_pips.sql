-- Create PIP storage, grouping provenance, and PIP-level match results.
-- Run in Supabase SQL editor before deploying code that depends on pips.

create type if not exists public.pip_status as enum (
  'draft',
  'needs_review',
  'confirmed',
  'matched'
);

create type if not exists public.pip_created_from as enum (
  'text',
  'image',
  'manual'
);

create table if not exists public.pips (
  id uuid primary key default gen_random_uuid(),
  sourcing_request_id uuid not null references public.sourcing_requests(id) on delete cascade,
  product_family_key text,
  pip_version int not null default 1,
  status public.pip_status not null default 'draft',
  created_from public.pip_created_from not null default 'text',
  data_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pips_sourcing_request_id_key on public.pips (sourcing_request_id);
create index if not exists pips_product_family_key_idx on public.pips (product_family_key);

create table if not exists public.pip_grouping_decisions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.sourcing_requests(id) on delete cascade,
  grouping_decision jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pip_matches (
  id uuid primary key default gen_random_uuid(),
  pip_id uuid not null references public.pips(id) on delete cascade,
  supplier_id uuid not null,
  score numeric not null,
  explanation_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pip_matches_pip_id_idx on public.pip_matches (pip_id);
