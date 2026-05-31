-- Layer 1: Contact extraction — dated snapshots from contact/about/team pages.
-- Append-only table: never overwrites, preserves historical contact info per scrape.
-- Each row is timestamped and scoped to the scrape event that discovered it.

create table public.supplier_contacts (
  id            uuid primary key default gen_random_uuid(),
  supplier_id   uuid not null references public.supplier_offerings(id),
  name          text,
  role          text,          -- e.g. 'Export Manager', 'Sales Director'
  email         text,
  phone         text,
  linkedin_url  text,
  contact_type  text,          -- export_manager | sales | technical | commercial | general
  source_url    text,          -- which page the contact came from
  scraped_at    timestamptz not null default now(),
  scrape_batch  text,          -- ties row to a named scrape run (e.g. --batch=aug2026)
  raw_context   text           -- 1-2 sentence snippet for verification
);

create index supplier_contacts_supplier_idx on public.supplier_contacts(supplier_id);
create index supplier_contacts_scraped_at_idx on public.supplier_contacts(scraped_at);
create index supplier_contacts_email_idx on public.supplier_contacts(email) where email is not null;
