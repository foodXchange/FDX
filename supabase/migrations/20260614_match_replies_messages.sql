-- Supplier reply to a match: Accept / Counter-offer / Decline.
-- Additive only — does not touch the existing sourcing_matches.status
-- workflow (suggested/approved/sent/responded/closed) used by the admin
-- MatchCards UI and /api/matching/[id].
alter table sourcing_matches
  add column if not exists supplier_response text
    check (supplier_response in ('accepted', 'countered', 'declined')),
  add column if not exists supplier_message text,
  add column if not exists supplier_responded_at timestamptz;

-- Per-match messaging thread between buyer and supplier (admin can also post).
create table if not exists match_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references sourcing_matches(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  sender_type text not null check (sender_type in ('buyer', 'supplier', 'admin')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists match_messages_match_id_idx on match_messages(match_id, created_at);

alter table match_messages enable row level security;

-- A user may read messages on a match if they are the supplier (via
-- supplier_profiles) or the buyer (via sourcing_requests.auth_user_id).
-- Admin access goes through supabaseAdmin (service role, bypasses RLS).
create policy match_messages_party_select on match_messages for select
  using (
    exists (
      select 1 from sourcing_matches sm
      join sourcing_requests sr on sr.id = sm.request_id
      left join supplier_profiles sp on sp.supplier_id = sm.supplier_id
      where sm.id = match_messages.match_id
        and (sr.auth_user_id = auth.uid() or sp.id = auth.uid())
    )
  );

create policy match_messages_party_insert on match_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from sourcing_matches sm
      join sourcing_requests sr on sr.id = sm.request_id
      left join supplier_profiles sp on sp.supplier_id = sm.supplier_id
      where sm.id = match_messages.match_id
        and (sr.auth_user_id = auth.uid() or sp.id = auth.uid())
    )
  );

-- First use of Supabase Realtime in this app — powers the live message thread.
alter publication supabase_realtime add table match_messages;
