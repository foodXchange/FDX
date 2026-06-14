-- In-app admin notifications (global — admin auth is a single shared session,
-- not per-user, so there's no admin_id to scope these to)
create table if not exists admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'new_request' | 'match_sent' | 'response' | 'lead' | 'system'
  title text not null,
  message text,
  data jsonb,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create index if not exists admin_notifications_read_idx on admin_notifications(read);
create index if not exists admin_notifications_created_at_idx on admin_notifications(created_at desc);

alter table admin_notifications enable row level security;
-- No policies: anon/authenticated get zero access (deny-by-default).
-- All reads/writes go through supabaseAdmin (service role, bypasses RLS)
-- behind the cookie-checked /api/admin/notifications/* routes — same
-- pattern as admin_audit_log.
