-- Run in Supabase SQL editor AFTER migrate-category-ids.sql.
-- Creates match_v2: identical interface to match_v1 but uses category_id for
-- exact/sibling matching when available, falling back to ILIKE text search.
-- match_v1 is NOT replaced — both functions coexist.
--
-- Scoring (max 100 pts):
--   Category fit   40 pts  (exact id=40, sibling id=35, name=30, text=20, neutral=20, weak=10)
--   Format fit     20 pts
--   Compliance fit 20 pts
--   Evidence       20 pts

create or replace function public.match_v2(
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

with pip as (
  select
    coalesce(
      (sr.intent_json -> 'product' ->> 'name'),
      sr.product_name
    )                                                                as product_name,
    coalesce(
      (sr.intent_json -> 'category' ->> 'raw_text'),
      sr.category
    )                                                                as category_text,
    -- category_id from the PIP (populated by resolveCategoryId on new requests)
    nullif(sr.intent_json -> 'category' ->> 'category_id', '')::uuid as category_id,
    (sr.intent_json -> 'commercial' ->> 'private_label')::boolean   as private_label_required,
    coalesce(
      array(select jsonb_array_elements_text(sr.intent_json -> 'specifications' -> 'formats')),
      array[]::text[]
    )                                                                as req_formats,
    coalesce(
      (sr.intent_json -> 'compliance' ->> 'kosher_required')::boolean,
      false
    )                                                                as kosher_required,
    (sr.intent_json -> 'compliance' -> 'kosher_types' ->> 0)        as kosher_type,
    coalesce(
      array(select jsonb_array_elements_text(sr.intent_json -> 'compliance' -> 'certifications')),
      array[]::text[]
    )                                                                as req_certs
  from public.sourcing_requests sr
  where sr.id = request_uuid
),

-- Parent category of the request (for sibling matching)
pip_parent as (
  select pc.parent_id
  from public.product_categories pc
  cross join pip
  where pc.id = pip.category_id
  limit 1
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
  where so.status = 'approved'
    and coalesce(sp.needs_review, false) = false
    -- Hybrid category pre-filter (keeps recall high while preferring exact matches)
    and (
      -- Exact category_id match
      (pip.category_id is not null and sp.category_id = pip.category_id)
      or
      -- Sibling category match (same parent)
      (pip.category_id is not null and sp.category_id in (
        select pc2.id
        from public.product_categories pc2
        join pip_parent pp on pc2.parent_id = pp.parent_id
        where pc2.id != pip.category_id
      ))
      or
      -- Text fallback when no category_id on the request
      (pip.category_id is null and (
        pip.category_text is null
        or pip.category_text = ''
        or sp.category ilike '%' || pip.category_text || '%'
        or pip.category_text ilike '%' || sp.category || '%'
        or sp.product_name ilike '%' || pip.product_name || '%'
      ))
    )
    -- Hard filter: private label
    and (
      pip.private_label_required is not true
      or coalesce(sp.private_label, false) = true
    )
    -- Hard filter: kosher
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
    -- Hard filter: formats
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

    -- Category fit (40 pts)
    case
      -- Exact category_id match
      when c.sp_category_id is not null
        and c.sp_category_id = pip.category_id                    then 40
      -- Sibling (same parent)
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
      -- Product name text match
      when c.product_name ilike '%' || pip.product_name || '%'   then 30
      -- Category text match
      when pip.category_text is not null
        and pip.category_text != ''
        and (
          c.category ilike '%' || pip.category_text || '%'
          or pip.category_text ilike '%' || c.category || '%'
        )                                                         then 20
      -- No category info at all (neutral)
      when pip.category_id is null
        and (pip.category_text is null or pip.category_text = '') then 20
      else 10
    end as pts_category,

    -- Format fit (20 pts)
    case
      when array_length(pip.req_formats, 1) is null then 10
      when c.formats && pip.req_formats              then 20
      else 0
    end as pts_format,

    -- Compliance fit (20 pts)
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

    -- Evidence quality (20 pts)
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
