-- Daily snapshots of the QA metrics dashboard, used for "Last updated" display
-- and the weekly email report. Written only via supabaseAdmin (service role).
CREATE TABLE qa_metrics_daily_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL UNIQUE,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE qa_metrics_daily_snapshot ENABLE ROW LEVEL SECURITY;

-- Configurable targets/thresholds for QA metrics alerts and the weekly report.
-- Single-row table (id = 1).
CREATE TABLE qa_metrics_targets (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  target_reply_rate numeric NOT NULL DEFAULT 70,
  target_response_time_hours numeric NOT NULL DEFAULT 24,
  target_time_to_close_days numeric NOT NULL DEFAULT 14,
  reply_rate_drop_alert_pct numeric NOT NULL DEFAULT 15,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE qa_metrics_targets ENABLE ROW LEVEL SECURITY;

INSERT INTO qa_metrics_targets (id) VALUES (1) ON CONFLICT DO NOTHING;
