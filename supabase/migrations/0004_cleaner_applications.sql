-- 0004 — Cleaner self-registration. Public applicants are stored here (written
-- only by the service-role API route, so no anon policies); an admin approves
-- (creating the cleaner + login) or rejects. Idempotent.
CREATE TABLE IF NOT EXISTS cleaner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  postcode TEXT NOT NULL,
  areas TEXT,                         -- postcode prefixes they can cover, e.g. "SW1, SW3"
  experience_years SMALLINT,
  has_right_to_work BOOLEAN NOT NULL DEFAULT FALSE,
  has_dbs BOOLEAN NOT NULL DEFAULT FALSE,
  availability_notes TEXT,
  about TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','approved','rejected')),
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  cleaner_id UUID REFERENCES cleaners(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleaner_applications_status ON cleaner_applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleaner_applications_email ON cleaner_applications (lower(email));
ALTER TABLE cleaner_applications ENABLE ROW LEVEL SECURITY; -- service role only
