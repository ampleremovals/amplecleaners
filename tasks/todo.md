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
- [ ] **BLOCKED on you:** a real Ample Cleaners logo file (`assets/logo.png`
      in both the web app and `cleaner-app/`) — I haven't fabricated a brand
      mark since that's a real design decision, not a technical one. Happy to
      generate a placeholder icon if you'd rather not wait on a designer —
      just say the word.
- [x] `npm install` run, `npm run dev`-equivalent verified via `next build` +
      `next lint` + `tsc --noEmit` (all clean) — no live Supabase project to
      actually click through yet, so build-level verification is as far as
      this goes until credentials exist.
- [ ] First commit + push once a GitHub remote exists for this repo.
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
- [ ] NOT done: DBS document upload (toggle is manual for now, no file
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
- [ ] Scaffold Expo Router app cloned from `../Ampleremovals/driver-app`
      (package.json deps, app structure, auth, NativeWind theme — new teal
      brand).
- [ ] Cleaner auth (Supabase, bearer token to the shared API).
- [ ] Job list (today / upcoming), job detail with task checklist,
      before/after photo capture + upload to Supabase Storage.
- [ ] Clock in/out (location-stamped, same pattern as driver pickup/delivery
      confirmation).
- [ ] Push notifications (new job assigned, reminder before a job).
- [ ] Earnings screen.
- [ ] Automation: auto-match an unassigned booking to an available,
      in-coverage-area cleaner; auto-regenerate the next occurrence of a
      recurring booking a configurable number of days ahead.

**Phase 5 — Invoicing & billing**
- [ ] PDF invoice generation (`@react-pdf/renderer`, already a dependency).
- [x] Stripe webhook handling (deposit paid → booking_confirmed, full
      balance paid → paid) — built ahead of schedule in Phase 3, see above.
- [ ] Recurring billing for regular cleans (charge after each visit, or a
      subscription model — needs an explicit decision with the owner before
      building, since it changes the Stripe integration shape).

**Phase 6 — Polish & production**
- [ ] Mobile-first design pass, loading/empty/error states everywhere.
- [ ] Security review (RLS audit, rate limiting on public endpoints).
- [ ] Production Vercel deploy + domain + analytics.

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
