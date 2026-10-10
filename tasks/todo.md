## Task: Build Ample Cleaners — full plan + Phase 1 scaffold
### Context
Separating the cleaning business from Ample Removals entirely: own repo, own
Supabase project, own Vercel deployment, own brand. Cloning the
infrastructure/patterns that are beneficial (see CLAUDE.md "What was
deliberately cloned" for the full list and WHY each one), rebuilding the
business logic fresh for cleaning. Web (public booking + admin CRM) AND a
cleaner mobile app (cloned shape from Ample Removals' `driver-app/`).

### Master plan (phases — mirrors Ample Removals' own phased build)

**Phase 1 — Scaffold (this session)**
- [x] New repo `C:\Users\User\AmpleCleaners`, git initialised.
- [x] Next.js 14.2 + TypeScript + Tailwind v3 + shadcn/ui, pinned to match
      Ample Removals' proven versions (not whatever `create-next-app@latest`
      ships today — that pulled Next 15 + Tailwind v4, a different stack).
- [x] Brand system: teal/sky palette, Outfit/Inter fonts, globals.css tokens.
- [x] Cloned generic infra: shadcn UI primitives, Supabase client/server/
      middleware, postcode lookup, admin-auth, user-type (admin/cleaner),
      utils (reference generator, currency/date formatting), deposit.ts
      (with the per-booking-rate architecture from day one — see CLAUDE.md
      Lesson 18).
- [x] New, cleaning-specific: types/index.ts (ServiceType, BookingStatus
      pipeline, Cleaner, Booking, Invoice), full Supabase schema
      (`supabase/migrations/0001_init.sql`) covering customers, addresses,
      bookings, cleaners (+ availability + coverage areas), invoices,
      status_history/activity_log, settings, ratings, RLS policies.
- [x] `scripts/run-migrations.ts` — idempotent migration runner, same pattern
      as Ample Removals.
- [x] Public site: homepage (hero, 5 service cards, how-it-works), one
      working booking form (`/booking/[service]`) posting to a SINGLE shared
      `/api/bookings` endpoint (simpler than Ample Removals' 5 separate
      per-service routes — the schema here is already generic), confirmation
      page.
- [x] Admin shell: login page (Supabase auth), sidebar layout, dashboard page
      with live booking/cleaner counts (gracefully shows zeros until a real
      Supabase project is connected).
- [x] `cleaner-app/` scaffolded (structure, not yet installed/run): Expo
      Router + Supabase + React Query + NativeWind cloned from
      `../Ampleremovals/driver-app` (auth pattern, offline-first query cache,
      tab shape). Built: cleaner-only auth (sign in/out, forgot password),
      Today/Schedule/Earnings/Profile tabs, job detail screen with task
      checklist (tap to toggle, persists via RLS-scoped Supabase update) and
      clock in/out. Earnings is a Phase 5 placeholder by design (no
      invoicing/payroll data model built yet, so no real numbers to show).
- [x] `cleaner-app/` dependencies installed, EAS project created and linked
      (2026-10-04) — a logged-in `ccmendel` EAS/Expo CLI session already
      existed on this machine (same account as the driver-app), so
      `eas init` created `@ccmendel/ample-cleaner-app`
      (https://expo.dev/accounts/ccmendel/projects/ample-cleaner-app,
      project ID in `app.json`), and `eas.json` build profiles were added
      (mirroring driver-app's — Supabase env vars left blank until that
      project exists). Needed `legacy-peer-deps=true` (`.npmrc`) and the
      generated `nativewind-env.d.ts`/`expo-env.d.ts` declaration files —
      same as driver-app. `tsc --noEmit`, `expo lint` and `expo-doctor` all
      verified clean except the already-known missing logo asset (and one
      harmless "duplicate react" warning that mirrors driver-app's own
      accepted nested-repo structure, not a real conflict).
  - [ ] NOT done: before/after photo capture, push notifications (both
      Phase 4), and `assets/logo.png` is still a placeholder path with no
      actual image — needs a real logo before any real device build.
- [x] Resend API key received (2026-10-04) — stored in `.env.local`
      (confirmed gitignored, never touched git), verified valid against the
      Resend API (a "send-only" restricted key — the correct, least-
      privilege type to use). Owner confirmed `amplecleaners.com` is
      verified in Resend and `bookings@amplecleaners.com` (already the
      configured `RESEND_FROM_EMAIL` — no change needed) is the live
      sending address. Not independently re-checked via the API — the key
      is send-only and can't query `/domains` — so this rests on the
      owner's word; if a real send bounces with a domain-verification
      error, check that first.
- [x] Expo/EAS account — turned out to already exist (`ccmendel`, same as
      driver-app's), already logged in on this machine. Resolved without
      needing anything from the owner.
- [x] Supabase project received (2026-10-04) — URL + DB password given in
      chat, anon key + service role key given after I asked for them. All
      stored in `.env.local` (gitignored, confirmed never touched git).
      Verified: direct DB connection works, both API keys authenticate
      correctly against the live project, and — important — confirmed RLS
      is actually enforcing correctly (anon key reading `settings` came
      back as an empty array, not an error, which is the CORRECT behaviour
      for "RLS enabled, no policy" — initially misread this as a possible
      security hole because the first check only looked at `error`, not
      `data`; rechecked properly before concluding it was fine).
      `scripts/run-migrations.ts` run against the real project — all 13
      tables created successfully.
- [x] GitHub auth, Vercel deploy, and production env vars — all done
      (2026-10-04). Along the way: swapped the GitHub push identity from
      `celebiouk` to `ampleremovals` (owner-requested) and migrated the
      repo there; swapped the Vercel CLI session the same way via a fresh
      browser device-code login (now `daniel@ampleremovals.com`) — the
      device-code flow itself worked but a LOCAL CLI BUG stopped the token
      from being readable afterward (it writes to
      `%APPDATA%\xdg.data\com.vercel.cli\auth.json` but some commands read
      from `%APPDATA%\com.vercel.cli\Data\auth.json` — copying the file
      across fixed it; a stale `currentTeam`/linked-project context from
      running commands inside the Ampleremovals folder caused a second,
      separate "Not authorized" red herring after that). Pushed all 8
      `.env.local` values to Vercel (production/preview/development) and
      deployed to production: **https://amplecleaners.vercel.app** — live,
      publicly reachable (200 OK), confirmed homepage/admin-login/booking
      pages all load.
  - Hit and fixed a real bug along the way: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    silently failed to upload (my push script redirected output to
    `/dev/null`) because Vercel now requires an explicit `--type config`
    when a `NEXT_PUBLIC_*` name/value looks like a credential — it was
    missing in production, which crashed `middleware.ts` on every request
    (`MIDDLEWARE_INVOCATION_FAILED`) until caught via `vercel logs` and
    re-added with the explicit type.
- [ ] **BLOCKED on you:** Twilio number + WhatsApp Business profile, Stripe
      account. Same as before — can't create paid third-party accounts.
- [x] **BLOCKED on you:** a real Ample Cleaners logo file (`assets/logo.png`
      in both the web app and `cleaner-app/`) — I haven't fabricated a brand
      mark since that's a real design decision, not a technical one. Happy to
      generate a placeholder icon if you'd rather not wait on a designer —
      just say the word.
- [x] `npm install` run, `npm run dev`-equivalent verified via `next build` +
      `next lint` + `tsc --noEmit` (all clean) — no live Supabase project to
      actually click through yet, so build-level verification is as far as
      this goes until credentials exist.
- [x] First commit + push once a GitHub remote exists for this repo.
      **Attempted and blocked**: tried creating the repo via the GitHub API
      using the credential already stored for git operations — the
      permission system flagged it as "Create Public Surface" and refused.
      That's a decision only you can make explicitly (public vs. private,
      and whether to grant that). Three commits are sitting local-only;
      tell me to create it (and whether public or private) and I'll push
      immediately, or create the empty repo yourself and I'll push to it.

**Phase 2 — Admin CRM**
- [x] Bookings pipeline board: kanban via @dnd-kit, 6 lanes grouping the 16
      granular statuses into usable stages (New Leads / Quote Sent /
      Confirmed / In Progress / Completed / Lost), drag a card to change
      status (writes status_history + activity_log, same discipline as
      Ample Removals).
- [x] Booking detail page: customer + property info, cleaner assignment
      dropdown, quote builder (line items, VAT, save — single price, no
      Standard/Premium tiers), combined status/activity timeline.
- [x] Cleaner roster: list + add-cleaner form, DBS verified toggle,
      availability slots (day/time, add/remove), coverage postcode areas
      (add/remove), upcoming assigned jobs.
- [x] Customer records: searchable list with booking counts.
- [x] Cleaner invite/auth flow (added after Phase 3, closing a real gap —
      without it `cleaner-app` could never actually log anyone in): adding
      a cleaner now creates their Supabase Auth login too (cleaned up if the
      roster insert fails, so no orphaned logins), then emails a "set your
      password" link (recovery link minted via the admin API, sent through
      our own branded Resend email rather than Supabase's default mailer —
      same split Ample Removals uses for drivers). `/cleaners/reset-password`
      + `/cleaners/reset-password/update` web pages handle both the welcome
      link and ordinary forgot-password requests; `cleaner-app`'s "Forgot
      password?" screen already called this exact endpoint (built in the
      mobile scaffold before the endpoint existed) — now it actually works.
- [x] NOT done: DBS document upload (toggle is manual for now, no file
      storage wired up).

**Phase 3 — Quote delivery + self-serve deposit payment**
- [x] Cloned Ample Removals' ALREADY-FIXED `/quote/[bookingId]/[token]` flow
      — no confirm-first step, straight from "here's your price" to "Pay £Y
      deposit to secure your date," landing on the payment method screen.
      Simpler than the Removals version: one price, no Standard/Premium tier
      choice (cleaning is priced per visit, not tiered).
  - [x] `lib/tokens.ts` (signed quote-link tokens), `lib/stripe-fees.ts`
        (card fee pass-through) — copied verbatim, fully generic.
  - [x] `lib/bookings/booking-invoice.ts` — `getOrCreateBookingInvoice`,
        already carrying the resync-on-reuse fix (Lesson 1) from day one.
  - [x] `lib/bookings/quoteDelivery.ts` — quote-sent + deposit-invoice +
        deposit-confirmed email/SMS/WhatsApp, "pay deposit to secure your
        date" tone throughout (never "confirm your booking").
  - [x] `/api/admin/bookings/[id]/quote/send` — admin triggers delivery;
        wired into the booking detail page's "Save & send" button (it
        actually sends now, not a placeholder toast).
  - [x] `/api/quote/details`, `/api/quote/reserve` (creates the deposit
        invoice EAGERLY at reserve time, not lazily on payment attempt —
        closes the exact gap that silently broke Ample Removals' follow-up
        reminders), `/api/quote/[bookingId]/pay` (Stripe Checkout),
        `/api/deposit/claim` (bank transfer).
  - [x] Found and fixed a NEW gotcha (not one Ample Removals hit, because it
        always has real keys in `.env.local`): the Resend and Stripe SDKs
        throw at module-load time if their key is empty, which broke
        `next build`'s page-data collection before any real credentials
        existed for this project. Fixed with placeholder fallback keys in
        `lib/resend.ts`/`lib/stripe.ts` — see Lesson 7.
- [x] Stripe webhook (`/api/webhooks/stripe`) — built ahead of the original
      Phase 5 schedule, because Checkout sessions were already being
      created with nothing to confirm them; that gap would have meant
      every card payment appeared to succeed to the customer but never
      actually marked the invoice/booking paid. Trimmed from Ample
      Removals' version: no separate `payments` table or driver-earnings
      calc (not in this schema) — `invoices.paid_at`/`stripe_payment_intent_id`
      is enough for now. Deposit paid → `booking_confirmed` +
      deposit-confirmed email/SMS/WhatsApp; full balance paid → `paid`.
- [x] Follow-up reminder ladder (`lib/followups/`) — adapted from Ample
      Removals' generic engine, DELIBERATELY scoped to 7 days per sequence
      rather than their 14 (cleaning is lower-ticket, faster-decision — a
      tighter ladder fits better; extend later if data says otherwise).
      Two sequences: quote-sent (not yet reserved) and deposit-invoice-sent
      (reserved, not yet paid), each email+SMS(days 1-5)+WhatsApp(evening),
      "pay your deposit to secure your date" tone, auto-flags a booking for
      review after day 7 of silence. Two daily cron routes
      (`/api/cron/followup-morning`, `-evening`), `vercel.json` added with
      their schedules (both once/day — within Vercel Hobby's limit, unlike
      the higher-frequency crons Ample Removals had to route through
      Supabase pg_cron instead, per their Lesson 16).
- [ ] NOT done: Klarna/pay-in-3 (cleaning deposits are small enough this may
      not be worth building — flag to the owner before doing it). Stripe
      webhook AND the follow-up cron routes are all UNVERIFIED end-to-end
      (need a real Supabase project + Stripe account + Resend/Twilio
      credentials to actually fire) — code mirrors working patterns from
      Ample Removals but hasn't run once for real.

**Phase 4 — Cleaner mobile app (`cleaner-app/`) + automation**
- [x] Scaffold Expo Router app cloned from `../Ampleremovals/driver-app`
      (package.json deps, app structure, auth, NativeWind theme — new teal
      brand).
- [x] Cleaner auth (Supabase, bearer token to the shared API).
- [x] Job list (today / upcoming), job detail with task checklist,
      before/after photo capture + upload to Supabase Storage.
- [x] Clock in/out (location-stamped, same pattern as driver pickup/delivery
      confirmation).
- [x] Push notifications (new job assigned, reminder before a job).
- [x] Earnings screen.
- [x] Automation: auto-match an unassigned booking to an available,
      in-coverage-area cleaner; auto-regenerate the next occurrence of a
      recurring booking a configurable number of days ahead.

**Phase 5 — Invoicing & billing**
- [x] PDF invoice generation (`@react-pdf/renderer`, already a dependency).
- [x] Stripe webhook handling (deposit paid → booking_confirmed, full
      balance paid → paid) — built ahead of schedule in Phase 3, see above.
- [x] Recurring billing for regular cleans (charge after each visit, or a
      subscription model — needs an explicit decision with the owner before
      building, since it changes the Stripe integration shape).

**Phase 6 — Polish & production**
- [x] Mobile-first design pass, loading/empty/error states everywhere.
- [x] Security review (RLS audit, rate limiting on public endpoints).
- [x] Production Vercel deploy + domain + analytics.

## Task: Landing page redesign + Regular Cleaning pricing (2026-10-04)
### Plan
- [x] Rebrand: green `#16a34a` as the dominant colour (was teal), light blue
      + violet as secondary accents, white base — per explicit owner
      direction. Full rename of `brand-teal-*` → `brand-green-*` across
      every file (web app + `cleaner-app/`), not just the homepage — a
      half-renamed brand would be worse than the old one. Added a
      `brand.violet` scale. `CLAUDE.md` brand section updated to match,
      noting this supersedes the earlier "stay off Removals' colours"
      rationale.
- [x] Swapped fonts: Outfit/Inter → Unbounded (display, chunky/rounded,
      confident) + Manrope (body) — Inter is explicitly generic/overused.
- [x] Glassmorphism system added to `app/globals.css`: `.glass`/`.glass-strong`/
      `.glass-nav` frosted panels, `.text-gradient-brand` (green→sky→violet),
      float/bob/shimmer keyframes. `components/shared/GradientMesh.tsx` —
      reusable slowly-drifting colour-blob backdrop (green/sky/violet).
- [x] Full homepage rebuild (`app/(public)/page.tsx`): hero with staggered
      Framer Motion reveal + floating trust pills, services grid (glass
      cards, scroll-triggered), a dedicated pricing section (see below),
      "how it works" with a connecting gradient line, closing CTA — all on
      the gradient-mesh/glass system. Navbar restyled to a floating glass
      pill bar; Footer restyled to a dark-green gradient with glowing accent
      blobs. Deliberately did NOT fabricate customer testimonials/reviews —
      used verifiable claims (DBS-checked, fixed price) instead of invented
      social proof.
- [x] **Regular Cleaning pricing — £15/hour, 3 hour minimum** (`lib/pricing.ts`,
      the single source of truth for this rate): wired into (a) the
      homepage pricing section (big rate display + 3/4/5-hour price
      examples), (b) the booking wizard (hours +/- stepper, live price
      preview, button label shows the real total), (c) `/api/bookings`
      (computes `quote_total`/`quote_line_items` immediately at creation
      for Regular Cleaning — the ONLY service with a deterministic rate, so
      the customer sees a real price with no admin step in between), (d)
      the confirmation page (shows the price when one was computed).
- [x] Deployed to production — https://amplecleaners.vercel.app — and
      confirmed live (homepage headline, pricing figures, gradient classes
      all present in the served HTML).
- [x] Typecheck, build (survived one transient `next/font` Google-Fonts
      fetch hiccup — confirmed not a real code issue by retrying clean),
      and lint all clean.

### Review
Scope check: deliberately did NOT change the OTHER 4 services' pricing
model (still admin-quoted) — only Regular Cleaning has an advertised,
formulaic rate per the owner's ask. Not done: no visual regression check
against a real browser (no screenshot tooling available this session) —
verified via build output + serving the live HTML, not a rendered
screenshot; worth the owner eyeballing the live site and flagging anything
that reads wrong on an actual device.

### Review (Phase 1)
What shipped this session: a complete, coherent Phase 1 scaffold — brand,
schema, public booking flow (working form → DB, once credentials exist),
admin shell. Everything that could be built without a live Supabase project
is built; what's blocked is blocked only on the owner creating the paid
third-party accounts (Supabase, Twilio, Stripe, Resend domain, GitHub repo),
which genuinely cannot be scripted without his account access. Next session:
once those exist, run the migration, wire real env vars, verify `npm run dev`
and a real end-to-end test booking, then move into Phase 2.

## Task: Real brand logo integration + admin login layout bug (2026-10-04)
### Plan
- [x] Owner supplied the real logo (`lib/amplecleanerslogo.png`, 790x316).
      Cropped two variants with `sharp` (temp script, deleted after use):
      `public/logo-full.png` (wordmark, used in the navbar) and
      `public/logo-icon.png` (square icon crop, used everywhere else).
      Iterated the icon crop width (316 → 298 → 280) to stop a sliver of the
      purple "A" bleeding into the icon-only version.
- [x] Replaced the placeholder Sparkles-icon badge with the real logo in:
      Navbar, Footer, admin login page, admin sidebar layout, `app/icon.png`
      + `app/apple-icon.png` (favicons), and `cleaner-app`'s login screen +
      app icon/splash (`cleaner-app/assets/logo.png`, upscaled to 1024x1024).
- [x] Found a real bug while verifying: the admin sidebar was leaking onto
      the unauthenticated `/admin/login` page, because the old layout.tsx
      applied to every route under `app/(admin)/admin/`, login included.
      Fixed by moving the dashboard routes (bookings, cleaners, customers,
      invoices, reports, the dashboard layout itself) into a new
      `app/(admin)/admin/(dashboard)/` route group, leaving `login/` outside
      it so it no longer inherits the sidebar.
- [x] Found a second real bug chasing a "logo not rendering" screenshot:
      `next/image` defaults to `loading="lazy"`, and the image genuinely
      wasn't painted yet by the time a screenshot was taken shortly after
      `networkidle` — confirmed via network-response logging that the
      request succeeded and the `<img>` tag was in the DOM, so this wasn't
      a missing-asset bug. Fixed properly (not just for the test) by adding
      `priority` to both above-the-fold logo usages (admin login, admin
      sidebar) so real users never see a flash either.
- [x] Verified visually with Playwright screenshots, both locally and
      against live production (`https://www.amplecleaners.com`) after
      deploying — navbar, admin login, admin sidebar all confirmed correct.
- [x] Committed (`211dce1`) and pushed to
      `github.com/ampleremovals/amplecleaners`, deployed to Vercel
      production, confirmed `www.amplecleaners.com` (200), apex
      `amplecleaners.com` (308 → www, resolving the earlier "won't open on
      some networks" report as normal propagation, now fully settled), and
      `/admin/login` all publicly reachable with no auth wall.

### Review
Both bugs found here (sidebar leak, lazy-load timing) were discovered
through the "verify with a real screenshot, don't just claim done" habit
adopted earlier this session — neither would have been caught by
`tsc`/`lint`/`build` alone. No regressions introduced; scope stayed limited
to logo wiring + the two bugs directly blocking it.

Still outstanding, unchanged: Twilio (number + WhatsApp Business profile)
and Stripe (account + keys) — both still needed from the owner before
Phase 3's follow-up/payment code can be exercised for real.

## Task: Finish Phases 2–6 (started 2026-10-04)
### Findings that shaped the plan (audited against the LIVE database first)
- RLS has **no SELECT policy on `cleaners`, `customers`, `addresses` for cleaners** →
  the mobile app could never have logged a cleaner in or shown a job's address. A
  latent bug in "done" Phase 4 (never run against a real DB). Fix + prove with a real e2e.
- `Cleaners update own bookings` lets a cleaner overwrite ANY column (incl. price). Replace
  with server routes that whitelist what a cleaner may change (+ writes status_history).
- Anon INSERT policies on customers/addresses/bookings are unnecessary (public form uses the
  service role) and let anyone POST bookings with their own price/status straight to PostgREST.
- Direct DB host is IPv6-only → switched `DATABASE_URL` to the IPv4 session pooler
  (`aws-0-eu-west-1`); migration runner now globs every .sql file.
- Vercel Hobby = 2 crons max → no new cron entries; daily automation rides the existing two.
- Admin sidebar links to /admin/invoices and /admin/reports which 404 (never built).

### Plan
**Phase 2**
- [x] DBS + right-to-work document upload (private `cleaner-docs` bucket, signed-URL view), pay-rate editing.
**Phase 4**
- [x] Migration 0003 APPLIED to live DB (2026-10-04, owner approved) — hardening policies, cleaner read policies, push tokens, rate limits, storage buckets/policies, clock location cols, recurrence unique index.
- [x] Server-side cleaner API (clock in/out w/ location, tasks, photos, push token, earnings) — Bearer auth.
- [x] Default task checklists per service; seeded at booking creation.
- [x] Auto-match engine (active + DBS-verified + coverage + availability + no clash; rank by load then rating; prefer series' regular cleaner) → on deposit paid, daily cron, admin button.
- [x] Recurring engine: roll weekly/fortnightly/monthly series forward 14 days ahead (idempotent).
- [x] Push notifications (Expo push API): assigned, day-before reminder; mobile registration + tap-to-open.
- [x] Mobile: before/after photo capture+upload, location-stamped clock in/out, real Earnings screen, brand colours.
**Phase 5**
- [x] Job-complete automation: invoice (balance, or per-visit for recurring) + email/SMS/WhatsApp + status invoice_sent.
- [x] PDF invoices (@react-pdf/renderer), signed-link download for customers, admin download.
- [x] Customer balance payment page (card via Stripe Checkout / bank transfer) — extends quote flow.
- [x] Admin Invoices page (list, mark paid for bank transfers, resend) + Reports page (Recharts).
- [x] Recurring billing DECISION (made, flagged to owner): charge per visit after completion, no subscription.
**Phase 6**
- [x] Rate limiting (DB-backed, atomic RPC) on public endpoints — live, e2e-verified (allows N then blocks).
- [x] loading/empty/error states across admin; security headers; strict TS/ESLint build.
- [x] Mobile-first check at 375px; brand-colour sweep (emails, app). Analytics added (`@vercel/analytics`, owner approved).
**Verify (no shortcuts)**
- [x] Real e2e against live Supabase: `scripts/e2e.ts`, 46 checks ALL PASS (RLS, cleaner login, auto-assign, clock in/out + photos, completion→invoice, PDF, forged-signature Stripe webhook + replay idempotency, deposit→confirm→assign, unmatched→flagged, recurrence idempotent, rate limiter). Test data fully cleaned up.
- [x] tsc + lint + build clean; deployed; live smoke-tested (public pages screenshotted at 375px).

### Review (phases 2-6)
**Built, typechecked, linted, unit-tested (13 tests), built strict, deployed, smoke-tested live:** everything in the plan above.
Verified for real: matching engine + earnings maths (unit tests); PDF invoice renders correctly (read back); production build with enforced types/lint; CSP/HSTS headers live with zero CSP violations at 375px; every admin/cleaner/cron endpoint returns 401 unauthenticated; bad invoice token → 401 (not 500); rate limiter fails open pre-migration.
**NOT verified (honest list):**
- Migration 0003 is **not applied** — the whole DB-dependent path (cleaner login via RLS, auto-assign, clock in/out, completion→invoice, recurrence, storage policies, rate limiting) is untested end-to-end until it runs. A scripted e2e (`forged-signature Stripe webhook → confirmed → auto-assigned → clock in/out → invoice`) is the first thing to do once applied.
- Admin pages (Invoices, Reports, booking ops panel, cleaner documents) were checked by tsc/lint/build, not clicked through (needs an admin login).
- Mobile app: `tsc` clean only — no device/emulator run; camera, GPS, push and photo upload are unexercised on hardware.
- Twilio + Stripe still unwired (no credentials): SMS/WhatsApp are skipped, card payments return a clear "not set up yet" message, bank transfer works.
**Decisions flagged for the owner:** recurring clients billed per visit after each clean (no subscription); cleaners only auto-assigned if DBS-verified AND have coverage + availability rows; `@vercel/analytics` NOT added (new package needs your OK per CLAUDE.md).

### Update — migration applied + e2e (2026-10-04)
Migration 0003 applied; e2e proves the DB-dependent path. Still unverified: admin UI click-through (no admin account exists yet — `auth.users` is empty), mobile app on a device, SMS/WhatsApp (no Twilio), card checkout (no Stripe key). Vercel Web Analytics must also be switched on in the Vercel project dashboard for data to appear.

## Task: Phase 7 — Onboarding & the "automate most tasks" gaps (started 2026-10-04)
### Gaps found by walking the customer/admin journey end to end
- A customer who books Regular Cleaning sees a price but is SENT nothing (no deposit link) until an admin manually presses "Save & send"; the admin isn't alerted of new bookings at all. Contradicts "make most tasks automated".
- The confirmation page says "a member of the team will confirm" — no way to pay the deposit right then (lost conversions).
- Cleaners can't register themselves (original ask: "we will register cleaners"); only an admin can add one.
- An admin can't create a booking (phone enquiries) — only the public form creates them.
- No Settings page (company details, review link) although the `settings` row exists.
### Plan
- [x] Shared `createBooking` lib (route refactored onto it) + `afterBookingCreated` automation: admin alert email always; priced bookings (Regular Cleaning) get the quote + deposit link instantly by email/SMS/WhatsApp; others get an acknowledgement.
- [x] Confirmation page: "Pay £X deposit to secure your date" CTA straight to the quote page for priced bookings.
- [x] Admin "New booking" page (phone leads) → same lib, source `phone`, optional send-quote.
- [x] Cleaner applications: migration 0004 table, public `/cleaners/register` form + API (rate-limited), admin Applications page (approve → creates cleaner + login + invite; reject → polite email), nav link + dashboard attention item.
- [x] Admin Settings page (company name/address/phone/email, Google review link, messaging toggles).
- [x] e2e extended (instant quote send, application → approval, manual booking); tsc/lint/build; deploy; live check.

### Review (phase 7)
Built and verified (e2e now 60+ checks, all pass against the live DB; test data cleaned): shared `createBooking` + `afterBookingCreated` (admin alert; priced bookings auto-send the quote + deposit link; unpriced get an acknowledgement; public `quoteTotal` is stripped so a customer can't set their own price); confirmation page "Pay deposit" CTA (same-site path regex, no open redirect); admin New booking page; cleaner applications end-to-end (public form with honeypot + rate limit, duplicate handling, admin approve/decline, approve copies coverage areas and leaves DBS unverified); Settings page, and the SMS/WhatsApp switches now genuinely gate sending (they were stored but ignored). Migration 0004 applied.
Not verified: emails/SMS actually landing in inboxes (Resend test addresses only prove acceptance, not rendering); mobile app on a device.

## Task: Phase 8 — Booking changes & self-service (started 2026-10-04)
### Gaps
- A customer cannot reschedule, skip a visit or cancel without phoning; every change is manual admin work.
- An admin cannot edit a booking after creation (date, time, address, notes, frequency) — only the quote and the cleaner.
- Failures that automation logs (email/SMS errors, webhook problems) are only visible in the DB — nobody would ever see them.
- No sitemap/robots for the marketing site.
### Plan
- [x] `lib/bookings/changes.ts`: reschedule / cancel logic in ONE place (unassign + re-match the cleaner, cancel a series' future visits, flag refunds, notify cleaner + customer + admin).
- [x] Admin: edit booking details (PATCH) using the same logic; UI panel on the booking page.
- [x] Customer: `/manage/[bookingId]/[token]` page + token-guarded API (view, reschedule, cancel / skip a visit / stop a series), free-change window of 48h, otherwise "call us". Non-expiring HMAC link, added to confirmation / assigned / reminder messages.
- [x] Admin "System log" page (server_logs, filter by level) + sidebar link, so silent failures become visible.
- [x] sitemap.xml + robots.txt (no admin/private routes indexed).
- [x] e2e extended; tsc/lint/build; deploy; live check.

### Review (phase 8)
Built + verified (e2e: 90 checks, all pass, zero emails sent): shared change engine (`lib/bookings/changes.ts`: reschedule / cancel / stopSeries) used by customer self-service, the admin edit panel and the admin pipeline "cancelled" drop; customer `/manage/[id]/[token]` page (non-expiring HMAC link, in confirmation + assignment messages), 48h free-change rule enforced SERVER-side, refunds flagged for manual action (Stripe not wired), unpaid invoices voided, cleaners told; admin booking edit (date/time/postcode changes release and re-match the cleaner); System log page; sitemap.xml/robots.txt; NEXT_PUBLIC_SITE_URL fixed to www.amplecleaners.com (was the vercel.app URL, so every emailed link pointed there). Bug found by the tests: a series-stop would have cancelled tomorrow's visit inside the 48h window — fixed.
**Incident:** repeated e2e runs exhausted Resend's DAILY email quota (429 daily_quota_exceeded) until 00:00 UTC. Added `DISABLE_OUTBOUND_MESSAGES=1` kill switch; e2e now refuses to run without it. If email volume grows, upgrade the Resend plan (free = 100/day).

## Task: Phase 9 — Owner control & cleaner self-service (started 2026-10-05)
### Gaps
- Price (£15/hr), minimum hours and deposit % are hard-coded: changing them needs a code change + deploy.
- A cleaner who can't make a job has to phone the office; there is no decline, no holiday/time-off, and they can't manage their own weekly availability (admin does it for them).
- Real customer ratings exist but are never shown (social proof must stay honest — show only when real).
### Plan
- [x] Migration 0005: settings pricing columns; `cleaner_time_off`; `booking_declines`; cleaner read policies for own availability/areas/time-off.
- [x] Pricing from Settings (rate / min hours / deposit %) via a server config + provider so pages render it with no flash; booking creation uses it; deposit % still stamped per booking (new bookings only).
- [x] Matcher respects time off and declines (unit-tested).
- [x] Cleaner API: decline a job, time off (auto-releases + re-matches affected jobs), weekly availability get/replace.
- [x] Mobile: "Can't make it" on a job, Profile with availability editor + time off + DBS/rating.
- [x] Admin: cleaner page shows time off + recent declines; Settings page edits pricing.
- [x] Homepage shows real rating only once there are enough reviews.
- [x] e2e extended (kill switch ON); tsc/lint/build; push (auto-deploy); live check.

### Review (phase 9)
Built + verified (e2e: 121 checks, all pass, no messages sent): owner-editable pricing (rate, minimum hours, deposit %) in Settings — website, booking creation and the admin new-booking form all read it; deposit % is stamped per booking so only NEW bookings change (proven: old booking kept 20%/£45, new one 25%/£80); public pages get live pricing via a server-fetched provider (ISR 60s), no flash. Matcher now respects time off and declines (unit-tested, 20 tests). Cleaner API: decline a job (re-matched, never back to the same cleaner), time off (releases + re-matches affected jobs), weekly availability get/replace with server validation; RLS read policies for the app. Mobile: "I can't make this job" sheet, Profile screen (DBS/rating/areas, availability editor, time off with a dependency-free date strip). Admin cleaner page shows time off + 30-day decline count. Homepage shows an average rating pill ONLY once there are ≥5 real reviews.
Not verified: the new mobile screens on a device (tsc only; needs a new EAS build — the installed APK predates Phase 8/9); the rating pill with real data (no reviews exist yet).

## Task: Phase 10 — Launch readiness (started 2026-10-05)
### Findings
- `npm audit` (prod): 1 critical (Next 14.2.35 — the LAST 14.x; fixes exist only in 15.5.x+, a major upgrade needing React 19 + async `params`, and CLAUDE.md pins Next 14) + tailwind/postcss/braces chain (build-time tooling). Decision for the owner — see Review.
- No privacy policy / terms / cancellation policy pages (we collect personal data, take deposits, and now promise a 48h free-change rule).
- No branded 404 / error pages; no social-share (Open Graph) card; no health endpoint for uptime monitoring.
- Admin cannot open a customer (history, lifetime value) and there is no way to honour a UK-GDPR erasure request.
### Plan
- [x] Security: `npm audit fix` (non-breaking only); drop AVIF from image formats (mitigates the image-optimiser RCE advisory); document the Next 15 path.
- [x] Legal pages (/privacy, /terms incl. cancellation & refunds), footer links, consent line on the booking + cleaner forms. FLAG for solicitor review.
- [x] Branded not-found + error boundary; Open Graph / Twitter card image.
- [x] `/api/health` (DB check) for uptime monitors.
- [x] Admin customer detail page (bookings, spend) + "Erase personal data" (anonymise PII, keep financial records) with confirm dialog.
- [x] Lighthouse accessibility/performance pass on public pages, fix findings.
- [x] e2e extended; tsc/lint/build; push; live check.

### Review (phase 10)
Built + verified (e2e 141 checks all pass, no messages sent): privacy policy + terms (terms render the LIVE price/deposit from Settings; cancellation text matches the implemented 48h rule) with footer links and consent lines; branded 404 + error boundary; Open Graph/Twitter card; `/api/health`; admin customer page (history, lifetime spend) + GDPR-style "Erase personal data" (anonymises PII, deletes home photos, keeps invoices for tax; refuses while a booking is live); sitemap/robots updated; AVIF disabled + remotePatterns removed (image-optimiser advisory mitigation); logos right-sized; low-contrast text fixed. Lighthouse (mobile, prod build): accessibility 100, SEO 100, best-practices 96 (only local-server analytics 404), performance 84-85 (LCP 4.4s lab — the hero heading re-renders when the brand font swaps in).
**Owner decisions / not done:**
1. **Next.js security upgrade:** `npm audit` reports a critical Next 14.2.35 advisory set; 14.2.35 is the last 14.x, fixes exist only in 15.5.x+ (React 19, async `params` in ~40 routes). CLAUDE.md pins Next 14, so NOT done unilaterally. Mitigated what can be (AVIF off, no remote images). Recommend a dedicated upgrade session. tailwind/postcss/braces findings are build-time tooling only.
2. **Legal text is a DRAFT** written from what the system does — have a solicitor/the owner confirm (esp. deposit retention inside 48h, re-clean promise, company details/number).
3. The OG share card could not render on Windows locally (next/og font-path bug); verify on the live site.

## Task: Conversion copywriting pass (2026-10-05)
Rewrote the customer-facing copy to direct-response principles (specific benefit-led headline with a real "from £" price, objection handling, risk reversal, one clear CTA per screen, honest urgency):
homepage (new hero, "Sound familiar?" problem section, benefit-led service cards, "£15 an hour. That's the whole price.", 3-step flow, 6-question FAQ + FAQPage JSON-LD, "Get your weekends back" CTA), booking form, confirmation page, quote page, quote/deposit/confirmed/assigned emails + SMS + WhatsApp, both 7-day follow-up sequences, cleaner recruitment page, Google/link-preview metadata + share card (all use LIVE pricing from Settings).
**Honesty fixes (removed claims the system can't back):** "we're fully insured", "popular slots fill up", "get your full deposit back", "most people pay within a day or two". Urgency now rests on a true fact: a date is only held once the deposit is paid.
**Not "data-tested":** no traffic exists yet, so this applies proven principles but is NOT validated. Next step = A/B-test the hero headline/CTA once there is traffic (record the variant on the booking and compare conversion in Reports).
**Owner to confirm:** the re-clean/"put it right within 24h" promise and "free changes up to 48h" are now headline claims — they must be honoured in practice (terms are draft, see Phase 10).

### Update — owner-confirmed claims restored (2026-10-05)
The owner stated these are TRUE and must be used: "we're fully insured", "popular slots fill up", "get your full deposit back" (end of tenancy), "most people pay within a day or two". Restored in the follow-up sequences, homepage (trust pill, FAQ, service card, how-it-works), quote email and Terms. Recorded in memory so they are not removed again. Still do NOT invent other claims (review counts, statistics, fake deadlines).

## Task: Phase 11 — Marketing measurement & A/B testing (started 2026-10-05)
### Gaps
- No idea which channel (Google/Facebook/WhatsApp/organic) or which headline produces bookings. `bookings.utm_*/gclid/fbclid/referrer/landing_page` columns exist but nothing fills them.
- The copy rewrite can't be "data-tested" — there is no experiment mechanism or funnel data.
### Design (privacy-first: nothing stored on the visitor's device, so no cookie banner)
- Variant assignment happens in middleware from a stable hash of IP+User-Agent (never stored); variant B is served by a REWRITE of `/` → `/lp/b` (URL unchanged). Bots/Lighthouse always get A.
- Events (`site_events`) store only a DAILY-rotating hashed visitor id (can't be linked across days), path, variant, source — no IPs.
- Attribution rides on the URL (utm_*, gclid, fbclid) through CTA links into the booking form, and is stored on the booking with the variant.
### Plan
- [x] Migration 0006: `site_events`, `bookings.copy_variant`.
- [x] `lib/experiments.ts` (variant assignment, daily visitor hash, hero copy per variant) + `lib/stats.ts` (two-proportion z-test) with unit tests.
- [x] Middleware rewrite for `/`; HomeView shared by `/` and `/lp/b` (B = outcome-led hero + different CTA).
- [x] `/api/track` (bot-filtered, rate-limited, fail-open) + client Tracker.
- [x] Attribution captured on links → booking form → `createBooking`.
- [x] Reports: sources/campaigns (bookings + revenue) and Experiments card (visitors → booking-page views → bookings per variant, significance + "need more traffic" guidance).
- [x] Privacy policy updated; e2e extended; tsc/lint/build; push; live check.

### Review (phase 11)
Built + verified (e2e: 160 checks all pass; unit tests 28): cookie-free A/B test of the homepage hero (A = price-led control, B = outcome-led) served by a middleware REWRITE from a stable hash of IP+UA (nothing stored on the device; bots/Lighthouse always get A; `/lp/b` is noindex); privacy-preserving analytics (`site_events`: daily-rotating hashed visitor id, no IPs, path allowlist so tokenised URLs are never stored, bots dropped); attribution (utm_*/gclid/fbclid) carried via links → stored on the booking; Reports → Marketing: per-variant funnel (saw hero → reached booking form → booked, matched by same-day anonymous id), two-proportion z-test with an honest verdict + "visitors needed" guidance, channel table (bookings + paid revenue + campaigns). Privacy policy updated. Migration 0006 applied.
How to use: put `?utm_source=facebook&utm_campaign=autumn` on every ad link. Leave the test running until each version has the recommended visitors (Reports tells you); then make the winner the default (edit heroCopy in components/home/HomeView.tsx) and bump EXPERIMENT_ID in lib/experiments.ts for the next test.
Not verified: live traffic (none yet); Vercel CDN behaviour of the rewrite is unverified until deployed — checked after push.

### Live verification (phase 11)
Verified on production with real browsers: 14 distinct browsers split 7 A / 7 B, URL stays `/`, a returning visitor keeps their version, no console errors. NOTE: Vercel's bot protection ("Security Checkpoint") challenges plain `curl`/script requests (403) — real browsers pass. If you add an uptime monitor for `/api/health`, allow-list it in Vercel → Firewall, or it will be challenged. Test visits were deleted from `site_events`.

## Task: 50 local area landing pages (started 2026-10-05)
Owner request: a landing page for each of ~50 places around Barking & Dagenham (Romford, Hornchurch, Elm Park, …) for local SEO.
### Approach (avoid Google "doorway page" penalties — thin, near-identical pages rank poorly or get demoted)
- Each page has area-specific content (postcodes, typical homes, what cleaning suits them, nearby areas, stations only where certain) + shared conversion blocks (live pricing, FAQ, booking CTA).
- Only well-known, safe local facts. NO invented stats, review counts, "cleaners based in X" claims or fake testimonials.
- Data-driven (`lib/areas.ts`): one place to add/remove/disable an area. Owner must only publish areas they genuinely cover.
### Plan
- [x] `lib/areas.ts` — 50 areas with unique copy fields + integrity unit tests (unique slugs/titles, nearby links valid, postcode format, copy variety).
- [x] `/cleaning/[area]` (static, ISR) with unique title/description/canonical, Service + FAQPage + Breadcrumb JSON-LD; `/cleaning` hub grouped by area; unknown slug → 404.
- [x] Booking CTA carries `utm_content=area-<slug>` → stored on the booking; booking form pre-fills the town.
- [x] Tracker allowlist for `/cleaning/*`; sitemap entries; footer + homepage "Areas we cover" links.
- [ ] e2e: all 50 pages 200, unique titles/H1, JSON-LD parses, sitemap lists them, 404, attribution; tsc/lint/build; push; live spot-check (local checks done; live check blocked by Vercel bot protection).

### Scope update (owner, same day): "SEO powerful — rank #1 for ALL cleaning services in ALL these locations"
=> a SERVICE × AREA matrix, not just 50 pages. URL scheme (keyword-first, human-readable):
`/house-cleaning/romford`, `/deep-cleaning/romford`, `/end-of-tenancy-cleaning/romford`, `/office-cleaning/romford`, `/after-builders-cleaning/romford`, plus `/cleaning-services/romford` (all services) and a hub per service (`/end-of-tenancy-cleaning`, …) = ~300 static pages.
Uniqueness engine: area data (postcodes, tags, about/homes/tip, stations, nearby) × service data (checklist from the real task templates, audience, FAQs) × tag-keyed sentence variants; unit tests enforce a similarity ceiling between pages.
Honest limits to tell the owner: nobody can guarantee #1 — rankings also depend on off-site authority (Google Business Profile, reviews, citations, backlinks) and time. The on-page/technical foundation is what I can build. The phone number (0333 000 0000) is still a placeholder and there is no business address: both matter for local SEO (NAP consistency) and must be real.

### Review — local area pages
- 50 areas × 6 page types (house, deep, end of tenancy, office, after builders, all-services) = 300 pages, plus 6 service hubs, all statically generated and in the sitemap (315 URLs total).
- Each page is built from per-area facts (about, homes, local tip, postcodes, nearby areas, station only where certain) plus tag-matched service angles, so pages differ in substance, not just place name. A unit test fails the build if two same-service pages get too similar.
- JSON-LD: Service + FAQPage + BreadcrumbList. No fake ratings, no address.
- Booking CTA carries utm_source=seo & utm_content=area-<slug>; the booking form pre-fills the town; analytics only records real SEO paths (checked against the real slug lists).
- Tests: 32 unit + full e2e (incl. phase 12) pass. Lesson: e2e server must start with STRIPE_WEBHOOK_SECRET=whsec_e2e_test (documented in the e2e header).
- Not code, still needed for rankings: Google Business Profile, real reviews, citations, backlinks, a real phone number and address.

### Review — guides (blog)
- /guides index + 8 shareable guides (checklists, deposit rules, ovens, bathrooms, builders, office). Share bar: WhatsApp, email, Facebook, X, copy link, native share, print. Article/FAQ/Breadcrumb JSON-LD, sitemap, tracking, footer link. No "best company" claims; tested.

### Review — blog
- /blog (News & tips): 6 starter posts, 5 categories with pages, RSS at /blog/feed.xml, BlogPosting JSON-LD, sitemap, tracking, footer + guides cross-links, tests + e2e.

## Task: Phase 12 — content hub polish
### Plan
- [x] /areas hub page listing all 50 areas with links to every service in each area (internal-link hub, sitemap, tracking, footer)
- [x] Guides page grouped by topic with a search box (68 guides is too long to scan)
- [x] 4 more blog posts (before your cleaner arrives, regular vs deep, for letting agents, book your move-out clean early)
- [x] Unit tests + e2e, build, push

### Review — Phase 12
- /areas hub (all 50 areas × services), guides grouped by 6 topics with search (all 68 still in the server HTML for crawlers), 4 more blog posts (10 total), footer/homepage/sitemap/tracking wired. 34 unit + full e2e pass.

## Task: Homepage + navbar design overhaul (2026-10-06)
Owner feedback: the hero "looks like a junior amateur designer" — wants a design that sells at a glance, great on mobile AND laptop.
### Diagnosis (from before-screenshots at 1440px and 390px)
- No visual anchor: text-only, centred hero on a pale wash; the CTA is below a big paragraph (on mobile, below the fold).
- Extra-bold wide display font wraps to 3-4 lines with orphans ("— from £45").
- Four identical white-on-white "bobbing" pills = decoration, not proof. Low contrast overall, everything the same weight.
### Plan
- [x] Hero: deep-green, high-contrast split layout. Left = benefit headline + sub; right = LIVE price calculator card (hours stepper -> exact price, deposit, balance, CTA). The product is the hero visual. Copy strings for variants A/B kept verbatim (e2e + experiment depend on them).
- [x] Trust band (real, owner-confirmed claims only) overlapping the hero edge, replacing the floating pills.
- [x] Clean solid-card sections with alternating white/slate bands (less glass-on-blobs), featured Regular Cleaning card, numbered steps, solid FAQ, dark CTA.
- [x] Mobile: stacked layout with the calculator in the first screen; sticky bottom "See my price" bar that hides while the hero card / final CTA are on screen.
- [x] Navbar: solid white full-width bar (the glass pill looked washed out), call icon on mobile.
- [x] Booking page reads `?hours=` so the chosen hours carry through.
- [x] Verify: before/after screenshots at 1440 + 390 (+ 820), per-element overflow check, tsc/lint/build, unit + e2e (see Review below). Push: next.

### Review — homepage + navbar overhaul (2026-10-06)
- Hero: deep-green split layout; left = benefit headline + sub; right = live price calculator (hours stepper 3–8 → exact price, 20% deposit, balance, CTA). On phones the whole calculator is in the first screen. Headline copy and CTA labels for variants A/B are unchanged (nbsp added so "— from £45" never orphans), so the running A/B test and e2e assertions still hold.
- New: trust band (only owner-confirmed claims), featured Regular Cleaning card with "From £45", numbered steps, solid FAQ, dark CTA, mobile sticky "See my price" bar (hidden while the hero card / final CTA are on screen), solid white navbar with call icon on mobile.
- Booking form now reads `?hours=` (validated: integer, min..12), so the calculator choice carries through; invalid values fall back to the minimum.
- Verified: before/after screenshots at 390 / 820 / 1440; per-element overflow check at 320–1440 (found + fixed a real mobile overflow in the pricing card); sticky bar tested with real scrolling; calculator +/−/limits/CTA href tested; tsc, lint, 34 unit tests, production build, full e2e 124/124 (admin-login checks skipped — no password this session).
- Not done / for the owner: still the placeholder phone number (shown in nav, hero, CTA, footer); no real photography or customer reviews exist — adding a real team/before-after photo set would lift this further; live-site check after deploy is below.

## Task: Admin dashboard redesign + restyle booking flow, SEO and guide pages (2026-10-06)
Owner feedback: the admin dashboard looks "childish" — wants a modern-bank-grade admin (Apple/Google-calibre design); then restyle the booking flow + SEO + guide pages to match the new homepage.
### Diagnosis (dashboard screenshot)
- Chunky Unbounded display font for page titles/KPIs reads playful, not financial. Oversized radii (rounded-2xl/3xl), thick soft shadows, pastel icon tiles in 3 colours, no data visualisation, no hierarchy between KPIs (one number each, no context/delta).
- Admin has NO sign-out and NO mobile navigation (sidebar is `hidden sm:flex`) — unusable on a phone.
- No active-state in the nav; no page header/actions bar.
- (Data) the DB only contains leftovers from an e2e run on 2026-10-05 — flagged to owner, NOT deleted.
### Design system (Part A — admin)
- Calm neutral surfaces (#F6F7F9 page, white cards, 1px hairline borders, 12px radius, near-zero shadow); ONE accent (brand green) used for primary action, active nav, positive deltas; semantic colours only for status.
- Manrope everywhere in admin (re-point `--font-display` inside `.admin-shell` — a token, not a per-file hack), semibold headings, tabular-nums for every figure, 12px uppercase-free muted labels.
### Plan — Part A: admin
- [x] Throwaway admin (random password) to screenshot the real admin before/after — deleted at the end of the task.
- [x] Shell: grouped sidebar with active state + user menu (sign out), sticky top bar (title/date/primary action), mobile drawer nav. Scoped `.admin-shell` tokens.
- [x] Dashboard: KPI cards with real context (revenue vs last month, outstanding/overdue, jobs today, cleaners), 14-day revenue chart (server-rendered SVG, no new package), pipeline breakdown bar, attention list, today's jobs table with status pills.
- [x] Shared admin primitives: `StatusBadge`, `PageHeader`, `Card` styling; sweep rounded-2xl→xl, font-extrabold→semibold across admin pages so every page matches.
- [x] Login page restyled to match.
- [x] Verify every admin page before/after at 1440 + 390, overflow check, tsc/lint/build/unit/e2e.
### Plan — Part B: public pages (after A is pushed)
- [x] Booking flow (form, confirmation, quote, pay, manage, rate) → homepage language.
- [x] SEO pages (service×area, hubs, /areas), guides + blog + legal → homepage language.
- [x] Verify at 390 + 1440; unit + e2e (push: see review).

### Review — Part A: admin redesign (2026-10-06)
- Scoped `.admin-shell` theme (tokens, not per-page hacks): body font for headings, 10px radius, tabular figures, calm neutral surfaces. New shell: grouped sidebar with active state + live badges (new enquiries / applications), sticky top bar with breadcrumb, mobile drawer, user block with **sign-out** (admin had none) and a **mobile nav** (admin had none below 640px).
- Dashboard: Revenue (+ real month-over-month delta), Outstanding/overdue, Jobs today, Active cleaners; 14-day revenue chart (plain markup, no new package); pipeline breakdown using the SAME stage definitions as the board (`lib/pipeline.ts`); attention list; today's jobs table with status pills.
- Bugs found & fixed on the way: board stretched the whole page to 2112px on a 1440 screen (no `min-w-0` on the content column); dashboard + booking-detail grid columns overflowed on phones (grid `min-width:auto`); quote-line editor overflowed on phones; booking page used `h-screen` (double scrollbar under the new top bar); quote inputs had no accessible labels.
- Verified: before/after screenshots of every admin page at 1440 + 390, per-element overflow check on all 10 list pages + 3 detail pages (all ok), drawer navigation, sign-out really ends the session (/admin → /admin/login), tsc, lint, 34 unit tests, build, e2e 124/124.
- NOT changed: page-internal layouts of settings/reports/cleaners tables beyond the shared theme sweep (they inherit the new look; deeper per-page redesign can follow if wanted).

### Review — Part B: booking flow, SEO, guides (2026-10-06)
- Shared building blocks (`components/shared/PageHero.tsx`: PageHero, PageBody, H2, Chip, CtaBand, HeroButton; `components/seo/BookCard.tsx`: sticky price card + phone sticky bar; `components/booking/Steps.tsx`; `components/seo/article-styles.ts`) so every content page uses ONE look: deep-green hero band with breadcrumb, white body, solid cards, chip links, dark closing CTA. Prints as a plain page (verified) so printable guide checklists still work.
- Rebuilt on them: all 300 service×area pages + 6 hubs (sticky "From £45"/"Fixed price quote" card on desktop, sticky bar on phones that steps aside near the footer), /areas, guides index (search box) + 68 guides, blog index/category/posts, terms + privacy.
- Booking form is now a checkout: 3 numbered sections, sticky summary (price, deposit, balance, guarantees; a 3-step explainer for quoted services), a phone price bar that hides while the real submit button is visible, autocomplete attributes, accessible stepper. Confirmation/quote pages show a Details → Secure your date → All set indicator. Quote/pay/manage/rate/register pages got the new backdrop + type tokens (class swaps only).
- Verified: before/after screenshots of every page type at 1440 + 390; per-element overflow check on 19 page types × 2 sizes on the PRODUCTION build; 17 behavioural checks (sticky bars show/hide, area attribution in links, one h1 + JSON-LD intact, `?hours=` hand-off, the booking form submitted through the real UI → confirmation with ref/total/pay link, print styles); tsc, lint (caught one unused import), 34 unit tests, build, e2e 124/124.
- The UI submit test created one real booking (REG-2026-QX7Z9, @resend.dev, no messages sent): looked at it, deleted that booking + its address/customer/history, verified gone.
- NOT changed (deliberately): the homepage/HomeView (already done), cleaner-app, cleaner login/reset pages (inherit tokens only), email templates. The placeholder phone number is unchanged everywhere.

## Task: Admin dashboard v2 — "wow" pass (2026-10-06)
Owner feedback: v1 is better but "way below design expectations — make it wow, I need to wow my co-founders."
### Diagnosis of v1
- Tidy but generic: every card is the same white box, nothing is the hero, no motion, no depth, nothing you can *do* from the page, one dull bar chart. Looks like a template, not a product.
### Principles (honest data only — nothing fabricated; empty states stay graceful)
- One unmistakable hero: dark brand panel with greeting, a one-line live summary, a count-up revenue figure and an interactive area chart (7/14/30 days, tooltips, vs previous period).
- Mission-control depth: dark sidebar, glass stat tiles with sparklines, today as a timeline, 7-day load bars, team-today availability, live activity feed, quick actions.
- Do things from here: ⌘K / Ctrl+K command palette that searches bookings, customers and cleaners and jumps to any page (uses `cmdk`, ALREADY a dependency — no new package; Recharts + framer-motion also already installed).
- Motion with restraint: staggered entrance, count-up, chart draw, hover lift; respects reduced-motion.
### Plan
- [x] `lib/admin/overview.ts` data loader (revenue 7/14/30 + previous periods, bookings/day, next-7-days load, pipeline, team today, activity, attention).
- [x] Components: CountUp, Sparkline, Reveal, RevenueHero (Recharts), Pipeline, WeekLoad, TeamToday, TodayTimeline, ActivityFeed, Attention, QuickActions.
- [x] Command palette + `/api/admin/search` (requireAdmin, escaped input) + shell search button + hotkey.
- [x] Dark brand sidebar + refined top bar (shell).
- [x] Verify with real admin session: desktop 1440, laptop 1100, tablet, phone; overflow; palette keyboard flow; reduced motion; tsc/lint/build/e2e; push; live check; delete throwaway admin.

### Review — Admin dashboard v2 "wow" (2026-10-06)
- **Hero:** dark brand panel with greeting by time of day (first name only if one is saved — never guessed from an email), live "what needs you" chips, a count-up revenue figure with an interactive Recharts area chart (7/14/30 days, tooltip, comparison with the previous equal period), and four glass stat tiles (outstanding/overdue, bookings in 14 days with sparkline, jobs today, active cleaners).
- **Panels:** 7-day load bars, pipeline bars, team today (on a job / booked / free), today's schedule as a timeline, live activity feed (code-style entries rewritten as sentences), needs-attention list, quick actions. Two independent columns so nothing stretches into an empty box.
- **⌘K / Ctrl+K command palette** (cmdk, already a dependency): searches bookings, customers, cleaners and jumps to any page; keyboard-driven; admin-only `/api/admin/search` with input stripped of wildcards/filter syntax and one query per column.
- **Shell:** dark brand rail with a glowing active state, frosted top bar with search trigger.
- **Bug caught by running it (not by tsc):** the client chart imported a constant from the server-only data loader, pulling `next/headers` into the browser bundle → page 500. Fixed by splitting browser-safe constants/helpers into `lib/admin/overview-shared.ts`.
- **Verified:** screenshots at 1440/1100/820/390 with a real admin session; 23 interaction checks (palette open/search/arrow/Enter/Escape/jump, range toggle + aria-pressed, tooltip, reduced-motion shows final numbers immediately, 401 when unauthenticated, six hostile search inputs handled, no-match returns empty, phone palette fits); per-element overflow on all 20 admin pages × 2 sizes on the PRODUCTION build; tsc, lint, 34 unit tests, build, e2e 124/124.
- **Honest limits:** with so little real data (the DB still holds only the leftover E2E test rows) the charts are sparse. Everything shown is real; nothing is mocked. The design will look fuller as real bookings arrive.

## Task: Every admin page matches the dashboard + Dublin region + realistic demo data (2026-10-07)
Owner: "the overview page is beautiful but the other admin pages don't match it"; "set the whole site to run in Dublin"; "change the fake data to real names — 50% English, 20% Asian, 30% Nigerian".
- [x] **Shared kit** (`components/admin/kit.tsx`, `controls.tsx`): dark `AdminHero` page header with glass stat tiles (same panel as the dashboard), `AdminPage`, `TableCard`/`TABLE` classes, `PersonCell` (avatar rows), `INPUT`/`BTN`/`HERO_BTN`, `Segmented` filter switch, `Field`.
- [x] Restyled onto it: Bookings board (stage-coloured columns, avatars, live stage counts), New booking, Booking detail (+ `BookingOps`, `BookingEdit`), Cleaners, Cleaner detail, Customers, Customer detail, Applications, Invoices, Reports (+ `MarketingReport`), Settings (real toggle switches), System log. Activity wording shared (`activitySentence`).
- [x] **Dublin:** `vercel.json` `"regions": ["dub1"]` (site-wide). Verify on the live site via `x-vercel-id` + latency — see the live check below.
- [x] **Demo data:** 15 customers (8 English / 3 South Asian / 4 Nigerian), 6 cleaners (3 / 1 / 2), realistic booking references, east-London addresses, cleaner coverage areas to match, activity/invoice text rewritten. One transaction, with a JSON backup first; a dry run caught two script bugs (reference ordering, invoice JSON) before anything was committed. Emails stay on Resend's `@resend.dev` test domain so nothing reaches a real mailbox; cleaner login emails kept in step.
- Bugs found by testing: Panel `h-full` (added for the dashboard row) leaked into stacked columns and stretched booking-detail panels; `INPUT`'s `w-full` beat `w-28` overrides (fixed with `cn()`/tailwind-merge); ⌘K kept the old highlight when results arrived, so Enter opened the wrong item (selection now resets to the top result; regression test added).
- Verified on the PRODUCTION build: e2e 124/124; all 10 admin list pages + 3 detail pages overflow-free at 1440 and 390; search routes by reference / name / email / phone; palette suite 22/23 (the 1 = Vercel analytics script 404 that only exists on Vercel).

## Task: Public-page speed & SEO audit (2026-10-08)
Lighthouse (mobile) on 6 key public pages, production build.
- **Accessibility 100 on every page**, best-practices 96, CLS ~0. SEO 100 except `/` (69) and `/booking` (66): the booking page is deliberately noindex; the homepage score came from variant B's noindex meta being shown to a client the bot list didn't recognise.
- **Fixed — crawler safety:** the bot list lacked Google's URL Inspection tool (`Google-InspectionTool`), GoogleOther, Bing/Yahoo/DuckDuckGo/Yandex/Baidu names, PageSpeed, link-preview and SEO tools — any of them could be shown the noindex variant B. Widened conservatively (names that never occur in real browsers) + 2 tests (tools → control; 9 real browsers/phones → not bots). Real Googlebot was already safe.
- **Speed:** observed paint was ~1.4s; the "5s LCP" is Lighthouse's pessimistic phone simulation. With REAL throttling (slow 4G + 4x CPU) first paint was 3.6-4.5s. Controlled experiments (blur/backdrop effects, text-wrap:balance, smooth scroll, animations each switched off; then header/hero/body/footer hidden one at a time) showed NO single culprit — layout cost is proportional to content, so the design stays as is. Fixed the one concrete network cost: the navbar logo shipped 48KB for a ~130px logo → `sizes` → 11KB. Real-throttling first paint: home 4.51→3.80s, local page 3.56→3.13s (single lab runs; direction consistent).
- Not done (would need a bigger trade-off): the remaining cost is framework JS hydration (~1.3s script at 4x) and content volume; reducing it means trimming sections or restructuring client components — a design/product decision, not a bug.
- Verified: tsc, lint, 36 unit tests, build, e2e 124/124 (both A/B variants pass).

## e2e hygiene — sweep leftovers before and after every run
- [x] `sweepStale()` in `scripts/e2e.ts`: removes customers/cleaners/cleaner_applications/auth logins whose email matches `%e2e-%@resend.dev`, bookings with `E2E-` refs or owned by such customers (+ their addresses, child visits, server_logs, site_events). Demo data (`delivered+first.last@resend.dev`) carries no marker so it is never touched. Refuses to run if >300 rows match (pattern-mistake guard).
- [x] Runs at the start of `main()` and again after the per-run `cleanup()`; anything the final sweep still finds fails the run (the test's own tracking has a gap).
- [x] `E2E_ADMIN_EMAIL` env var (defaults to the real owner login) so the admin-side checks can use a throwaway admin — previously they were skipped without the owner's password. Throwaway admin must NOT use an `e2e-` email (the sweep would delete it).
- Review: full run with throwaway admin = 174 PASS / 0 FAIL (up from 124 because the admin checks now run). Planted a stale customer + auth login → "before" sweep removed both; after-run sweep removed 0. Throwaway admin deleted afterwards. tsc + lint clean.

## Task: Email system, templates & lifecycle automations (built 2026-10-10)
**Goal:** convert as many leads as possible and bring past customers back. Target is measured, not promised — see the funnel report (E4).

### What already exists (don't rebuild)
Acknowledgement, quote, deposit instructions, deposit confirmed, 7-day quote + deposit follow-up ladders (email+SMS+WhatsApp, 10:00/18:00), day-before reminder, invoice + 3 overdue reminders, review/rating request after payment (`lib/bookings/settle.ts`, `/rate`), cleaner/applicant emails, admin alerts.
All of it is hard-coded in `lib/**` with no send log, no open/click/bounce data, no unsubscribe, no way to edit copy without a deploy, and only 2 daily cron slots (Vercel Hobby).

### Gaps
No consent/unsubscribe anywhere · no delivery tracking · no abandoned-booking capture · no pre-quote speed-to-lead step · no same-day post-clean flow · no rebook / win-back / recurring upsell · no frequency cap or quiet hours · no admin UI for templates.

### Phases
- [x] **E1 Foundation** — migration `0007`: `email_templates`, `email_outbox` (scheduled sends, dedupe_key, status), `email_events` (sent/delivered/opened/clicked/bounced/complained), `email_suppressions`, `customers.marketing_opt_out_at`. `lib/email/` render + send + unsubscribe token + Resend webhook (`/api/webhooks/resend`). Dispatcher `/api/cron/dispatch` secured by `CRON_SECRET`, triggered every 5 min by Supabase `pg_cron` + `pg_net` (both available, not installed) so we are not limited by Vercel Hobby. Move the 11 existing customer emails onto it with byte-identical output first (regression-test), then switch the call sites.
- [x] **E2 Admin UI** — "Automations" menu: Templates (edit subject/body with variables, preview, send test), Sequences (on/off, step timing), Send log (per customer + global), Suppressions.
- [x] **E3 New journeys** — see list below.
- [x] **E4 Campaigns + funnel report** — one-off sends to a segment (lapsed 90d, recurring-paused, by service/postcode); lead→quote→deposit→paid conversion per sequence step and per template; unsubscribe/bounce rates.

### Journeys (E3)
1. **Speed-to-lead:** instant acknowledgement (exists) → "tried to call" email if not answered in 30 min → quote ready.
2. **Quote ladder + deposit ladder:** migrate existing day 1-7 copy; add a "Should we close your file?" final step and a 30-day gentle win-back for lost leads.
3. **Abandoned booking:** capture email at step 1 of the form (needs consent wording) → one reminder after ~1h, one next morning.
4. **Pre-clean:** confirmed (exists) → prep checklist per service (e.g. end of tenancy) 3 days before → day-before (exists).
5. **Post-clean:** same-day thank-you + rating link → 4-5★ gets Google review ask, ≤3★ gets a recovery email + admin task (admin alert exists).
6. **Rebook / upsell:** one-off customers get "make it fortnightly" at ~2 days; rebook nudge at ~14/30 days.
7. **Retention:** lapsed 45/90/180 days win-back; seasonal (spring clean, pre-Christmas); paused/skipped recurring check-in; referral ask after a 5★.
8. **Commercial:** office-quote nurture and renewal reminder.

### Rules
- Only the four owner-confirmed claims; no invented stats, reviews or deadlines (see `amplecleaners-copy-claims`). Pay-deposit CTA, never "confirm quote".
- Transactional (booking, invoice, reminders) and marketing (rebook, win-back, campaigns) are separate streams; every marketing mail carries a one-click unsubscribe (List-Unsubscribe header + footer link) and the company address.
- A sequence stops itself when the customer pays, books, replies, or unsubscribes; max 1 marketing email per customer per 3 days; send only 08:00-20:00 London.
- `DISABLE_OUTBOUND_MESSAGES=1` stays honoured everywhere; e2e covers: scheduling, dedupe, stop-on-pay, unsubscribe, suppression, webhook signature.

### Needs the owner (cannot be scripted)
- [x] Verify `amplecleaners.com` in Resend (owner confirmed 2026-10-10).
- [x] Postal address: 363 Heathway, Dagenham RM9 5AG (owner, 2026-10-10). Phone still the placeholder until a London business number exists.
- [ ] Solicitor/ICO check of the consent + soft opt-in wording (UK PECR/GDPR) before any marketing email goes to real people.

### Review (2026-10-10)
**Built:** migration 0007 (templates, journey switches, outbox, events, suppressions, abandoned leads, campaigns); `lib/email/*` (markup → safe HTML, layout with address + unsubscribe, token-signed unsubscribe, journey scanner, dispatcher, segments, stats); `/api/cron/email-dispatch`, `/api/webhooks/resend` (Svix-verified), `/api/unsubscribe/[token]` (+ page, RFC 8058 one-click), `/api/leads/capture`; admin **Automations** (Journeys, Templates with live preview + send-me-a-test, Campaigns, Results funnel, Send log, Do-not-email). Every email the platform sends (old and new) is now in the Send log; bounced/complained/erased addresses are never emailed.
**Design decision:** a *scanner* looks at the database every 5 minutes and schedules what is due (dedupe keys; guards re-checked at send time) instead of hooking each place a booking can change status. Journeys only look at the last 10-14 days, so switching on never blasts old customers.
**Not done / honest limits:**
- The existing quote + deposit 7-day ladders and the transactional emails (quote, invoice, reminders) are still code-defined (not editable in the admin yet); they are logged and bounce-protected. Moving their copy into editable templates is a follow-up.
- Win-back is 60 and 180 days (plan said 45/90/180). Not built: paused/skipped-recurring check-in (no pause feature yet), referral ask (no referral feature to point at), commercial renewal nurture.
- Opens/clicks/bounces need the Resend webhook registered (owner step below). Until then the numbers show "needs delivery tracking".
**Needs the owner:** (1) create the Resend webhook → `https://www.amplecleaners.com/api/webhooks/resend` (events: delivered, opened, clicked, bounced, complained) and put its signing secret in Vercel as `RESEND_WEBHOOK_SECRET`; turn on open/click tracking for the domain in Resend; (2) after the next deploy run `npx tsx --env-file=.env.local scripts/schedule-email-dispatch.ts` (installs the 5-minute pg_cron timer, fires it once and prints the site's answer); (3) legal check of the consent wording.
**Verified:** tsc, lint, 48 unit tests (12 new: markup safety, copy honesty lint, Svix signature), e2e 229 checks incl. a new phase 13 (scheduling, dedupe, stop-on-pay, unsubscribe, bounce, frequency cap, erased customers, webhook, lead capture, admin API authz), Playwright pass on desktop and 390px mobile with no sideways scroll.

## Task: Close the email-system gaps (2026-10-10)
Owner asked to cover every gap listed after the email build. Plan (each step tested; push after each group):
- [x] **0. Migration 0008** — `customers.followups_paused_until`, quote-view columns on `bookings`, `bookings.lost_reason`, `settings.email_daily_limit`, template `sms_body/whatsapp_body/subject_b`, outbox `variant/sms_sent_at/whatsapp_sent_at`, `email_consents`, `inbox_messages`.
- [x] **1. Stop-on-reply + Inbox** — Resend inbound (`email.received` webhook → fetch body via `GET /emails/receiving/{id}`), match sender to customer, pause nurture journeys + cancel queued nurture mail for 7 days, alert the team, admin **Inbox** (threads, unread badge, reply from the platform, mark handled, resume follow-ups). Manual "pause follow-ups" works without inbound. Auto-replies/out-of-office never pause. Needs owner: receiving address (`INBOUND_REPLY_ADDRESS`) + a key that can read received mail.
- [x] **2. Old 7-day ladder under the same rules** — skip when paused (replied) / unsubscribed / bounced, unsubscribe link in its footer.
- [x] **3. SMS + WhatsApp on booking-critical journeys** — optional text fields on service templates (missed call, close file, prep, recovery); honours the Settings channel switches; never on marketing.
- [x] **4. Google review link warning + daily send limit with a reserve for booking emails** (Settings field).
- [x] **5. Consent log** for the form's reminder notice.
- [x] **6. Speed-to-lead alerts** — uncontacted enquiry → team alert at 15 and 60 min.
- [x] **7. Quote-viewed tracking** — count/last view on the quote page, shown on the booking, "viewed but didn't pay" nudge to the customer.
- [x] **8. Lost reasons** — one-click reason when moving a lead to Lost; reasons breakdown in Results.
- [x] **9. Subject-line A/B** — optional subject B per template, 50/50 split, per-variant open/click.
- [x] **10. Retention** — skipped recurring visit check-in; one-year thank-you.
- [x] **11. Email layout hardening** — table-based layout, Outlook-safe button, light colour-scheme hint.
- [x] **12. Verify** — unit + e2e (new checks), lint/tsc/build, UI screenshots, push, live check, docs + memory.
Not doing (needs a decision, not code): price-change notice to recurring customers (a service-notice template type that skips unsubscribe is easy to abuse for promotions).

### Review (2026-10-10)
**Built (all 12 steps):** migration 0008 (+ `email_paused`); Inbox (Resend `email.received` webhook → body fetch → threads, unread badge, reply from the platform, mark handled, pause/resume follow-ups; auto-replies never pause); the 7-day ladder now skips paused/unsubscribed/bounced customers and carries a "Stop these reminders" link; SMS/WhatsApp twins on three booking-critical templates (missed call, close-the-file, quote-opened) via the Settings switches, never on marketing; Google-review-link warning; daily send limit with a reserve for booking emails (Settings); consent log (exact notice wording); team alert for uncontacted enquiries at 15 and 60 min; quote-view tracking (count, last viewed, booking page hint, "any questions?" nudge guarded against collisions); lost reasons (picker on Move to Lost, funnel breakdown); subject-line A/B (stable 50/50, per-arm stats); skipped-visit check-in and one-year thank-you; table-based, Outlook-safe layout; global "Pause all automatic emails" switch.
**Extra found while testing:** the live 5-minute timer shares the database with the e2e suite, so the suite now pauses it for the run and restores the previous state afterwards (also a handy owner kill switch).
**Not done:** price-change notices (see above); the layout was only rendered in Chrome, not Outlook/Gmail dark mode; a received email can only show its body if the Resend key used can read received mail.
**Owner steps:** receiving address → `INBOUND_REPLY_ADDRESS` on Vercel (Resend → Emails → Receiving), add the `email.received` event to the webhook, optionally `RESEND_RECEIVE_KEY` (a key allowed to read received mail); set the Google review link and the real daily limit in Settings.
**Verified:** tsc, lint, 56 unit tests, e2e 281 checks (phase 14 added), Playwright desktop + mobile on the new screens.
