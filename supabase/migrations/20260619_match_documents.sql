-- Per-match document sharing between buyer and supplier.
-- Mirrors match_messages (20260614_match_replies_messages.sql): same RLS
-- shape, same realtime publication. Files live in the public
-- "match-documents" storage bucket (created on first upload), URLs via
-- getPublicUrl — consistent with every other bucket in this app.
create table if not exists match_documents (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references sourcing_matches(id) on delete cascade,
  uploader_id uuid not null references auth.users(id),
  uploader_type text not null check (uploader_type in ('buyer', 'supplier', 'admin')),
  file_name text not null,
  file_path text not null,
  file_size bigint not null,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists match_documents_match_id_idx on match_documents(match_id, created_at);

alter table match_documents enable row level security;

create policy match_documents_party_select on match_documents for select
  using (
    exists (
      select 1 from sourcing_matches sm
      join sourcing_requests sr on sr.id = sm.request_id
      left join supplier_profiles sp on sp.supplier_id = sm.supplier_id
      where sm.id = match_documents.match_id
        and (sr.auth_user_id = auth.uid() or sp.id = auth.uid())
    )
  );

create policy match_documents_party_insert on match_documents for insert
  with check (
    uploader_id = auth.uid()
    and exists (
      select 1 from sourcing_matches sm
      join sourcing_requests sr on sr.id = sm.request_id
      left join supplier_profiles sp on sp.supplier_id = sm.supplier_id
      where sm.id = match_documents.match_id
        and (sr.auth_user_id = auth.uid() or sp.id = auth.uid())
    )
  );

create policy match_documents_uploader_delete on match_documents for delete
  using (uploader_id = auth.uid());

alter publication supabase_realtime add table match_documents;
