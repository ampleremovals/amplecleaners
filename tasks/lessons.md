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

## Lesson 8 — "Built" is not "works": RLS must be tested with a real session of each role
**What happened:** Phase 4's mobile app was marked done, but auditing the live DB showed `cleaners`, `customers` and `addresses` had NO select policy for cleaners — so no cleaner could ever have logged in or seen a job's address. Separately, the cleaner UPDATE policy had no column restriction (a cleaner could have edited their own job's price), and anon INSERT policies on bookings let anyone post a booking with any price/status straight to PostgREST.
**Root cause:** Code and types were checked, but nothing was ever run as an authenticated cleaner against real RLS.
**Rule going forward:** For every table a non-admin role touches, write the policy AND prove it with a real sign-in as that role (allowed read works, forbidden read/write is refused). Non-admin WRITES go through a server route that whitelists fields and writes the audit trail — never a broad UPDATE policy.

## Lesson 9 — After any rename, grep the class names against the config (and hardcoded hex)
**What happened:** The brand moved teal → green, screens were renamed to `brand-green-*`, but the mobile `tailwind.config.js` still defined `brand.teal` — so every `brand-green-*` class silently rendered nothing. Hex values (`#0f766e`) were also still teal in emails, the app and splash.
**Rule going forward:** After a token/brand rename, grep BOTH the usages and the config for the old and new names, and grep for the old hex values.

## Lesson 10 — The Resend SDK returns `{ error }`; it does not throw
**What happened:** Customer emails used `.catch()` only, so "domain not verified" or a bad key would have been swallowed silently.
**Rule going forward:** Send through `lib/notify.ts` (`notifyCustomer` / `sendEmailSafe`), which checks `error` and writes a `server_logs` row while still never failing the booking flow.

## Lesson 11 — A Postgres `time` is not a `Date`
**What happened:** `formatTime("09:00:00")` did `new Date("09:00:00")` → Invalid Date → "—", so a job's start time never displayed in the app.
**Rule going forward:** Treat `TIME` columns as `HH:MM[:SS]` strings; never pass them to `new Date()`.

## Lesson 12 — Environment gotchas worth remembering
- The Supabase direct DB host (`db.<ref>.supabase.co`) is IPv6-only and fails on IPv4 networks; use the session pooler (`aws-0-eu-west-1.pooler.supabase.com`, user `postgres.<ref>`). Region found by probing.
- `tsconfig` without `target` defaults to ES5 and rejects `for..of` over a `Map`; set `"target": "ES2017"`.
- `incremental` tsc caches in `tsconfig.tsbuildinfo` and can report stale errors after a config change — delete it.
- Regexes with backslashes written through `node -e` in bash lost their `\` once (`\d` → `d`) and silently never matched. Use the editor tool for any backslash-heavy edit and re-read the result.
- Vercel Hobby allows 2 crons: put new daily jobs inside the existing two routes rather than adding entries.
- `@react-pdf/renderer` can't be loaded by `tsx` (ESM subpath export); test the PDF by bundling with esbuild and running under Node CJS, which is what Next uses.

## Lesson 13 — Walk the whole journey as the customer AND the admin, not just the code
**What happened:** Phases 2-6 were "done" and tested, yet a customer who booked got no message at all until an admin manually pressed Save & send, and the admin was never told a booking arrived. Found only by reading the booking page → confirmation page → admin flow end to end.
**Rule going forward:** For any "automate X" goal, trace one real user's path from first click to money received and list every step a human still has to do. Each must be automated or consciously kept manual.

## Lesson 14 — On Windows, `pkill` does not see your servers
**What happened:** A stale test server kept port 3120, so the new build never started and the e2e hit OLD code (15 misleading failures).
**Rule going forward:** Check the server log for EADDRINUSE; kill by PID (`netstat -ano | grep :PORT`, `taskkill //PID n //F`), never trust `pkill` here.

## Lesson 15 — Tests must never be able to send real messages
**What happened:** Repeated end-to-end runs emailed Resend's test inboxes dozens of times and hit the account's DAILY quota (429), which would have blocked real customer emails for the rest of the day.
**Root cause:** The test shared the production send path with no off switch, and "test addresses" still count against the quota.
**Rule going forward:** All outbound sends go through guarded wrappers honouring `DISABLE_OUTBOUND_MESSAGES=1`; the e2e script refuses to run without it. Also: per-IP rate limits persist in the DB across runs, so tests send a distinct `x-forwarded-for` per call.

## Lesson 16 — One colour per piece of text; never gradient text
**What happened:** Headings used a green→blue→purple gradient fill on part of the text, and a closing card put white text over a gradient whose bright-blue middle gave ~2.8:1 contrast. The owner asked for a single colour per text with good contrast.
**Rule going forward:** Each heading/label is ONE solid colour. Pick it against the actual background (dark ink on light glass; white only on deep tones ≥5.9:1, e.g. green-800 / sky-700 / violet-700). Gradient text is removed from the CSS so it can't creep back, and gradient backgrounds under text must be checked at their brightest stop.

## Lesson 17 — A "no horizontal overflow" check is blind if the page clips overflow
**What happened:** The redesigned homepage wrapper uses `overflow-x-clip`, so `scrollWidth > innerWidth` always read false — yet the mobile pricing card was visibly poking ~37px past the screen edge (a flex row of "£15 / hour" + a chip could not shrink inside a grid cell).
**Rule going forward:** Check overflow per element (`getBoundingClientRect().right > viewport`), not just the document width, at 320/360/390/768/1024+. Flex rows inside grid cells need `flex-wrap` and/or `min-w-0`. (A reusable check lived in the scratchpad: iterate `main *`, skip aria-hidden decoration.)

## Lesson 18 — Never push backslash/escape edits through shell one-liners (again)
**What happened:** A Python heredoc wrote real NBSP characters and converted the file to CRLF; the follow-up `sed` turned ` ` into `00a0` (GNU sed treats `\u` as "uppercase next char"); a Playwright regex `\d` became `d` and silently matched nothing.
**Rule going forward:** Same as Lesson 12 — use the Write/Edit tools for anything containing backslashes, and re-read the result. Never round-trip source files through Python `open(...,'w')` on Windows (it rewrites line endings).

## Lesson 19 — Design fixes need a before/after in a real browser at phone AND laptop size
**What happened:** The owner's complaint ("looks amateurish") was a layout/hierarchy problem, not a bug: text-only centred hero, CTA below a paragraph on mobile, four identical white-on-white pills. No test could have caught it.
**Rule going forward:** For any visual change, screenshot before and after at 390px and 1440px (plus a tablet width), and walk the whole page — not just the hero. Put the product (here, the live price calculator) where the eye lands first, and keep the primary action inside the first mobile screen.

## Lesson 20 — Grid and flex children need `min-w-0`, or one long string widens the whole page
**What happened:** On the admin, a long unbreakable email, a nowrap status pill and a row of fixed-width inputs each stretched a CSS-grid column past the viewport (the bookings board made the whole page 2112px wide on a 1440px screen). Grid/flex items default to `min-width: auto`, so they refuse to shrink below their content.
**Rule going forward:** Put `min-w-0` on grid/flex children that hold text, tables or inputs (and `break-words` on emails/URLs); let multi-input rows `flex-wrap`. Test every page at 390px with a per-element overflow check — and open the DETAIL pages too, not just the lists.

## Lesson 21 — An admin without sign-out or mobile navigation is unfinished, whatever it looks like
**What happened:** The CRM sidebar was `hidden` below 640px with no replacement, and there was no way to sign out. Neither shows up in code review or e2e; both showed up the moment the pages were used as a real person on a phone.
**Rule going forward:** For any authenticated area, check the full session lifecycle (sign in, navigate on a phone, sign out, confirm the route is protected again) as part of "done".

## Lesson 22 — The e2e's own cleanup report can hide earlier leftovers
**What happened:** A previous e2e run (stamp `muunf1wn`, 2026-10-05) crashed before cleanup and left 20 bookings, 6 cleaners and 4 invoices in the live database. Every later run reported "left-over E2E bookings: 0" because it only checks its OWN stamp, so the dashboard showed fake revenue to the owner.
**Rule going forward:** Check the whole table for `E2E` markers (not just this run's stamp) at the start and end of an e2e run — and never rely on the run's self-report as proof the database is clean.

## Lesson 23 — Sticky/fixed elements in full-page screenshots lie; test them with real scrolling
**What happened:** Every full-page capture showed the sticky navbar and the mobile bottom bar floating in the middle of the page, which looked like bugs. They are artefacts of capturing a tall page with fixed elements. The real behaviour (bar hidden at top, shown mid-page, hidden at the end) was only provable by scrolling a real viewport and reading `aria-hidden`.
**Rule going forward:** Judge layout from full-page shots, judge sticky/fixed behaviour from scripted scrolling.

## Lesson 24 — A UI-level test that submits a real form writes a real row
**What happened:** Verifying the rewritten booking form through the browser created a booking in the live database (the dev server uses the live Supabase).
**Rule going forward:** Use a clearly-marked `@resend.dev` test identity with outbound messages disabled, record the reference, look at exactly what was created, and delete only that — in the same task.

## Lesson 25 — Importing a constant from a server-only module into a client component breaks at runtime, and tsc cannot see it
**What happened:** The new client chart imported `RANGE_DAYS` from the dashboard data loader, which imports `next/headers` via the Supabase server client. `tsc` and `lint` were clean; the dev server returned a 500 for every page.
**Rule going forward:** Constants, types and pure helpers that a client component needs live in a module with NO server imports (`*-shared.ts`). After adding any client component that touches shared code, load the page in the dev server (or run `next build`) before calling it done.

## Lesson 26 — Measure where latency really goes, on the live site, before "fixing" it
**What happened:** The new ⌘K search took ~1s on the live site but milliseconds locally. My first theory was the serverless region (`x-vercel-id` showed the code running in `iad1` while the database is in Ireland), so I added `preferredRegion = "dub1"` — it was silently ignored on this Vercel plan and changed nothing. Splitting the timing (network 87 ms, DB ping 213 ms, auth-only 697 ms, full search 1,023 ms) showed the real cost: the admin permission check ran several lookups one after another before the search even began.
**Rule going forward:** For anything interactive, time it on the LIVE site and split it into network / one DB call / auth / the work itself before changing code. Verify a config change actually took effect (here: re-read `x-vercel-id`). Run independent lookups in parallel (`Promise.all`) and use embedded filters instead of "find ids, then query again". Per-route `preferredRegion` does not work on this plan; a site-wide region (`vercel.json` "regions", or the project setting) is the owner's decision and has NOT been changed.

## Lesson 27 — A shared component's "convenience" default leaks everywhere it is used
**What happened:** I gave the shared `Panel` `h-full` so the dashboard's three-up row would stretch evenly. On every page that stacks panels in a column (booking detail), each panel then grew to the full height of the tallest column. Separately, `INPUT` carried `w-full`, so "narrow" variants (`w-28`) silently lost, because both classes exist and CSS source order — not class order — decides.
**Rule going forward:** Keep shared components neutral; make layout behaviour opt-in at the call site (`<Panel className="h-full">`), and combine overriding classes with `cn()` (tailwind-merge), never string concatenation. After changing a shared primitive, re-screenshot a page that uses it in a DIFFERENT layout than the one you built it for.

## Lesson 28 — Test the keyboard flow the way a person does it, then trust the surprise
**What happened:** The ⌘K palette "passed" until the test data changed; then Enter opened "Reports" instead of the top booking. cmdk keeps the previously highlighted item when new results arrive, so typing then pressing Enter picked the wrong thing. My first two fixes were to the TEST (wrong wait condition), the third found the real bug.
**Rule going forward:** When a flow test starts failing after a data change, suspect the product before the test. Wait on a signal that only appears when the thing you need has arrived (a result-group heading), not on text that is always on screen.

## Lesson 29 — A headline lab number is a hypothesis; find the cause by elimination before changing the design
**What happened:** Lighthouse reported "LCP 5s" on every page. The page actually painted at ~1.4s (observed); 5s was the simulator's slow-phone model. With real throttling it was ~3.5s, so there WAS a real slow-phone cost — but my four suspects (blur effects, balanced text, smooth scroll, animations) each changed it <10%, and hiding sections one at a time showed it was spread across the content. The only concrete waste was a 48KB logo on the critical path.
**Rule going forward:** Compare observed vs simulated numbers, then switch suspects off one at a time under a throttled CPU and keep the design unless a change moves the number. Don't strip a design for a score. (Harness notes: Git Bash rewrites arguments starting with `/` into Windows paths — use `MSYS_NO_PATHCONV=1` or defaults; start a test server and its tests in ONE background command, because background servers get killed when other background tasks end.)

## Lesson 30 — A cleanup that only knows what THIS run created can't clean up after a crashed run
**What happened:** `e2e.ts` deleted only the ids it tracked in memory, so any run that crashed left fake bookings/customers in the real database, while every later run still reported "left-over: 0".
**Rule going forward:** Test cleanup must also sweep by an unmistakable marker (here `e2e-…@resend.dev`, `E2E-` refs) before AND after the run, cap how much it may delete, and fail the run if the final sweep finds anything. Keep realistic demo data free of those markers, and never give a throwaway admin a marked email.

## Lesson 31 — Scan the database for "what is due" instead of hooking every place state can change
**What happened:** A booking's status can change from five places (customer, admin, cleaner app, Stripe webhook, cron). Hooking each one to enqueue emails would have missed some and drifted over time.
**Rule going forward:** For lifecycle messaging, a scanner that runs every few minutes and derives "who should get what now" from the data (with a dedupe key per email and a guard re-checked at send time) is simpler and cannot miss a path. Limit it to a recent window so turning it on never mails old history.

## Lesson 32 — `kill $!` on Windows kills the wrapper, not the server
**What happened:** `npx next start &` then `kill $SP` left the real node server listening, so the next run silently tested the OLD build.
**Rule going forward:** Stop test servers by port (`netstat -ano | grep :PORT | … taskkill //PID`) and check the port is free before starting; a green test against a stale server proves nothing.

## Lesson 33 — A shared database plus a live timer means tests need a kill switch
**What happened:** Once the 5-minute pg_cron dispatcher was live, throwaway e2e rows in the same database could have been sent for real (including a team alert to the owner) in the seconds between creation and cleanup.
**Rule going forward:** Any automation that acts on database rows needs a global pause flag that the test suite sets before it creates data and restores afterwards (remember the previous value). Build the switch into the product; owners want it anyway.

## Lesson 34 — Test clocks: rows created "now" are a few seconds in the future of the clock you captured earlier
**What happened:** Email tests passed overnight (the test clock had been moved into sending hours, hours ahead) and failed in the morning (clock = real time, rows due a moment later).
**Rule going forward:** Run test clocks deliberately ahead of real time (+90 min) instead of relying on a side-effect of the time of day.
