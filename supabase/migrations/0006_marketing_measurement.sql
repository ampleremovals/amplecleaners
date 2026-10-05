-- 0006 — Privacy-friendly marketing measurement. Idempotent.
-- No IP addresses and no persistent identifiers are stored: `visitor_hash` is a
-- hash that ROTATES DAILY, so a person can't be followed across days.
CREATE TABLE IF NOT EXISTS site_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  visitor_hash TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('page_view','booking_start','booking_submit','cta_click')),
  path TEXT NOT NULL,
  variant TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer_host TEXT,
  device TEXT
);
CREATE INDEX IF NOT EXISTS idx_site_events_created ON site_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_events_event ON site_events (event, created_at DESC);
ALTER TABLE site_events ENABLE ROW LEVEL SECURITY; -- written/read by the service role only
