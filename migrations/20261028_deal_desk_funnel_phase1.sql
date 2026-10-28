-- ============================================================================
-- Deal Desk Funnel Redesign: Phase 1 schema
-- Date: 2026-10-28
-- Safe to re-run (idempotent). Apply via Supabase SQL editor or CLI.
-- ============================================================================

-- 1. sourcing_requests: draft lifecycle, buyer brief status, soft delete
alter table public.sourcing_requests
  add column if not exists brief_status   text not null default 'draft',
  add column if not exists brief_version  integer not null default 1,
  add column if not exists brief_sent_at  timestamptz,
  add column if not exists confirmed_at   timestamptz,
  add column if not exists confirmed_by   text,
  add column if not exists confirmed_via  text,          -- 'buyer_link' | 'admin_override'
  add column if not exists deleted_at     timestamptz,
  add column if not exists deleted_by     text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sourcing_requests_brief_status_check'
  ) then
    alter table public.sourcing_requests
      add constraint sourcing_requests_brief_status_check
      check (brief_status in ('draft','sent','changes_requested','confirmed','reconfirm_needed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sourcing_requests_confirmed_via_check'
  ) then
    alter table public.sourcing_requests
      add constraint sourcing_requests_confirmed_via_check
      check (confirmed_via is null or confirmed_via in ('buyer_link','admin_override'));
  end if;
end $$;

-- Allow status = 'draft': drop any legacy CHECK constraint on sourcing_requests.status
-- (more permissive; existing values new/matched/closed keep working).
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'public.sourcing_requests'::regclass
      and con.contype = 'c'
      and att.attname = 'status'
  loop
    execute format('alter table public.sourcing_requests drop constraint %I', c.conname);
  end loop;
end $$;

-- Backfill brief_status from legacy JSON approval card
update public.sourcing_requests
set brief_status = case ai_analysis->'buyer_brief_approval'->>'status'
                     when 'approved'           then 'confirmed'
                     when 'submitted_to_buyer' then 'sent'
                     else 'draft'
                   end,
    confirmed_at = case when ai_analysis->'buyer_brief_approval'->>'status' = 'approved'
                        then nullif(ai_analysis->'buyer_brief_approval'->>'approved_at','')::timestamptz
                        else confirmed_at end,
    confirmed_by = case when ai_analysis->'buyer_brief_approval'->>'status' = 'approved'
                        then ai_analysis->'buyer_brief_approval'->>'approved_by'
                        else confirmed_by end,
    confirmed_via = case when ai_analysis->'buyer_brief_approval'->>'status' = 'approved'
                         then 'admin_override' else confirmed_via end
where ai_analysis ? 'buyer_brief_approval'
  and brief_status = 'draft';

create index if not exists sourcing_requests_deleted_at_idx   on public.sourcing_requests (deleted_at);
create index if not exists sourcing_requests_brief_status_idx on public.sourcing_requests (brief_status);

-- 2. Public buyer brief links (/brief/[token]); only SHA-256 hash is stored
create table if not exists public.brief_tokens (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.sourcing_requests(id) on delete cascade,
  token_hash      text not null unique,
  brief_version   integer not null default 1,
  created_at      timestamptz not null default now(),
  created_by      text,
  expires_at      timestamptz not null default (now() + interval '30 days'),
  revoked_at      timestamptz,
  first_opened_at timestamptz,
  last_opened_at  timestamptz,
  open_count      integer not null default 0
);
create index if not exists brief_tokens_request_idx on public.brief_tokens (request_id);
alter table public.brief_tokens enable row level security;

-- 3. Activity / edit log (versions, diffs, AI summaries, events)
create table if not exists public.sourcing_request_activity (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.sourcing_requests(id) on delete cascade,
  version      integer,
  type         text not null check (type in (
                 'created','edit','sent','opened','confirmed','changes_requested',
                 'admin_override','reconfirm_needed','matching_run','deleted','restored')),
  actor_type   text not null check (actor_type in ('admin','buyer','system')),
  actor_name   text,
  diff         jsonb,        -- [{ field, old, new }]
  ai_summary   text,
  comment      text,
  snapshot     jsonb,        -- full brief at this version
  created_at   timestamptz not null default now()
);
create index if not exists sra_request_idx on public.sourcing_request_activity (request_id, created_at desc);
alter table public.sourcing_request_activity enable row level security;

-- 4. API usage metering (Gemini, Voyage, Resend, Firecrawl, ...)
create table if not exists public.api_usage_log (
  id             bigserial primary key,
  created_at     timestamptz not null default now(),
  provider       text not null,           -- 'gemini' | 'voyage' | 'resend' | 'firecrawl' | 'anthropic' | 'perplexity'
  model          text,
  feature        text,                    -- 'deal_desk.vision' | 'deal_desk.brief_merge' | 'edit_log.summary' ...
  key_alias      text,                    -- e.g. 'GEMINI_API_KEY_2' (never the key itself)
  request_id     uuid,
  input_tokens   integer,
  output_tokens  integer,
  units          numeric,                 -- emails, credits, pages ...
  est_cost_usd   numeric(12,6),
  latency_ms     integer,
  ok             boolean not null default true,
  error          text
);
create index if not exists api_usage_log_provider_time_idx on public.api_usage_log (provider, created_at desc);
create index if not exists api_usage_log_feature_idx       on public.api_usage_log (feature, created_at desc);
alter table public.api_usage_log enable row level security;
