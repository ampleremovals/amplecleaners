# Lessons Log

Seeded from Ample Removals' own `tasks/lessons.md` with the lessons that
transfer directly to this codebase (same stack, same owner, same patterns).
Don't re-learn these the hard way a second time. Removals-specific lessons
(driver app GPS quirks, payroll date handling, etc.) were left out — read
`../Ampleremovals/tasks/lessons.md` directly if something in that territory
comes up here.

## Lesson 1 — A single "source of truth" price field is worthless if any read path can recompute a different one
**What happened (on Ample Removals):** `quote_total` was the admin-edited,
authoritative price. A separate customer-facing flow recomputed the total
from `quote_line_items` instead of reading `quote_total`, and worse, WROTE
that recomputed (stale) figure back into `quote_total` — permanently
overwriting the admin's price. Caused a real customer overcharge.
**Rule going forward:** `bookings.quote_total` is the ONLY value any
display/payment/invoicing code may read for "what this booking costs."
Never recompute it from line items at a different layer. If `quote_line_items`
ever needs to change, update `quote_total` in the SAME write, not separately.

## Lesson 2 — A rate that can change over time belongs on the row it applies to, not a global constant
**What happened:** Changing Ample Removals' deposit rate (25% → 20%) had to
apply to new bookings only — existing bookings needed to keep their original
rate. A global `DEPOSIT_PERCENTAGE` read live everywhere would have silently
changed what already-quoted bookings owed.
**Rule going forward:** `bookings.deposit_percentage` is stamped at creation
(this schema already has it, DEFAULT 20 — see `supabase/migrations/0001_init.sql`).
Every deposit calculation must read the booking's OWN stamped rate via
`depositFor(total, booking.deposit_percentage)`, never the bare
`DEPOSIT_PERCENTAGE` constant, except when stamping a BRAND NEW booking.
Never hardcode the same rate a second time in a different file — one file
owns the constant, everything else imports it.

## Lesson 3 — Don't make the customer "confirm" before they can pay
**What happened:** Ample Removals originally had the customer click "confirm
my quote," THEN wait for a deposit invoice, THEN pay — an unnecessary extra
step that existed for no real reason and that the owner later asked to have
removed entirely in favour of "see your quote → pay your deposit" in one motion.
**Rule going forward:** The customer quote page goes straight from price to a
"Pay £Y deposit to secure your date" button. No intermediate confirmation
screen. Don't reintroduce one by accident while building Phase 3.

## Lesson 4 — Don't select/write a column before its migration has run
**What happened (on Ample Removals):** A Supabase query selected a column
that hadn't been migrated into that environment yet, and the WHOLE query
failed — not just that field — taking down an entire feature over one
optional column.
**Rule going forward:** For any column that's genuinely optional or newer
than the "always existed" core columns, write/read it in its OWN best-effort
try/catch block, separate from the core insert/update that must never fail.
See `lib/bookings` patterns in Ample Removals for the exact shape (core
columns first in a statement that must succeed, optional ones after in a
guarded block).

## Lesson 5 — Deactivating an admin must actually revoke access
**What happened:** Ample Removals' role-detection defaulted anyone not found
in the drivers/cleaners table to "admin" — including someone deactivated in
the `admin_users` management screen, who could still get in because
deactivation only hid a menu item, not auth itself.
**Rule going forward:** `lib/user-type.ts`'s `isAdmin()` here already checks
`admin_users.is_active` and returns false if deactivated — don't remove that
check when extending auth, and apply the same discipline to any future
`isCleaner()`-style check.

## Lesson 6 — Supabase's query builder isn't a Promise until you await it
**What happened:** `supabase.from(...).insert(...).catch(() => {})` failed to
typecheck — `PostgrestFilterBuilder` doesn't have `.catch()`. It only becomes
a real Promise once awaited (or `.then()`'d); chaining `.catch()` straight off
the builder is a type error, not a runtime no-op.
**Rule going forward:** Wrap best-effort Supabase calls in `try { await ... }
catch { }`, never `supabase.from(...).insert(...).catch(...)`.

## Lesson 7 — Resend/Stripe SDK constructors throw at MODULE LOAD, not at send/call time, if the key is missing
**What happened:** `next build` failed at the "Collecting page data" step
(which imports and evaluates every route module) with `Missing API key` /
`Neither apiKey nor config.authenticator provided` — before any real env
vars existed for this project. Both SDKs validate their key the moment
`new Resend(...)` / `new Stripe(...)` runs at module top level, not when you
actually try to send/charge something — so an empty/undefined key breaks the
BUILD, not just the feature, even for routes that never run during a build.
**Rule going forward:** `lib/resend.ts` and `lib/stripe.ts` fall back to an
obviously-fake placeholder string (`"re_placeholder_not_configured"` /
`"sk_test_placeholder_not_configured"`) when the real env var is empty, so
construction always succeeds. Every actual send/charge call site is already
wrapped in try/catch, so a placeholder key just makes the real call fail
gracefully at runtime instead of crashing the whole build.
