create table if not exists supplier_email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null check (channel in ('email', 'whatsapp', 'both')) default 'email',
  subject text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists supplier_outreach_logs (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references sourcing_matches(id) on delete cascade,
  supplier_id uuid not null references supplier_offerings(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  template_id uuid references supplier_email_templates(id) on delete set null,
  message text not null,
  sent_by text,
  sent_at timestamptz not null default now()
);

create index if not exists supplier_outreach_logs_match_id_idx on supplier_outreach_logs(match_id);
create index if not exists supplier_outreach_logs_supplier_id_idx on supplier_outreach_logs(supplier_id);
