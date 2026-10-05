-- 0005 — Owner-editable pricing, cleaner time off, job declines. Idempotent.

-- ── Pricing lives in Settings (the singleton row) ─────────────────────────
-- Existing bookings keep the rate/deposit stamped on them; these only affect NEW bookings.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(6,2) NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS min_hours NUMERIC(4,1) NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS deposit_percentage NUMERIC(5,2) NOT NULL DEFAULT 20;

-- ── Cleaner time off (holiday / sickness) — the matcher never assigns into it ─
CREATE TABLE IF NOT EXISTS cleaner_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_time_off_cleaner ON cleaner_time_off (cleaner_id, start_date);
ALTER TABLE cleaner_time_off ENABLE ROW LEVEL SECURITY;

-- ── A cleaner declining a job; that cleaner is never re-offered the same job ──
CREATE TABLE IF NOT EXISTS booking_declines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (booking_id, cleaner_id)
);
CREATE INDEX IF NOT EXISTS idx_declines_cleaner ON booking_declines (cleaner_id, created_at DESC);
ALTER TABLE booking_declines ENABLE ROW LEVEL SECURITY; -- service role only

-- ── Cleaners can READ their own availability / areas / time off (app screens);
-- every write goes through /api/cleaner/* which validates it.
DROP POLICY IF EXISTS "Cleaners read own availability" ON cleaner_availability;
CREATE POLICY "Cleaners read own availability" ON cleaner_availability FOR SELECT TO authenticated
  USING (cleaner_id IN (SELECT id FROM cleaners WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Cleaners read own coverage" ON cleaner_coverage_areas;
CREATE POLICY "Cleaners read own coverage" ON cleaner_coverage_areas FOR SELECT TO authenticated
  USING (cleaner_id IN (SELECT id FROM cleaners WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Cleaners read own time off" ON cleaner_time_off;
CREATE POLICY "Cleaners read own time off" ON cleaner_time_off FOR SELECT TO authenticated
  USING (cleaner_id IN (SELECT id FROM cleaners WHERE auth_user_id = auth.uid()));
