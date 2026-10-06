# Handoff prompt for a fresh Claude Code window (open this folder on its own)

Paste everything below the line into the first message.

---

You are continuing work on **Ample Cleaners**, a cleaning-business platform I (CCMendel) own. This folder is the whole project. Read `CLAUDE.md` first (my working rules: explain things clearly, never ask me to do manual steps that can be scripted, push to git after every iteration, prove things work before saying done, plan in `tasks/todo.md`, log mistakes in `tasks/lessons.md`, no new packages without asking).

## Before you do anything, read these (in order)
1. `tasks/todo.md` (what has been built, phase by phase, and what is still open) and `tasks/lessons.md`.
2. My notes from the previous session, which hold the operational details (database connection, admin account, cron limits, how to run the e2e tests, which items are blocked on me) and the copy rules: `C:\Users\User\.claude\projects\c--Users-User-Ampleremovals\memory\amplecleaners-ops.md` and `...\amplecleaners-copy-claims.md`. Copy anything useful into this project's own memory so you have it from now on.
3. `scripts/e2e.ts` header (how to start the test server) and `tests/`.

## What exists (all live at https://www.amplecleaners.com, auto-deploys on push to `main`)
- Next.js 14 (App Router, TypeScript strict), Supabase (Postgres, RLS, Auth, Storage), Tailwind and shadcn/ui, Resend email. Twilio (SMS/WhatsApp) and Stripe (cards) are NOT connected yet.
- Public site: homepage with a cookie-free A/B test, booking flow, quote/pay/rate/manage pages, legal pages.
- Admin CRM: bookings, cleaners, applications, customers, invoices, reports with marketing figures, settings (pricing, messaging switches), logs.
- Cleaner mobile app in `cleaner-app/` (Expo): jobs, photos, GPS clock-in, availability, time off, earnings, push. Built as an Android APK; never run on a real phone.
- Automation: cleaner matching, recurring series, follow-ups, invoices and payment settlement, booking changes.
- SEO content: 300 local pages (`/[service]/[area]`, 6 page types × 50 areas), 6 service hubs, `/areas`, 68 guides (`/guides`), a blog (`/blog`, 10 posts, RSS). Data lives in `lib/seo/*` (areas, services, content builder, guides, posts); there are tests in `tests/seo.test.ts`.

## State when I stopped
- Phases 1 to 11 are complete and verified: tsc, lint, 34 unit tests, full e2e against the real database, and the live site all pass.
- Phase 12 (content hub: `/areas`, guides grouped with search, more posts) is done.

## Rules that matter
- The e2e script refuses to run without `DISABLE_OUTBOUND_MESSAGES=1`, and the test server must be started with `STRIPE_WEBHOOK_SECRET=whsec_e2e_test`. Kill test servers by PID on Windows.
- Only these four copy claims are confirmed TRUE by me: "We're fully insured", "Popular slots fill up", "Get your full deposit back", "Most people pay within a day or two". Do not invent other claims, statistics or "best company" statements.
- One colour per text, good contrast on the background (no multi-colour headings).
- "Send a message" means email + SMS + WhatsApp.
- Deposit and follow-up messaging: not pushy but compelling.
- Vercel bot protection blocks curl on the live site; use a real browser (Playwright) for live checks.
- Shell quoting on Windows has bitten us repeatedly: prefer the Write/Edit tools or script files over long inline heredocs and `node -e`.

## Still open (mostly blocked on me)
- Real phone number and address (the site shows the placeholder `0333 000 0000`; needed for local SEO).
- Twilio keys, Stripe keys, Firebase (Android push) or an Apple Developer account (iOS push).
- Solicitor review of the terms and privacy text.
- Decision on upgrading Next.js 14 to 15.5+ (security advisory).
- Change the admin password (it matches the database password).
- Enable Vercel Web Analytics; Google Business Profile and Search Console.
- Confirm all 50 areas are places we really serve.
- Test the Android APK on a real phone (camera, GPS, clock-in, push).

## Ideas for the next iterations (pick with me)
1. Collect and show real customer reviews (matters for local ranking).
2. Put the real phone number and address everywhere, add to structured data.
3. Speed work (homepage performance was about 84 on mobile).
4. More guides and posts; a "last updated" date on content.
5. Wire up Twilio and Stripe once I give you the keys, and verify end to end.

Start by summarising where we are in your own words (briefly), then ask me which iteration to do first.
