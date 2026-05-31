-- Phase 5: evolve match_v3 to hybrid vector + typed hard-constraint matching.
--
-- Changes from the v1 signature (captured in 20260530_pgvector_hybrid_matching.sql):
--
--   1. New optional parameters (all default to null/false — existing callers unchanged):
--        request_embedding   vector(1024)  default null
--        req_kosher_level    text          default null   (null→old text path)
--        req_kosher_passover boolean       default false
--        req_temperature     text          default null   (null→don't care)
--        req_organic         boolean       default false
--        req_halal           boolean       default false
--
--   2. candidates CTE: old kosher text-search filter stays when req_kosher_level IS NULL
--      (backward compat). When req_kosher_level IS NOT NULL the typed column is used.
--      New filters for passover, temperature, organic, halal use the typed columns with
--      proper NULL semantics (NULL typed column ≠ required value → excluded).
--
--   3. pts_category → pts_similarity: when both embeddings are present uses cosine
--      similarity; otherwise falls back to the existing category-match logic verbatim.
--
--   4. breakdown JSONB key renamed 'category' → 'similarity' to reflect new semantics.
--
-- DROP the old 2-param signature first so PostgreSQL can accept the wider signature.
-- New callers pass named params; old callers still work because all new params default.

drop function if exists public.match_v3(uuid, int);

create or replace function public.match_v3(
  request_uuid        uuid,
  request_embedding   vector(1024) default null,
  req_kosher_level    text         default null,
  req_kosher_passover boolean      default false,
  req_temperature     text         default null,
  req_organic         boolean      default false,
  req_halal           boolean      default false,
  limit_n             int          default 30
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

    -- kosher_required still used for backward-compat text-search path
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
    sp.embedding,                                                                   -- ← added for vector scoring
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

      -- ① No category_id: text fallback
      (pip.category_id is null and (
        pip.category_text is null
        or pip.category_text = ''
        or sp.category ilike '%' || pip.category_text || '%'
        or pip.category_text ilike '%' || sp.category || '%'
        or sp.product_name ilike '%' || pip.product_name || '%'
      ))

      or

      -- ② category_id set and has matching suppliers: exact + sibling
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

      -- ③ category_id set but zero matches: widen to intent_json category
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
    -- Hard filter: private label (unchanged)
    and (
      pip.private_label_required is not true
      or coalesce(sp.private_label, false) = true
    )
    -- Hard filter: kosher
    --   When req_kosher_level IS NULL → use old text-search path (backward compat).
    --   When req_kosher_level IS NOT NULL → use typed kosher_level column.
    --   NULL sp.kosher_level is treated as 'none' (unspecified ≠ kosher).
    and (
      (req_kosher_level is null and (
        pip.kosher_required = false
        or exists (
          select 1
          from unnest(
            coalesce(sp.certifications, array[]::text[]) || coalesce(sp.kosher_types, array[]::text[])
          ) c
          where lower(c) like '%kosher%'
        )
      ))
      or
      (req_kosher_level is not null and (
           (req_kosher_level = 'any'     and sp.kosher_level not in ('none') and sp.kosher_level is not null)
        or (req_kosher_level = 'regular' and sp.kosher_level is not null     and sp.kosher_level != 'none')
        or (req_kosher_level in ('badatz', 'mehadrin') and sp.kosher_level = req_kosher_level)
      ))
    )
    -- Hard filter: kosher for Passover (NULL sp.kosher_passover = not passover)
    and (req_kosher_passover = false or coalesce(sp.kosher_passover, false) = true)
    -- Hard filter: temperature regime (NULL sp.temperature ≠ required → excluded)
    and (req_temperature is null or sp.temperature = req_temperature)
    -- Hard filter: organic (NULL = unspecified = not organic)
    and (req_organic = false or coalesce(sp.is_organic, false) = true)
    -- Hard filter: halal (NULL = unspecified = not halal)
    and (req_halal = false or coalesce(sp.is_halal, false) = true)
    -- Hard filter: formats (unchanged)
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

    -- pts_similarity: vector cosine when both embeddings present; category heuristic otherwise.
    -- Cosine distance (<=>) is 0 for identical vectors, up to 2 for opposite.
    -- greatest() clamps to 0 for unrelated content so the score stays non-negative.
    case
      when request_embedding is not null and c.embedding is not null
        then greatest(0.0, (1.0 - (c.embedding <=> request_embedding)) * 40.0)::numeric
      else
        -- Backward-compat: existing pts_category heuristic verbatim
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
        end
    end                                                               as pts_similarity,

    -- pts_format (unchanged, 20 pts max)
    case
      when array_length(pip.req_formats, 1) is null then 10
      when c.formats && pip.req_formats              then 20
      else 0
    end                                                               as pts_format,

    -- pts_compliance (unchanged, 20 pts max)
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
    )::numeric                                                        as pts_compliance,

    -- pts_evidence (unchanged, 20 pts max)
    (
      case when c.verified                              then 8 else 0 end
      + case when coalesce(c.manually_verified, false) then 6 else 0 end
      + case when c.israeli_market_fit is not null      then 3 else 0 end
      + case when array_length(c.so_certs, 1) > 0       then 3 else 0 end
    )::numeric                                                        as pts_evidence

  from candidates c
  cross join pip
)

select
  s.supplier_id,
  s.product_id,
  s.product_name,
  s.company_name,
  s.country_of_origin                                                  as country,
  (s.pts_similarity + s.pts_format + s.pts_compliance + s.pts_evidence)::numeric as score,
  jsonb_build_object(
    'similarity',  round(s.pts_similarity, 2),
    'format',      s.pts_format,
    'compliance',  s.pts_compliance,
    'evidence',    s.pts_evidence
  )                                                                    as breakdown,
  s.company_name || coalesce(' · ' || s.country_of_origin, '')        as summary
from scored s
order by score desc
limit limit_n;

$$;

-- Verify after applying:
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'match_v3';
-- The output should show 'request_embedding vector' in the parameter list.
