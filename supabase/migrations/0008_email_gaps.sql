-- Email system, round two: stop-on-reply, inbox, quote views, lost reasons, SMS/WhatsApp texts,
-- subject A/B, send limit, consent log. Idempotent. All new tables are service-role only.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS followups_paused_until TIMESTAMPTZ;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS quote_first_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quote_last_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quote_view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lost_reason TEXT;

ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_daily_limit INTEGER NOT NULL DEFAULT 100;

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS sms_body TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_body TEXT,
  ADD COLUMN IF NOT EXISTS subject_b TEXT;

ALTER TABLE email_outbox
  ADD COLUMN IF NOT EXISTS variant TEXT,
  ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS email_consents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  source      TEXT NOT NULL,
  notice_text TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_consents_email ON email_consents (lower(email));

CREATE TABLE IF NOT EXISTS inbox_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction        TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  email            TEXT NOT NULL,
  from_name        TEXT,
  subject          TEXT,
  body_text        TEXT,
  resend_email_id  TEXT UNIQUE,
  message_id       TEXT,
  auto_reply       BOOLEAN NOT NULL DEFAULT FALSE,
  body_available   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at          TIMESTAMPTZ,
  handled_at       TIMESTAMPTZ,
  sent_by          TEXT
);
CREATE INDEX IF NOT EXISTS idx_inbox_email ON inbox_messages (lower(email), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_unread ON inbox_messages (created_at DESC) WHERE direction = 'in' AND read_at IS NULL;

ALTER TABLE email_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;

-- Global kill switch for automatic email (Automations → "Pause all"). The test suite also uses it so the live
-- 5-minute timer never picks up throwaway test rows.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_paused BOOLEAN NOT NULL DEFAULT FALSE;
