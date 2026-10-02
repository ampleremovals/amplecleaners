-- Ample Cleaners — initial schema.
-- Mirrors the proven shape of the Ample Removals schema (booking pipeline,
-- status_history/activity_log audit trail, invoices, RLS pattern) adapted for
-- a cleaning business: recurring jobs, a cleaner roster (DBS checks, ratings),
-- and task checklists with before/after photos instead of removal inventory.
--
-- Run via: npx tsx scripts/run-migrations.ts (idempotent, safe to re-run).

-- ── Customers ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);

-- ── Addresses ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_1 TEXT NOT NULL,
  line_2 TEXT,
  city TEXT,
  postcode TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Admin users (mirrors Ample Removals' "Manage Admins" system) ──────────
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Cleaners (the "drivers" equivalent) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS cleaners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  dbs_check_url TEXT,
  dbs_verified BOOLEAN NOT NULL DEFAULT FALSE,
  right_to_work_url TEXT,
  bank_sort_code TEXT,
  bank_account_number TEXT,
  pay_rate_per_hour NUMERIC(6,2),
  rating_avg NUMERIC(3,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleaners_auth_user ON cleaners (auth_user_id);

-- Which days/times a cleaner is generally available — used for auto-matching
-- a job to an available cleaner (Phase 4 automation).
CREATE TABLE IF NOT EXISTS cleaner_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleaner_availability_cleaner ON cleaner_availability (cleaner_id);

-- Postcode areas (or radius) a cleaner is willing to travel to.
CREATE TABLE IF NOT EXISTS cleaner_coverage_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  postcode_prefix TEXT NOT NULL, -- e.g. "SW1", "RG"
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cleaner_coverage_cleaner ON cleaner_coverage_areas (cleaner_id);

-- ── Bookings (the heart of the system) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  service_type TEXT NOT NULL CHECK (service_type IN
    ('regular_cleaning','deep_cleaning','end_of_tenancy','office_cleaning','after_builders')),
  status TEXT NOT NULL DEFAULT 'inquiry' CHECK (status IN (
    'inquiry','called','not_called','answered','not_answered',
    'quote_sent','deposit_invoice_sent','booking_confirmed',
    'cleaner_assigned','in_progress','job_completed',
    'invoice_sent','paid','bad_lead','not_a_good_fit','cancelled'
  )),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  property_type TEXT CHECK (property_type IN ('flat','house','studio','office','other')),
  bedrooms SMALLINT,
  bathrooms SMALLINT,
  frequency TEXT CHECK (frequency IN ('one_off','weekly','fortnightly','monthly')),
  clean_date DATE,
  is_flexible_date BOOLEAN DEFAULT FALSE,
  flexible_date_from DATE,
  flexible_date_to DATE,
  clean_time TIME,
  description TEXT,
  special_instructions TEXT,

  -- Quote — same shape as Ample Removals (line items + total), single price,
  -- no Standard/Premium tiers (cleaning jobs are priced per visit, not tiered).
  quote_line_items JSONB DEFAULT '[]'::jsonb,
  quote_subtotal NUMERIC(10,2),
  quote_vat_rate NUMERIC(5,2) DEFAULT 0,
  quote_vat_amount NUMERIC(10,2) DEFAULT 0,
  quote_total NUMERIC(10,2),
  quote_valid_until DATE,
  quote_notes TEXT,

  -- Deposit — same per-booking-rate pattern as Ample Removals (Lesson 18):
  -- a later site-wide rate change must never alter an existing booking.
  deposit_required BOOLEAN NOT NULL DEFAULT TRUE,
  deposit_percentage NUMERIC(5,2) NOT NULL DEFAULT 20,
  deposit_amount NUMERIC(10,2),
  deposit_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (deposit_status IN ('unpaid','claimed','verified')),
  deposit_claimed_at TIMESTAMPTZ,

  -- Assignment + job execution.
  assigned_cleaner_id UUID REFERENCES cleaners(id) ON DELETE SET NULL,
  tasks JSONB DEFAULT '[]'::jsonb,          -- CleaningTask[] checklist
  before_photos JSONB DEFAULT '[]'::jsonb,  -- storage URLs
  after_photos JSONB DEFAULT '[]'::jsonb,
  clock_in_at TIMESTAMPTZ,
  clock_out_at TIMESTAMPTZ,

  -- Recurring jobs: the booking that SPAWNED this one, so a weekly clean's
  -- history can be traced back to the original booking.
  parent_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  next_occurrence_date DATE,

  -- Lead scoring / attribution (same fields Ample Removals uses).
  source TEXT,
  lead_score INTEGER,
  lead_band TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_term TEXT, utm_content TEXT,
  gclid TEXT, fbclid TEXT, referrer TEXT, landing_page TEXT,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_cleaner ON bookings (assigned_cleaner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_clean_date ON bookings (clean_date);
CREATE INDEX IF NOT EXISTS idx_bookings_parent ON bookings (parent_booking_id);

-- ── Status history + activity log (audit trail — every change recorded) ───
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT NOT NULL, -- 'admin' | 'customer' | 'cleaner' | 'system'
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_status_history_booking ON status_history (booking_id);

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  performed_by TEXT NOT NULL, -- 'admin' | 'customer' | 'cleaner' | 'system'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_booking ON activity_log (booking_id);

-- ── Invoices (deposit / full balance / recurring) ──────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit','full_balance','recurring')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','cancelled')),
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL,
  vat_rate NUMERIC(5,2) DEFAULT 0,
  vat_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  due_date DATE,
  pay_code TEXT UNIQUE,
  pdf_url TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON invoices (booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_pay_code ON invoices (pay_code);

-- ── Settings (singleton row, id=1 — same convention as Ample Removals) ────
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name TEXT DEFAULT 'Ample Cleaners',
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  google_review_link TEXT,
  customer_sms_enabled BOOLEAN DEFAULT TRUE,
  customer_whatsapp_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── Server logs (errors that must never be swallowed by console.log) ──────
CREATE TABLE IF NOT EXISTS server_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'error',
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Ratings (post-job customer review, feeds cleaners.rating_avg) ─────────
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  cleaner_id UUID REFERENCES cleaners(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ratings_cleaner ON ratings (cleaner_id);

-- ── Row Level Security ──────────────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaner_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaner_coverage_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Public (anon) can only INSERT into booking-related tables — the public
-- booking wizard writes a customer + address + booking row, nothing else.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customers' AND policyname='Public insert customers') THEN
    CREATE POLICY "Public insert customers" ON customers FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='addresses' AND policyname='Public insert addresses') THEN
    CREATE POLICY "Public insert addresses" ON addresses FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='Public insert bookings') THEN
    CREATE POLICY "Public insert bookings" ON bookings FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

-- Admin/service-role reads+writes go through the service-role key server-side
-- (bypasses RLS entirely), same pattern as Ample Removals — so no "authenticated
-- full access" policies are needed here for the admin dashboard itself.

-- Authenticated cleaners can read/update only their OWN assigned bookings.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='Cleaners manage own bookings') THEN
    CREATE POLICY "Cleaners manage own bookings" ON bookings FOR SELECT TO authenticated
      USING (assigned_cleaner_id IN (SELECT id FROM cleaners WHERE auth_user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='Cleaners update own bookings') THEN
    CREATE POLICY "Cleaners update own bookings" ON bookings FOR UPDATE TO authenticated
      USING (assigned_cleaner_id IN (SELECT id FROM cleaners WHERE auth_user_id = auth.uid()));
  END IF;
END $$;
