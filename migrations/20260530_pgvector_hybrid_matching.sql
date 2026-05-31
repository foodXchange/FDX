-- Phase 5 prerequisite: capture current match_v3 + add pgvector schema.
-- Part A preserves the existing function in version control before it is evolved
-- in 20260530_match_v3_hybrid.sql.  Part B adds the columns and indexes needed
-- for hybrid vector + typed-constraint matching.

-- ── Part A: snapshot current match_v3 ────────────────────────────────────────
-- Verbatim copy of scripts/setup-match-v3-function.sql as of 2026-05-30.
-- Creates match_v3: identical scoring to match_v2 but the pip CTE reads from
-- the pips table first (pip_version=2, created_from='image'), falling back to
-- sourcing_requests.intent_json for v1-only requests.

create or replace function public.match_v3(
  request_uuid uuid,
  limit_n      int default 30
)
returns table (
  supplier_id  uuid,
  product_id   uuid,
  product_name text,
  company_name text,
  country      text,
  score        numeric,
  breakdown    jsonb,
  summary      text
)
language sql stable as $$

with v2_pip as (
  select p.data_json
  from public.pips p
  where p.sourcing_request_id = request_uuid
    and p.pip_version = 2
    and p.created_from = 'image'
  limit 1
),

pip as (
  select
    coalesce(
      (select v.data_json -> 'product' -> 'name' ->> 'value'        from v2_pip v),
      (sr.intent_json -> 'product' ->> 'name'),
      sr.product_name
    )                                                                as product_name,

    coalesce(
      (select v.data_json -> 'category' -> 'raw_text' ->> 'value'   from v2_pip v),
      (sr.intent_json -> 'category' ->> 'raw_text'),
      sr.category
    )                                                                as category_text,

    coalesce(
      nullif((select v.data_json -> 'category' -> 'category_id' ->> 'value' from v2_pip v), '')::uuid,
      nullif(sr.intent_json -> 'category' ->> 'category_id', '')::uuid
    )                                                                as category_id,

    nullif(sr.intent_json -> 'category' ->> 'category_id', '')::uuid as fallback_category_id,
    coalesce(
      (sr.intent_json -> 'category' ->> 'raw_text'),
      sr.category
    )                                                                as fallback_category_text,

    coalesce(
      (select (v.data_json -> 'commercial' -> 'private_label' ->> 'value')::boolean from v2_pip v),
      (sr.intent_json -> 'commercial' ->> 'private_label')::boolean
    )                                                                as private_label_required,

    coalesce(
      (select array(select jsonb_array_elements_text(
                    jsonb_path_query_array(v.data_json, '$.specifications.formats[*].value')))
               from v2_pip v),
      array(select jsonb_array_elements_text(
                   sr.intent_json -> 'specifications' -> 'formats')),
      array[]::text[]
    )                                                                as req_formats,

    coalesce(
      (select (v.data_json -> 'compliance' -> 'kosher_required' ->> 'value')::boolean from v2_pip v),
      (sr.intent_json -> 'compliance' ->> 'kosher_required')::boolean,
      false
    )                                                                as kosher_required,

    coalesce(
      (select jsonb_path_query_array(v.data_json, '$.compliance.kosher_types[*].value') ->> 0
               from v2_pip v),
      (sr.intent_json -> 'compliance' -> 'kosher_types' ->> 0)
    )                                                                as kosher_type,

    coalesce(
      (select array(select jsonb_array_elements_text(
                    jsonb_path_query_array(v.data_json, '$.compliance.certifications[*].value')))
               from v2_pip v),
      array(select jsonb_array_elements_text(
                   sr.intent_json -> 'compliance' -> 'certifications')),
      array[]::text[]
    )                                                                as req_certs

  from public.sourcing_requests sr
  where sr.id = request_uuid
),

pip_parent as (
  select pc.parent_id
  from public.product_categories pc
  cross join pip
  where pc.id = pip.category_id
  limit 1
),

pip_fallback_parent as (
  select pc.parent_id
  from public.product_categories pc
  cross join pip
  where pc.id = pip.fallback_category_id
  limit 1
),

v2_category_has_candidates as (
  select exists (
    select 1
    from public.supplier_products sp2
    join public.supplier_offerings so2 on so2.id = sp2.supplier_id
    cross join pip p
    where so2.status = 'approved'
      and coalesce(sp2.needs_review, false) = false
      and p.category_id is not null
      and (
        sp2.category_id = p.category_id
        or sp2.category_id in (
          select pc2.id
          from public.product_categories pc2
          join pip_parent pp on pc2.parent_id = pp.parent_id
          where pc2.id != p.category_id
        )
      )
  ) as has_candidates
),

candidates as (
  select
    sp.id                                                                           as product_id,
    sp.product_name,
    sp.category,
    sp.category_id                                                                  as sp_category_id,
    coalesce(sp.formats, array[]::text[])                                           as formats,
    coalesce(sp.certifications, array[]::text[]) || coalesce(sp.kosher_types, array[]::text[]) as all_certs,
    coalesce(sp.kosher_types, array[]::text[])                                      as kosher_types,
    sp.private_label,
    sp.manually_verified,
    so.id                                                                           as supplier_id,
    so.company_name,
    so.country_of_origin,
    coalesce(so.verified::boolean, false)                                           as verified,
    so.israeli_market_fit,
    coalesce(so.certifications, array[]::text[])                                    as so_certs
  from public.supplier_products sp
  join public.supplier_offerings so on so.id = sp.supplier_id
  cross join pip
  cross join v2_category_has_candidates vch
  where so.status = 'approved'
    and coalesce(sp.needs_review, false) = false
    and (
      (pip.category_id is null and (
        pip.category_text is null
        or pip.category_text = ''
        or sp.category ilike '%' || pip.category_text || '%'
        or pip.category_text ilike '%' || sp.category || '%'
        or sp.product_name ilike '%' || pip.product_name || '%'
      ))
      or
      (pip.category_id is not null and vch.has_candidates and (
        sp.category_id = pip.category_id
        or sp.category_id in (
          select pc2.id
          from public.product_categories pc2
          join pip_parent pp on pc2.parent_id = pp.parent_id
          where pc2.id != pip.category_id
        )
      ))
      or
      (pip.category_id is not null and not vch.has_candidates and (
        (pip.fallback_category_id is not null and (
          sp.category_id = pip.fallback_category_id
          or sp.category_id in (
            select pc2.id
            from public.product_categories pc2
            join pip_fallback_parent pfp on pc2.parent_id = pfp.parent_id
            where pc2.id != pip.fallback_category_id
          )
        ))
        or
        (pip.fallback_category_id is null and (
          pip.fallback_category_text is null
          or pip.fallback_category_text = ''
          or sp.category ilike '%' || pip.fallback_category_text || '%'
          or pip.fallback_category_text ilike '%' || sp.category || '%'
          or sp.product_name ilike '%' || pip.product_name || '%'
        ))
      ))
    )
    and (
      pip.private_label_required is not true
      or coalesce(sp.private_label, false) = true
    )
    and (
      pip.kosher_required = false
      or exists (
        select 1
        from unnest(
          coalesce(sp.certifications, array[]::text[]) || coalesce(sp.kosher_types, array[]::text[])
        ) c
        where lower(c) like '%kosher%'
      )
    )
    and (
      array_length(pip.req_formats, 1) is null
      or sp.formats && pip.req_formats
    )
),

scored as (
  select
    c.*,
    pip.category_text,
    pip.product_name   as req_product_name,
    pip.category_id    as req_category_id,
    pip.req_formats,
    pip.req_certs,
    pip.kosher_required,

    case
      when c.sp_category_id is not null
        and c.sp_category_id = pip.category_id                    then 40
      when c.sp_category_id is not null
        and pip.category_id is not null
        and c.sp_category_id != pip.category_id
        and exists (
          select 1
          from public.product_categories pc_a
          join public.product_categories pc_b
            on pc_a.parent_id = pc_b.parent_id
          where pc_a.id = c.sp_category_id
            and pc_b.id = pip.category_id
        )                                                         then 35
      when c.product_name ilike '%' || pip.product_name || '%'   then 30
      when pip.category_text is not null
        and pip.category_text != ''
        and (
          c.category ilike '%' || pip.category_text || '%'
          or pip.category_text ilike '%' || c.category || '%'
        )                                                         then 20
      when pip.category_id is null
        and (pip.category_text is null or pip.category_text = '') then 20
      else 10
    end as pts_category,

    case
      when array_length(pip.req_formats, 1) is null then 10
      when c.formats && pip.req_formats              then 20
      else 0
    end as pts_format,

    (
      case
        when pip.kosher_required = false then 5
        when exists (select 1 from unnest(c.all_certs) x where lower(x) like '%kosher%') then 10
        else 0
      end
      +
      case
        when array_length(pip.req_certs, 1) is null then 5
        when c.all_certs && pip.req_certs           then 10
        else 0
      end
    )::numeric as pts_compliance,

    (
      case when c.verified                              then 8 else 0 end
      + case when coalesce(c.manually_verified, false) then 6 else 0 end
      + case when c.israeli_market_fit is not null      then 3 else 0 end
      + case when array_length(c.so_certs, 1) > 0       then 3 else 0 end
    )::numeric as pts_evidence

  from candidates c
  cross join pip
)

select
  s.supplier_id,
  s.product_id,
  s.product_name,
  s.company_name,
  s.country_of_origin                                          as country,
  (s.pts_category + s.pts_format + s.pts_compliance + s.pts_evidence)::numeric as score,
  jsonb_build_object(
    'category',   s.pts_category,
    'format',     s.pts_format,
    'compliance', s.pts_compliance,
    'evidence',   s.pts_evidence
  )                                                            as breakdown,
  s.company_name || coalesce(' · ' || s.country_of_origin, '') as summary
from scored s
order by score desc
limit limit_n;

$$;

-- ── Part B: pgvector extension + typed hard-constraint columns + indexes ──────
-- Enable pgvector (no-op if already installed by Supabase).
create extension if not exists vector;

-- Add hybrid matching columns to supplier_products.
-- All nullable — existing rows start with NULLs; backfill-embeddings.ts populates them.
alter table public.supplier_products
  add column if not exists embedding       vector(1024),
  add column if not exists kosher_level    text,       -- none | regular | badatz | mehadrin
  add column if not exists kosher_passover boolean,
  add column if not exists is_halal        boolean,
  add column if not exists is_organic      boolean,
  add column if not exists is_gluten_free  boolean,
  add column if not exists is_sugar_free   boolean,
  add column if not exists temperature     text,       -- frozen | chilled | ambient
  add column if not exists channel         text[];     -- retail | horeca | catering

-- ivfflat cosine index (lists=100 is conservative/safe for ~1000 rows, allows growth).
-- Cannot be created until at least one row has a non-NULL embedding; run this after backfill,
-- or let Postgres create it on an empty column and let it be populated gradually.
create index if not exists supplier_products_embedding_idx
  on public.supplier_products
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Btree indexes on the most-filtered hard-constraint columns.
create index if not exists supplier_products_kosher_level_idx
  on public.supplier_products (kosher_level);
create index if not exists supplier_products_temperature_idx
  on public.supplier_products (temperature);
create index if not exists supplier_products_is_organic_idx
  on public.supplier_products (is_organic);

-- Verify: after applying this migration, run:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'supplier_products' AND column_name = 'embedding';
-- Expected: 1 row returned.
