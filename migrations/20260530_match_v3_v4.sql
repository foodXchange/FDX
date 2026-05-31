-- match_v3 v4 — aggressive pool gate, kosher hierarchy, pip_c constraint CTE,
-- 5-term scoring (pts_category + pts_vector + pts_format + pts_compliance + pts_evidence).
--
-- Changes from v3 (20260530_match_v3_hybrid.sql):
--
--   1. Signature simplified to 3 params. All constraint derivation moves inside SQL.
--        OLD: match_v3(request_uuid, request_embedding, req_kosher_level, req_kosher_passover,
--                      req_temperature, req_organic, req_halal, limit_n)
--        NEW: match_v3(request_uuid, limit_n DEFAULT 30, request_emb DEFAULT NULL)
--
--   2. Category gate REMOVED from candidates WHERE. Pool = all approved products that
--      pass hard compliance filters. Category becomes a scoring-only signal (pts_category).
--      CTEs pip_parent, pip_fallback_parent, v2_category_has_candidates deleted.
--
--   3. Kosher: strict equality -> hierarchy rank.
--        badatz=3 >= mehadrin=2 >= regular=1 >= none/null=0
--        mehadrin-required buyer GETS badatz suppliers. badatz-required buyer gets ONLY badatz.
--
--   4. New pip_c CTE derives all constraint params from pip fields + must_have_tokens[].
--        req_kosher_level:    from compliance.kosher_required + kosher_type text
--        req_kosher_passover: from kosher_type ILIKE '%passover%'
--        req_temperature:     from must_have_tokens[] 'temperature_regime:X'
--        req_channel:         from must_have_tokens[] 'channel:X'
--        req_organic:         from 'organic' = ANY(must_have_tokens)
--        req_halal:           from 'halal' = ANY(must_have_tokens)
--
--   5. Scoring split:
--        pts_category 35  (was merged with vector into pts_similarity 40)
--        pts_vector   30  (neutral=15 when either embedding absent; raised to amplify semantic signal)
--        pts_format   15  (was 20)
--        pts_compliance 20 (unchanged)
--        pts_evidence 10  (was 20; weights adjusted)
--        Total: 110 (weights exceed 100; score is relative for ranking, not a percentage)
--
-- Apply AFTER migrations/20260530_pgvector_hybrid_matching.sql (requires vector extension
-- + embedding/kosher_level/temperature/channel columns on supplier_products).
--
-- DROP both possible old signatures so PostgreSQL accepts the new one.

drop function if exists public.match_v3(uuid, int);
drop function if exists public.match_v3(uuid, vector(1024), text, boolean, text, boolean, boolean, int);

create or replace function public.match_v3(
  request_uuid uuid,
  limit_n      int           default 30,
  request_emb  vector(1024)  default null
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
    )                                                                as req_certs,

    -- must_have tokens (v2: MergedAttr array → .value; v1: plain string array)
    coalesce(
      nullif(
        array(select jsonb_array_elements_text(
          jsonb_path_query_array(
            (select v.data_json from v2_pip v),
            '$.match_config.must_have[*].value'
          )
        )),
        array[]::text[]
      ),
      array(select jsonb_array_elements_text(
        sr.intent_json -> 'match_config' -> 'must_have'
      )),
      array[]::text[]
    )                                                                as must_have_tokens

  from public.sourcing_requests sr
  where sr.id = request_uuid
),

-- Derives all constraint params from pip fields + must_have_tokens.
-- All downstream CTEs cross join pip_c instead of pip.
pip_c as (
  select
    pip.*,

    -- kosher level from compliance fields (null = no kosher requirement)
    case
      when pip.kosher_required = false then null
      when pip.kosher_type ilike '%badatz%'
        or pip.kosher_type ilike '%bet din%'
        or pip.kosher_type ilike '%beit din%'  then 'badatz'
      when pip.kosher_type ilike '%mehadrin%'   then 'mehadrin'
      when pip.kosher_type is not null
        and trim(pip.kosher_type) != ''         then 'regular'
      else 'any'
    end                                                              as req_kosher_level,

    case
      when pip.kosher_type ilike '%passover%'
        or pip.kosher_type ilike '%pesach%'     then true
      else false
    end                                                              as req_kosher_passover,

    -- temperature from 'temperature_regime:X' token
    (select split_part(tok, ':', 2)
     from unnest(pip.must_have_tokens) as tok
     where tok like 'temperature_regime:%'
     limit 1)                                                        as req_temperature,

    -- channel from 'channel:X' token
    (select split_part(tok, ':', 2)
     from unnest(pip.must_have_tokens) as tok
     where tok like 'channel:%'
     limit 1)                                                        as req_channel,

    ('organic' = any(pip.must_have_tokens))                         as req_organic,
    ('halal'   = any(pip.must_have_tokens))                         as req_halal

  from pip
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
    sp.embedding,
    so.id                                                                           as supplier_id,
    so.company_name,
    so.country_of_origin,
    coalesce(so.verified::boolean, false)                                           as verified,
    so.israeli_market_fit,
    coalesce(so.certifications, array[]::text[])                                    as so_certs
  from public.supplier_products sp
  join public.supplier_offerings so on so.id = sp.supplier_id
  cross join pip_c
  where so.status = 'approved'
    and coalesce(sp.needs_review, false) = false

    -- Hard filter: private label (unchanged)
    and (
      pip_c.private_label_required is not true
      or coalesce(sp.private_label, false) = true
    )

    -- Hard filter: formats (unchanged)
    and (
      array_length(pip_c.req_formats, 1) is null
      or sp.formats && pip_c.req_formats
    )

    -- Hard filter: kosher — hierarchy rank (stricter supplier satisfies less-strict buyer)
    --   rank: badatz=3, mehadrin=2, regular=1, other-non-none=1, none/null=0
    --   NULL req_kosher_level = no kosher requirement → pass all
    and (
      pip_c.req_kosher_level is null
      or (
        case
          when sp.kosher_level = 'badatz'                                       then 3
          when sp.kosher_level = 'mehadrin'                                     then 2
          when sp.kosher_level = 'regular'                                      then 1
          when sp.kosher_level is not null and sp.kosher_level != 'none'        then 1
          else 0  -- 'none' or null
        end
        >=
        case
          when pip_c.req_kosher_level = 'badatz'                               then 3
          when pip_c.req_kosher_level = 'mehadrin'                             then 2
          when pip_c.req_kosher_level in ('regular', 'any')                    then 1
          else 0
        end
      )
    )

    -- Hard filter: kosher for Passover (NULL sp.kosher_passover = not passover)
    and (pip_c.req_kosher_passover = false or coalesce(sp.kosher_passover, false) = true)

    -- Hard filter: temperature (NULL sp.temperature excluded when req_temperature set)
    and (pip_c.req_temperature is null or sp.temperature = pip_c.req_temperature)

    -- Hard filter: channel (sp.channel must contain the requested channel)
    and (
      pip_c.req_channel is null
      or (sp.channel is not null and pip_c.req_channel = any(sp.channel))
    )

    -- Hard filter: organic (NULL = unspecified = not organic)
    and (pip_c.req_organic = false or coalesce(sp.is_organic, false) = true)

    -- Hard filter: halal (NULL = unspecified = not halal)
    and (pip_c.req_halal = false or coalesce(sp.is_halal, false) = true)
),

scored as (
  select
    c.*,
    pip_c.category_text,
    pip_c.product_name   as req_product_name,
    pip_c.category_id    as req_category_id,
    pip_c.req_formats,
    pip_c.req_certs,
    pip_c.kosher_required,

    -- pts_category (35 max): always runs as a ranking signal even when vectors present
    case
      when c.sp_category_id is not null
        and c.sp_category_id = pip_c.category_id                    then 35
      when c.sp_category_id is not null
        and pip_c.category_id is not null
        and c.sp_category_id != pip_c.category_id
        and exists (
          select 1
          from public.product_categories pc_a
          join public.product_categories pc_b
            on pc_a.parent_id = pc_b.parent_id
          where pc_a.id = c.sp_category_id
            and pc_b.id = pip_c.category_id
        )                                                           then 30
      when c.product_name ilike '%' || pip_c.product_name || '%'   then 25
      when pip_c.category_text is not null
        and pip_c.category_text != ''
        and (
          c.category ilike '%' || pip_c.category_text || '%'
          or pip_c.category_text ilike '%' || c.category || '%'
        )                                                           then 18
      when pip_c.category_id is null
        and (pip_c.category_text is null or pip_c.category_text = '') then 18
      else 8
    end                                                             as pts_category,

    -- pts_vector (30 max, neutral=15 when either embedding absent — no penalty for missing data)
    case
      when request_emb is not null and c.embedding is not null
        then greatest(0.0, (1.0 - (c.embedding <=> request_emb)) * 30.0)::numeric
      else 15.0
    end                                                             as pts_vector,

    -- pts_format (15 max)
    case
      when array_length(pip_c.req_formats, 1) is null then 8
      when c.formats && pip_c.req_formats              then 15
      else 0
    end                                                             as pts_format,

    -- pts_compliance (20 max — logic unchanged)
    (
      case
        when pip_c.kosher_required = false then 5
        when exists (select 1 from unnest(c.all_certs) x where lower(x) like '%kosher%') then 10
        else 0
      end
      +
      case
        when array_length(pip_c.req_certs, 1) is null then 5
        when c.all_certs && pip_c.req_certs           then 10
        else 0
      end
    )::numeric                                                      as pts_compliance,

    -- pts_evidence (10 max — weights adjusted)
    (
      case when c.verified                              then 4 else 0 end
      + case when coalesce(c.manually_verified, false) then 3 else 0 end
      + case when c.israeli_market_fit is not null      then 2 else 0 end
      + case when array_length(c.so_certs, 1) > 0       then 1 else 0 end
    )::numeric                                                      as pts_evidence

  from candidates c
  cross join pip_c
)

select
  s.supplier_id,
  s.product_id,
  s.product_name,
  s.company_name,
  s.country_of_origin                                                               as country,
  (s.pts_category + s.pts_vector + s.pts_format + s.pts_compliance + s.pts_evidence)::numeric as score,
  jsonb_build_object(
    'category',    s.pts_category,
    'vector',      round(s.pts_vector, 2),
    'format',      s.pts_format,
    'compliance',  s.pts_compliance,
    'evidence',    s.pts_evidence
  )                                                                                 as breakdown,
  s.company_name || coalesce(' · ' || s.country_of_origin, '')                     as summary
from scored s
order by score desc
limit limit_n;

$$;

-- Verify after applying:
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'match_v3';
-- Output should show 'request_emb vector' — no req_kosher_level param.
