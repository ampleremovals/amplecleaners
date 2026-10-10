# CLAUDE.md — Ample Cleaners Booking, CRM & Cleaner App Platform
**Project Owner:** CCMendel (Rafael / Chinedu Daniel Chimezie)
**Version:** 1.0 | Confidential
**Sibling project:** C:\Users\User\Ampleremovals (Ample Removals) — a SEPARATE
product, SEPARATE Supabase project, SEPARATE Vercel deployment. Ample
Cleaners reuses proven patterns and lessons from that codebase but is its own
business end to end: its own brand, its own database, its own customers.

---

## WHAT THIS PROJECT IS

A full-stack cleaning company platform with THREE parts:
1. A **public-facing booking website** (this repo, `app/(public)`) — customers
   request regular/deep/end-of-tenancy/office/after-builders cleaning.
2. A **protected admin CRM dashboard** (this repo, `app/(admin)`) — the team
   manages leads, bookings, the cleaner roster, scheduling, invoicing.
3. A **cleaner mobile app** (`cleaner-app/`, Expo/React Native) — cleaners see
   their assigned jobs, clock in/out, work through a task checklist, upload
   before/after photos, and see their earnings. Cloned architecturally from
   Ample Removals' `driver-app/` (Expo Router + Supabase + React Query +
   NativeWind) — same proven shape, new screens for cleaning-specific tasks
   instead of driving legs.

This project belongs to CCMendel. Treat every instruction in this file as law.

---

## WHO YOU ARE TALKING TO

CCMendel is a vibe coder and serial entrepreneur running multiple "Ample"
businesses. Speak clearly, explain what you're doing and why at each step.
Never assume he knows a terminal command — always write it out in full. Never
ask him to do something manually in a browser/dashboard if it can be done via
code, API, CLI, or automation (see Ample Removals' CLAUDE.md "Examples of
things you should NEVER ask him to do manually" — the same rule applies here).

**Known exception, already flagged once and not worth re-litigating every
session:** creating the actual Supabase project, and any paid third-party
account (Twilio number, Stripe account, domain), requires the owner's own
account access/payment details — that genuinely cannot be scripted by Claude
without credentials the owner must generate. Everything downstream of having
those credentials (schema, RLS, env vars, Vercel sync) IS automated — see
`scripts/run-migrations.ts`.

---

## GOLDEN RULES
(identical to Ample Removals' — copy them, don't relitigate them)

1. **ALWAYS push to Git after every completed iteration.** No exceptions.
2. **Never mark something done without proving it works.** Test it, check logs.
3. **Never break what already works.** Minimal impact — touch only what the
   current task needs.
4. **Plan before building.** 3+ steps or an architectural decision → write a
   plan first (`tasks/todo.md`).
5. **Fix bugs autonomously.** Diagnose and fix; don't ask for hand-holding.
6. **No hacky fixes.** A workaround-shaped solution means stop and do it properly.
7. **Always write the elegant solution.** "Would a senior engineer approve this?"

---

## TECH STACK

| Layer | Technology | Note |
|---|---|---|
| Web framework | Next.js 14.2 (App Router, TypeScript) | pinned to match Ample Removals |
| Mobile (cleaners) | Expo + Expo Router + NativeWind + React Query | cloned from `driver-app/` |
| Database & Backend | Supabase (PostgreSQL) | **own project — not shared with Ample Removals** |
| Authentication | Supabase Auth | admin + cleaner roles, see `lib/user-type.ts` |
| Styling | Tailwind CSS v3 + Shadcn/UI | `components/ui/*` cloned from Ample Removals (generic primitives, no business logic) |
| Animations | Framer Motion | |
| Email | Resend | |
| SMS / WhatsApp | Twilio | own number + own WhatsApp Business profile — templates must be (re)approved, they don't carry over from Ample Removals |
| Payments & Invoicing | Stripe + @react-pdf/renderer | own Stripe account |
| Address Lookup | postcodes.io (free, no key) | identical to Ample Removals |
| File Storage | Supabase Storage | before/after job photos, DBS docs |
| Charts | Recharts | |
| Hosting | Vercel | separate project from Ample Removals |
| Version Control | Git + GitHub | separate repo from Ample Removals |

**Do not introduce new packages without explaining why and getting confirmation.**

---

## SERVICES THIS PLATFORM COVERS

1. **Regular Cleaning** (recurring — weekly / fortnightly / monthly)
2. **Deep Cleaning** (one-off, thorough)
3. **End of Tenancy Cleaning**
4. **Office Cleaning** (commercial, often out-of-hours)
5. **After Builders Cleaning**

---

## BRAND

**Revised 2026-10-04 per explicit owner direction — supersedes the original
"stay off Removals' purple/green" rationale below.** Green is now the
dominant brand colour, with light blue and violet as secondary accents,
deliberately colourful and glassmorphic.

- **Primary colour:** Green `#16a34a` (brand.green)
- **Accents:** Sky blue `#0ea5e9` (brand.sky) and violet `#a855f7` (brand.violet)
- **Base:** White `#ffffff`
- **Display font:** Unbounded (headings, chunky/rounded, bold) — **Body font:** Manrope
- **Feel:** Colourful, glassmorphic, lively, easy to scroll, fast to book.
- Aesthetic: frosted-glass panels (`.glass` / `.glass-strong` in
  `app/globals.css`) floating over slowly-drifting blurred colour-blob
  backgrounds (`components/shared/GradientMesh.tsx`), staggered
  scroll-reveal animation via Framer Motion.
- **Homepage revised 2026-10-06 per owner feedback ("looks amateurish")** —
  the public homepage now uses a deep-green (`brand-green-950`) hero with
  white text, a live price-calculator card as the hero visual, a trust band,
  and solid white/slate section bands with solid cards (no glass-on-blobs
  behind body text). The glass utilities and `GradientMesh` still exist but
  the homepage no longer relies on them. Primary buttons use
  `brand-green-700` (white text 5:1), not 600 (3.3:1). Navbar is a solid
  white bar. Keep one solid colour per text; no gradient text.
- ~~Deliberately NOT purple/green (Ample Removals' palette)~~ — superseded;
  the owner explicitly asked for green + violet. The two brands are now
  differentiated by fonts, layout and the specific shade of green/accent mix
  instead, not by avoiding the colour family entirely.

---

## FOLDER STRUCTURE

```
app/
  (public)/
    page.tsx                      ← homepage
    booking/[service]/page.tsx    ← booking form per service
    confirmation/page.tsx
    quote/[bookingId]/[token]/    ← customer quote + pay-deposit page (Phase 3)
    layout.tsx
  (admin)/
    admin/
      page.tsx                    ← dashboard overview
      bookings/                   ← CRM pipeline board (Phase 2)
      cleaners/                   ← roster, DBS checks, availability, coverage
      customers/
      invoices/
      reports/
      login/page.tsx
      layout.tsx
  api/
    bookings/route.ts             ← ONE shared creation endpoint (not 5 — the
                                     schema is already generic across services,
                                     unlike Ample Removals' per-service routes)
    postcode/lookup/route.ts
    webhooks/stripe/route.ts

cleaner-app/                       ← Expo Router mobile app for cleaners
                                     (cloned shape from ../Ampleremovals/driver-app)

components/
  ui/                   ← Shadcn primitives (cloned verbatim — generic, no IP)
  shared/                ← Navbar, Footer, ServiceCard
  booking/
  admin/

lib/
  supabase/client.ts | server.ts | middleware.ts
  resend.ts | twilio.ts | stripe.ts | postcode.ts | deposit.ts
  utils.ts              ← cn(), generateBookingReference(), formatCurrency()
  user-type.ts           ← admin vs cleaner role detection
  admin-auth.ts

lib/email/               ← email engine: templates (editable in Admin → Automations), journey scanner,
                           dispatcher, unsubscribe, segments, stats. See tasks/todo.md "Email system".

types/index.ts           ← ALL TypeScript interfaces
middleware.ts             ← protects /admin/* and /cleaners/* routes
supabase/migrations/      ← schema SQL, run via scripts/run-migrations.ts
tasks/
  todo.md                ← active task list with checkboxes (the master plan lives here)
  lessons.md              ← running log — SEEDED with the transferable lessons
                             already learned the hard way on Ample Removals
```

---

## BOOKING STATUS PIPELINE

```
inquiry → called | not_called → answered | not_answered
→ quote_sent → deposit_invoice_sent → booking_confirmed
→ cleaner_assigned → in_progress → job_completed
→ invoice_sent → paid

Side exits: bad_lead | not_a_good_fit | cancelled
```

Deliberately has NO "processing"/"pending" limbo statuses — Ample Removals hit
real bugs from ambiguous in-between statuses and later removed them entirely
(see their `tasks/lessons.md`). Every status here is a distinct, unambiguous
step from day one.

`deposit_invoice_sent` is skipped for jobs that don't require a deposit (most
one-off regular cleans) — those go `quote_sent` → `booking_confirmed` directly.

Every status change must update `bookings`, write a `status_history` row, and
write an `activity_log` entry — identical discipline to Ample Removals.

## BOOKING REFERENCE FORMAT

| Service | Prefix | Example |
|---|---|---|
| Regular Cleaning | REG | REG-2026-X8K4P |
| Deep Cleaning | DEE | DEE-2026-3TZ9W |
| End of Tenancy | EOT | EOT-2026-M2RQN |
| Office Cleaning | OFC | OFC-2026-7BVFA |
| After Builders | ABU | ABU-2026-K5YJD |

Invoice format: `INV-2026-XXXXX`

---

## WHAT WAS DELIBERATELY CLONED FROM AMPLE REMOVALS (and why)

Per the owner's explicit instruction — clone what's beneficial, don't
reinvent what already works:

- **`components/ui/*`** — shadcn primitives. Zero business logic, pure UI
  boilerplate, no reason to rewrite.
- **`lib/supabase/{client,server,middleware}.ts`, `middleware.ts`** — the
  cookie/bearer-token dual-auth pattern and the admin-vs-other-role route
  gating. Adapted: "driver" → "cleaner".
- **`lib/postcode.ts`** — postcodes.io lookup, fully generic, copied verbatim.
  (Ideal Postcodes paid tier is optional — same fallback behaviour.)
- **`lib/user-type.ts`, `lib/admin-auth.ts`** — role detection + the
  `admin_users.is_active` deactivation check (Ample Removals added this after
  finding that deactivating an admin didn't actually revoke access — don't
  reintroduce that gap here by skipping the check).
- **Deposit architecture (Lesson 18)** — `deposit_percentage` is stamped on
  each booking AT CREATION, never read live from a global constant at payment
  time. This is not optional cleverness — Ample Removals shipped without it,
  a global-rate change retroactively corrupted real customers' charges, and
  the fix required a production data-repair script. Ample Cleaners starts
  with the per-row rate from day one.
- **Single source of truth for price (Lesson 17)** — `quote_total` is the ONLY
  field any payment/display code may read. Never recompute a price from line
  items at a different layer "for convenience" — that exact pattern silently
  overwrote admin-edited prices on Ample Removals and caused a real customer
  overcharge. If you (Claude, future session) are about to add a second place
  that derives a total independently, stop and read `tasks/lessons.md` first.
- **No "confirm your quote" step** — the customer-facing quote flow goes
  straight from "here's your price" to "pay your deposit to secure your
  date," no intermediate confirmation screen. Ample Removals rebuilt this
  after launch; Ample Cleaners ships with it from the start.
- **`driver-app/` → `cleaner-app/`** — Expo Router + Supabase + TanStack Query
  + NativeWind shape, offline-friendly caching, push notifications, photo
  capture, clock-in/out via location. Screens are new (checklist-based
  cleaning tasks instead of pickup/delivery legs) but the architecture is
  the same proven one.

## WHAT WAS DELIBERATELY NOT CLONED

- Twilio WhatsApp **approved templates** — these are approved per WhatsApp
  Business profile and do NOT transfer between businesses. Ample Cleaners
  starts with freeform SMS/WhatsApp (`lib/twilio.ts`) and must register its
  own templates once its WhatsApp Business profile is live (see
  Ample Removals' `lib/whatsapp-templates.ts` for the pattern to follow).
- The Standard/Premium **tier** quote system — cleaning jobs are priced per
  visit, not tiered like a removal. `quote_total` is a single figure.
- The complex customer-email-logging patch in Ample Removals' `lib/resend.ts`
  (auto-logs every email into a `customer_emails` conversation inbox) — not
  built here yet; add it in Phase 4 (Automation) if/when a unified inbox is
  wanted, following that file as the reference implementation.

---

## TASK MANAGEMENT PROTOCOL

Identical to Ample Removals — before any non-trivial work: write the plan to
`tasks/todo.md` as a checklist, state it, check items off as completed, write
a review at the end, log any lesson to `tasks/lessons.md`, push to Git.

---

## GIT WORKFLOW

```bash
git add .
git commit -m "feat: [short description]"
git push origin main
```
Prefixes: `feat:` `fix:` `chore:` `style:` `refactor:` `docs:` — same convention.

---

## PHASES OVERVIEW

| Phase | Focus | Status |
|---|---|---|
| 1 | Project scaffold, schema design, brand system, base components, homepage + booking form shell | **This session — scaffolded, not yet deployed (needs Supabase/Resend/Twilio/Stripe credentials)** |
| 2 | Admin CRM: bookings pipeline board, cleaner roster + availability + coverage areas, customer records | Next |
| 3 | Quote delivery + self-serve deposit payment (clone the FIXED, no-confirm-step version of Ample Removals' `/quote/[bookingId]/[token]` flow directly — don't rebuild the buggy original) | Next |
| 4 | `cleaner-app/` mobile: auth, job list, clock-in/out, task checklist, before/after photos, earnings. Automation: auto-assign cleaner by coverage area + availability, recurring-job auto-regeneration | Later |
| 5 | Invoicing, PDF generation, Stripe webhooks, recurring billing | Later |
| 6 | Polish, security hardening, production deploy | Later |

Current active phase is tracked in `tasks/todo.md`.

---

## ENVIRONMENT VARIABLES REFERENCE

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

RESEND_API_KEY=
RESEND_FROM_EMAIL=bookings@amplecleaners.com
RESEND_ADMIN_EMAIL=admin@amplecleaners.com
RESEND_WEBHOOK_SECRET=            # signing secret of the Resend webhook -> /api/webhooks/resend
CRON_SECRET=                      # same value on Vercel and in the pg_cron job (scripts/schedule-email-dispatch.ts)

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_NUMBER=

STRIPE_SECRET_KEY=
STRIPE_SECRET_KEY_TEST=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

NEXT_PUBLIC_DEPOSIT_PERCENTAGE=20
NEXT_PUBLIC_BANK_ACCOUNT_NAME=
NEXT_PUBLIC_BANK_SORT_CODE=
NEXT_PUBLIC_BANK_ACCOUNT_NUMBER=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Never commit `.env.local` to Git. It is in `.gitignore` by default.

---

*This file is the source of truth for this project. When in doubt, refer back here.*
