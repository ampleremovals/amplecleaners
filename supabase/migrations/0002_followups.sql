-- Follow-up ladder tracking columns — see lib/followups/engine.ts.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS quote_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quote_followup_last_morning_sent_on DATE,
  ADD COLUMN IF NOT EXISTS quote_followup_last_evening_sent_on DATE,
  ADD COLUMN IF NOT EXISTS deposit_followup_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deposit_followup_last_morning_sent_on DATE,
  ADD COLUMN IF NOT EXISTS deposit_followup_last_evening_sent_on DATE;
