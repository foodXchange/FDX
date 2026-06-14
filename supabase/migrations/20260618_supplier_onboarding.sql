-- Approval/rejection tracking + onboarding-checklist completion for
-- self-signup suppliers. Additive only.
alter table supplier_offerings
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists onboarding_completed_at timestamptz;
