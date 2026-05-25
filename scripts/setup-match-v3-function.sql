-- Run in Supabase SQL editor AFTER setup-match-v2-function.sql.
-- Creates match_v3: identical scoring to match_v2 but the pip CTE reads from
-- the pips table first (pip_version=2, created_from='image'), falling back to
-- sourcing_requests.intent_json for v1-only requests.
-- match_v2 is NOT replaced — both functions coexist until match_v3 is validated.
--
-- Candidate-pool fallback:
--   When the v2 PIP has a category_id that matches zero supplier products
--   (image extracted a narrower / unsupported category), the candidate pool
--   falls back to the intent_json category_id / text search so scoring can
--   still proceed. All scoring fields (formats, kosher, certs …) continue to
--   use v2 PIP values; only the pool-generation filter widens.
--
-- Array fields in v2 PIP are MergedAttr objects; .value is extracted via
-- jsonb_path_query_array so strings reach the scoring logic, not JSON objects.

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
  -- Fetch the v2 image PIP for this request, if one exists.
  -- LIMIT 1: for multi-PIP requests the first row is used; matching at PIP
  -- granularity is a future enhancement.
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

    -- Effective category_id: v2 PIP first, then intent_json
    coalesce(
      nullif((select v.data_json -> 'category' -> 'category_id' ->> 'value' from v2_pip v), '')::uuid,
      nullif(sr.intent_json -> 'category' ->> 'category_id', '')::uuid
    )                                                                as category_id,

    -- Fallback category from intent_json only — used in candidate pool
    -- when the v2 PIP category_id has no matching supplier products.
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

-- Parent category of pip.category_id (for sibling matching in primary pool)
pip_parent as (
  select pc.parent_id
  from public.product_categories pc
  cross join pip
  where pc.id = pip.category_id
  limit 1
),

-- Parent category of pip.fallback_category_id (for sibling matching in fallback pool)
pip_fallback_parent as (
  select pc.parent_id
  from public.product_categories pc
  cross join pip
  where pc.id = pip.fallback_category_id
  limit 1
),

-- True when pip.category_id (if set) matches at least one approved supplier product.
-- When false (v2 PIP image-extracted category is too narrow / unsupported),
-- the candidate pool widens to the intent_json category so scoring can proceed.
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

      -- ① No category_id: text fallback (mirrors match_v2 text path)
      (pip.category_id is null and (
        pip.category_text is null
        or pip.category_text = ''
        or sp.category ilike '%' || pip.category_text || '%'
        or pip.category_text ilike '%' || sp.category || '%'
        or sp.product_name ilike '%' || pip.product_name || '%'
      ))

      or

      -- ② category_id set and has matching suppliers: exact + sibling (mirrors match_v2 id path)
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

      -- ③ category_id set but zero matches: widen pool using intent_json category
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
