-- Audit log for admin impersonation + act-on-behalf actions
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target_type text not null,
  target_id uuid,
  target_email text,
  created_at timestamptz not null default now(),
  metadata jsonb
);

create index if not exists admin_audit_log_created_at_idx on admin_audit_log(created_at desc);
create index if not exists admin_audit_log_action_idx on admin_audit_log(action);

-- Tag rows that were last touched while an admin was impersonating the user
alter table buyer_profiles add column if not exists impersonated_by text;
alter table supplier_profiles add column if not exists impersonated_by text;
alter table supplier_products add column if not exists impersonated_by text;
alter table sourcing_matches add column if not exists impersonated_by text;
