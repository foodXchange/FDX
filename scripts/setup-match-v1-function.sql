-- Run this in the Supabase SQL editor to create the match_v1 scoring function.
-- Requires: setup-matching-indexes.sql run first.
-- Safe to re-run (CREATE OR REPLACE).
--
-- Scoring breakdown (max 100 pts):
--   Category fit   40 pts
--   Format fit     20 pts
--   Compliance fit 20 pts
--   Evidence       20 pts

create or replace function public.match_v1(
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
    )                                                               as product_name,
    coalesce(
      (sr.intent_json -> 'category' ->> 'raw_text'),
      sr.category
    )                                                               as category_text,
    (sr.intent_json -> 'commercial' ->> 'private_label')::boolean  as private_label_required,
    coalesce(
      array(select jsonb_array_elements_text(sr.intent_json -> 'specifications' -> 'formats')),
      array[]::text[]
    )                                                               as req_formats,
    coalesce(
      (sr.intent_json -> 'compliance' ->> 'kosher_required')::boolean,
      false
    )                                                               as kosher_required,
    (sr.intent_json -> 'compliance' -> 'kosher_types' ->> 0)       as kosher_type,
    coalesce(
      array(select jsonb_array_elements_text(sr.intent_json -> 'compliance' -> 'certifications')),
      array[]::text[]
    )                                                               as req_certs
  from public.sourcing_requests sr
  where sr.id = request_uuid
),

candidates as (
  select
    sp.id                                                                          as product_id,
    sp.product_name,
    sp.category,
    coalesce(sp.formats, array[]::text[])                                          as formats,
    coalesce(sp.certifications, array[]::text[]) || coalesce(sp.kosher_types, array[]::text[]) as all_certs,
    coalesce(sp.kosher_types, array[]::text[])                                     as kosher_types,
    sp.private_label,
    sp.manually_verified,
    so.id                                                                          as supplier_id,
    so.company_name,
    so.country_of_origin,
    coalesce(so.verified::boolean, false)                                          as verified,
    so.israeli_market_fit,
    coalesce(so.certifications, array[]::text[])                                   as so_certs
  from public.supplier_products sp
  join public.supplier_offerings so on so.id = sp.supplier_id
  cross join pip
  where so.status = 'approved'
    and coalesce(sp.needs_review, false) = false
    -- Broad pre-filter: category or product name match (keeps recall high)
    and (
      pip.category_text is null
      or pip.category_text = ''
      or sp.category ilike '%' || pip.category_text || '%'
      or pip.category_text ilike '%' || sp.category || '%'
      or sp.product_name ilike '%' || pip.product_name || '%'
    )
    -- Hard filter: private label
    and (
      pip.private_label_required is not true
      or coalesce(sp.private_label, false) = true
    )
    -- Hard filter: kosher (only exclude if kosher is required)
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
    -- Hard filter: formats (only exclude if the request has explicit formats)
    and (
      array_length(pip.req_formats, 1) is null
      or sp.formats && pip.req_formats
    )
),

scored as (
  select
    c.product_id,
    c.product_name,
    c.category,
    c.formats,
    c.all_certs,
    c.kosher_types,
    c.private_label,
    c.manually_verified,
    c.supplier_id,
    c.company_name,
    c.country_of_origin,
    c.verified,
    c.israeli_market_fit,
    c.so_certs,
    pip.category_text,
    pip.product_name  as req_product_name,
    pip.req_formats,
    pip.req_certs,
    pip.kosher_required,

    -- Category fit (40 pts)
    case
      when pip.category_text is null or pip.category_text = '' then 20
      when lower(c.category) = lower(pip.category_text)        then 40
      when c.category ilike '%' || pip.category_text || '%'
        or pip.category_text ilike '%' || c.category || '%'    then 40
      when c.product_name ilike '%' || pip.product_name || '%' then 30
      else 10
    end as pts_category,

    -- Format fit (20 pts)
    case
      when array_length(pip.req_formats, 1) is null then 10
      when c.formats && pip.req_formats                then 20
      else 0
    end as pts_format,

    -- Compliance fit (20 pts): kosher 0/5/10 + certs 0/5/10
    (
      case
        when pip.kosher_required = false then 5
        when exists (
          select 1 from unnest(c.all_certs) x where lower(x) like '%kosher%'
        )                               then 10
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
      + case when array_length(c.so_certs, 1) > 0      then 3 else 0 end
    )::numeric as pts_evidence

  from candidates c
  cross join pip
)

select
  s.supplier_id,
  s.product_id,
  s.product_name,
  s.company_name,
  s.country_of_origin                                        as country,
  (s.pts_category + s.pts_format + s.pts_compliance + s.pts_evidence)::numeric as score,
  jsonb_build_object(
    'category',   s.pts_category,
    'format',     s.pts_format,
    'compliance', s.pts_compliance,
    'evidence',   s.pts_evidence
  )                                                          as breakdown,
  s.company_name || coalesce(' · ' || s.country_of_origin, '') as summary
from scored s
order by score desc
limit limit_n;

$$;
