-- Buyer-facing match actions: "interested" tracking + "request more info"
ALTER TABLE sourcing_matches
ADD COLUMN IF NOT EXISTS buyer_interest boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS buyer_interest_at timestamptz;

CREATE TABLE IF NOT EXISTS buyer_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES buyers(id) ON DELETE CASCADE,
  match_id uuid REFERENCES sourcing_matches(id) ON DELETE CASCADE,
  request_id uuid REFERENCES sourcing_requests(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  requested_info text[],
  message text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS buyer_actions_match_id_idx ON buyer_actions(match_id);
CREATE INDEX IF NOT EXISTS buyer_actions_buyer_id_idx ON buyer_actions(buyer_id);
