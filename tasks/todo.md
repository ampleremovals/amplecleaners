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
- [ ] **BLOCKED on you:** a real Supabase project, Twilio number + WhatsApp
      Business profile, Stripe account. I can't create paid third-party
      accounts — once you create the Supabase project (or hand me a
      personal access token I can use to create one via the Supabase API),
      I'll run the schema, wire the real env vars, and deploy to Vercel
      myself; nothing else about this is manual for you.
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
- [ ] Stripe webhook handling (deposit paid → booking_confirmed, full
      balance paid → paid).
- [ ] Recurring billing for regular cleans (charge after each visit, or a
      subscription model — needs an explicit decision with the owner before
      building, since it changes the Stripe integration shape).

**Phase 6 — Polish & production**
- [ ] Mobile-first design pass, loading/empty/error states everywhere.
- [ ] Security review (RLS audit, rate limiting on public endpoints).
- [ ] Production Vercel deploy + domain + analytics.

### Review (Phase 1)
What shipped this session: a complete, coherent Phase 1 scaffold — brand,
schema, public booking flow (working form → DB, once credentials exist),
admin shell. Everything that could be built without a live Supabase project
is built; what's blocked is blocked only on the owner creating the paid
third-party accounts (Supabase, Twilio, Stripe, Resend domain, GitHub repo),
which genuinely cannot be scripted without his account access. Next session:
once those exist, run the migration, wire real env vars, verify `npm run dev`
and a real end-to-end test booking, then move into Phase 2.
