-- Admin management of supplier_actions: resend tracking + revocation
ALTER TABLE supplier_actions
ADD COLUMN IF NOT EXISTS resend_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_resent_at timestamptz,
ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
