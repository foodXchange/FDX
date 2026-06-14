-- Email-first "request docs/info from supplier" flow via magic link (no supplier login required)
CREATE TABLE IF NOT EXISTS supplier_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES supplier_offerings(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  request_message text,
  requested_docs text[],
  response_text text,
  uploaded_files jsonb,
  status text DEFAULT 'pending',
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_by text,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

CREATE INDEX IF NOT EXISTS supplier_actions_token_idx ON supplier_actions(token);
CREATE INDEX IF NOT EXISTS supplier_actions_supplier_id_idx ON supplier_actions(supplier_id);
