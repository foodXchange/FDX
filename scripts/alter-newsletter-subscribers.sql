-- Run this in Supabase SQL editor to add unsubscribe support.
-- Safe to run multiple times (all statements are idempotent).

alter table public.newsletter_subscribers
  add column if not exists unsubscribed_at timestamptz;

alter table public.newsletter_subscribers
  add column if not exists active boolean
    generated always as (unsubscribed_at is null) stored;

create index if not exists newsletter_subscribers_active_idx
  on public.newsletter_subscribers (email)
  where unsubscribed_at is null;
