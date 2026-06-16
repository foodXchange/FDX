-- Track when 3-day and 7-day auto-reminder emails were sent for pending supplier actions.
ALTER TABLE supplier_actions
  ADD COLUMN IF NOT EXISTS last_reminder_3d_sent timestamptz,
  ADD COLUMN IF NOT EXISTS last_reminder_7d_sent timestamptz;
