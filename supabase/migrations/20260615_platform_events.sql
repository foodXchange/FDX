-- Platform-wide event log for analytics (buyer/supplier/admin journeys).
-- Written only via supabaseAdmin (service role) — no client-facing policies.
CREATE TABLE platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_type text NOT NULL CHECK (user_type IN ('buyer','supplier','admin')),
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  event_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX platform_events_user_id_idx ON platform_events(user_id);
CREATE INDEX platform_events_event_type_idx ON platform_events(event_type);
CREATE INDEX platform_events_created_at_idx ON platform_events(created_at DESC);
CREATE INDEX platform_events_entity_idx ON platform_events(entity_type, entity_id);

ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY;
