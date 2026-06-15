-- Buyer "I'm interested" commitment terms — record when the buyer accepted
-- the sourcing-commission terms shown in the confirmation modal.
alter table sourcing_matches
  add column if not exists terms_accepted_at timestamptz;

-- Admin replies (app/api/admin/match-reply) post into match_messages but the
-- admin session is not a Supabase auth.users row, so sender_id must be
-- nullable for sender_type = 'admin' rows.
alter table match_messages alter column sender_id drop not null;

-- Some sourcing_requests are addressed to a buyer by email only (no
-- auth_user_id link yet). Let those buyers read their match thread too —
-- additive to the existing match_messages_party_select policy.
create policy match_messages_buyer_email_select on match_messages for select
  using (
    match_id in (
      select sm.id from sourcing_matches sm
      join sourcing_requests sr on sr.id = sm.request_id
      where sr.email = auth.jwt()->>'email'
    )
  );
