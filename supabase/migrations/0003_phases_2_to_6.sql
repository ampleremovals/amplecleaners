-- 0003 — Phases 2/4/5/6: security hardening, cleaner read access, push tokens,
-- DB-backed rate limiting, private storage buckets, job-execution columns,
-- recurring-series uniqueness. Idempotent (safe to re-run).

-- ── Hardening ──────────────────────────────────────────────────────────────
-- The public booking form writes through the service-role key in
-- /api/bookings, so anon needs NO direct insert access. Leaving these policies
-- let anyone POST a booking straight to PostgREST with their own price/status.
DROP POLICY IF EXISTS "Public insert customers" ON customers;
DROP POLICY IF EXISTS "Public insert addresses" ON addresses;
DROP POLICY IF EXISTS "Public insert bookings" ON bookings;

-- A cleaner could previously overwrite ANY column of their own booking (price,
-- status, customer). Cleaner writes now go through /api/cleaner/* which
-- whitelists exactly what they may change and writes the audit trail.
DROP POLICY IF EXISTS "Cleaners update own bookings" ON bookings;

ALTER TABLE server_logs ENABLE ROW LEVEL SECURITY;

-- ── Cleaner read access (the mobile app reads these with the cleaner's own
-- session; without them login + the job screen's customer/address were empty).
DROP POLICY IF EXISTS "Cleaners read own row" ON cleaners;
CREATE POLICY "Cleaners read own row" ON cleaners FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Cleaners read assigned customers" ON customers;
CREATE POLICY "Cleaners read assigned customers" ON customers FOR SELECT TO authenticated
  USING (id IN (
    SELECT b.customer_id FROM bookings b
    JOIN cleaners c ON c.id = b.assigned_cleaner_id
    WHERE c.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Cleaners read assigned addresses" ON addresses;
CREATE POLICY "Cleaners read assigned addresses" ON addresses FOR SELECT TO authenticated
  USING (id IN (
    SELECT b.address_id FROM bookings b
    JOIN cleaners c ON c.id = b.assigned_cleaner_id
    WHERE c.auth_user_id = auth.uid()
  ));

-- ── Push tokens (Expo) — one cleaner can have several devices ───────────────
CREATE TABLE IF NOT EXISTS cleaner_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_cleaner ON cleaner_push_tokens (cleaner_id);
ALTER TABLE cleaner_push_tokens ENABLE ROW LEVEL SECURITY; -- service role only

-- ── Rate limiting (atomic, DB-backed so it works across serverless instances)
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY; -- service role only

-- Returns TRUE if the call is within `p_limit` per `p_window_seconds`.
CREATE OR REPLACE FUNCTION check_rate_limit(p_key TEXT, p_limit INTEGER, p_window_seconds INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO rate_limits AS r (key, window_start, count)
  VALUES (p_key, NOW(), 1)
  ON CONFLICT (key) DO UPDATE SET
    window_start = CASE WHEN r.window_start < NOW() - make_interval(secs => p_window_seconds)
                        THEN NOW() ELSE r.window_start END,
    count = CASE WHEN r.window_start < NOW() - make_interval(secs => p_window_seconds)
                 THEN 1 ELSE r.count + 1 END
  RETURNING r.count INTO v_count;
  RETURN v_count <= p_limit;
END;
$$;
REVOKE ALL ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- ── Job-execution + automation columns ──────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS clock_in_lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS clock_in_lng NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS clock_out_lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS clock_out_lng NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS cleaner_reminder_sent_on DATE,
  ADD COLUMN IF NOT EXISTS completion_processed_at TIMESTAMPTZ;

-- A recurring series can never get two visits on the same day, even if the
-- generator runs twice concurrently.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_series_date
  ON bookings (parent_booking_id, clean_date) WHERE parent_booking_id IS NOT NULL;

-- One customer rating per booking (the rating page can be double-submitted).
CREATE UNIQUE INDEX IF NOT EXISTS uq_ratings_booking ON ratings (booking_id);

-- Overdue-balance chasing.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS last_reminder_sent_on DATE,
  ADD COLUMN IF NOT EXISTS reminder_count SMALLINT NOT NULL DEFAULT 0;

-- ── Private storage buckets ────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('job-photos',   'job-photos',   false, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('cleaner-docs', 'cleaner-docs', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types,
      public = false;

-- A cleaner may upload/read photos only under `<booking_id>/…` for a booking
-- assigned to them. Admin access (signed URLs) uses the service role.
DROP POLICY IF EXISTS "Cleaners upload photos to own jobs" ON storage.objects;
CREATE POLICY "Cleaners upload photos to own jobs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT b.id::text FROM bookings b
      JOIN cleaners c ON c.id = b.assigned_cleaner_id
      WHERE c.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Cleaners read photos of own jobs" ON storage.objects;
CREATE POLICY "Cleaners read photos of own jobs" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT b.id::text FROM bookings b
      JOIN cleaners c ON c.id = b.assigned_cleaner_id
      WHERE c.auth_user_id = auth.uid()
    )
  );
