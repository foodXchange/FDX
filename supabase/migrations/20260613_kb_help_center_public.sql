-- Public Help Center: mark selected KB categories/articles as publicly readable
alter table kb_articles add column if not exists is_public boolean not null default false;
alter table kb_categories add column if not exists is_public boolean not null default false;

create index if not exists kb_articles_is_public_idx on kb_articles (is_public) where is_public = true;

-- Note: the public help center (foodxchange app/en/help) filters its own
-- queries by `is_public = true and status = 'published'` using the anon key,
-- the same pattern already used for import_guide_articles. RLS is
-- intentionally left as-is: kb_articles/kb_categories are currently read via
-- the anon key by the internal KB app (foodxchange-kb), which is gated by
-- requireAuth() at the route level rather than by RLS. Enabling RLS here
-- with only an `is_public = true` policy would also restrict those internal
-- reads to the 12 public articles. If RLS is added later, the internal app
-- will need its own policy (e.g. for an authenticated/staff role) first.
