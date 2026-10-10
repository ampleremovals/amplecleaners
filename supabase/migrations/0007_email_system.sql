-- Email system: editable templates, journey switches, a scheduled outbox, delivery events,
-- suppressions (unsubscribes / bounces) and abandoned-form leads. Idempotent.
-- All tables are service-role only (RLS on, no policies): the admin screens go through /api/admin/*.

CREATE TABLE IF NOT EXISTS email_templates (
  key          TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('service', 'marketing')),
  description  TEXT,
  subject      TEXT NOT NULL,
  heading      TEXT NOT NULL,
  body         TEXT NOT NULL,
  cta_label    TEXT,
  cta_url      TEXT,
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  is_custom    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   TEXT
);

CREATE TABLE IF NOT EXISTS email_automations (
  key          TEXT PRIMARY KEY,
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  steps        JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  template_key    TEXT NOT NULL,
  segment         TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key   TEXT NOT NULL,
  category       TEXT NOT NULL CHECK (category IN ('system', 'service', 'marketing')),
  to_email       TEXT NOT NULL,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  booking_id     UUID REFERENCES bookings(id) ON DELETE SET NULL,
  automation_key TEXT,
  campaign_id    UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  vars           JSONB NOT NULL DEFAULT '{}'::jsonb,
  guard          JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key     TEXT UNIQUE,
  status         TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sending', 'sent', 'failed', 'skipped', 'cancelled')),
  status_note    TEXT,
  subject        TEXT,
  send_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at        TIMESTAMPTZ,
  resend_id      TEXT,
  attempts       SMALLINT NOT NULL DEFAULT 0,
  delivered_at   TIMESTAMPTZ,
  opened_at      TIMESTAMPTZ,
  clicked_at     TIMESTAMPTZ,
  bounced_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outbox_due ON email_outbox (send_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_outbox_to ON email_outbox (lower(to_email), sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbox_booking ON email_outbox (booking_id);
CREATE INDEX IF NOT EXISTS idx_outbox_resend ON email_outbox (resend_id);
CREATE INDEX IF NOT EXISTS idx_outbox_template ON email_outbox (template_key, sent_at DESC);

CREATE TABLE IF NOT EXISTS email_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    TEXT UNIQUE,
  outbox_id   UUID REFERENCES email_outbox(id) ON DELETE CASCADE,
  resend_id   TEXT,
  type        TEXT NOT NULL,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_events_outbox ON email_events (outbox_id);

CREATE TABLE IF NOT EXISTS email_suppressions (
  email       TEXT PRIMARY KEY,
  scope       TEXT NOT NULL CHECK (scope IN ('marketing', 'all')),
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS abandoned_leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT,
  phone         TEXT,
  service_type  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at  TIMESTAMPTZ
);

ALTER TABLE email_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_automations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_outbox       ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_leads    ENABLE ROW LEVEL SECURITY;

-- The company's postal address goes in every email footer (UK business-email rules).
UPDATE settings SET company_address = '363 Heathway, Dagenham RM9 5AG' WHERE id = 1 AND (company_address IS NULL OR company_address = '');
