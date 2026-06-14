-- Platform-wide event log for analytics (buyer/supplier/admin journeys).
-- Written only via supabaseAdmin (service role) — no client-facing policies.
CREATE TABLE IF NOT EXISTS platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_type text,
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_events_user_id_idx ON platform_events(user_id);
CREATE INDEX IF NOT EXISTS platform_events_event_type_idx ON platform_events(event_type);
CREATE INDEX IF NOT EXISTS platform_events_created_at_idx ON platform_events(created_at);

ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY;
