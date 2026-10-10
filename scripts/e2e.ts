/**
 * End-to-end test against the REAL Supabase project + a local `next start`.
 * Creates clearly-marked throwaway data (emails @resend.dev test inboxes, refs
 * prefixed E2E) and deletes all of it at the end, pass or fail.
 *
 *   npx next build
 *   DISABLE_OUTBOUND_MESSAGES=1 STRIPE_WEBHOOK_SECRET=whsec_e2e_test RESEND_WEBHOOK_SECRET=whsec_ZTJlLXdlYmhvb2stc2VjcmV0 npx next start -p 3120
 *   DISABLE_OUTBOUND_MESSAGES=1 E2E_ADMIN_PW=... [E2E_ADMIN_EMAIL=...] npx tsx --env-file=.env.local scripts/e2e.ts
 */
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import Stripe from "stripe";
import { autoAssignBooking } from "../lib/automation/autoAssign";
import { generateRecurringVisits } from "../lib/automation/recurrence";
import { getOrCreateBookingInvoice } from "../lib/bookings/booking-invoice";
import { generateInvoiceToken, generateQuoteConfirmToken } from "../lib/tokens";
import { todayInLondon } from "../lib/cleaner-auth";
import { defaultTasks } from "../lib/tasks-template";
import { scanJourneys } from "../lib/email/journeys";
import { dispatchDue, emailBudget, runEmailEngine, withinSendHours } from "../lib/email/dispatch";
import { abArm } from "../lib/email/ab";
import { mayChase } from "../lib/followups/engine";
import { REMINDER_NOTICE } from "../lib/email/notice";
import { resendAdminEmail } from "../lib/resend";
import { ensureSeeded } from "../lib/email/store";
import { loadCompany } from "../lib/email/config";
import { renderTemplate } from "../lib/email/render";
import { unsubscribeToken } from "../lib/email/unsubscribe";
import { AUTOMATIONS } from "../lib/email/defaults";

// Safety: a test run must never email/text real people or burn the daily Resend quota.
if (process.env.DISABLE_OUTBOUND_MESSAGES !== "1") {
  console.error("Refusing to run: set DISABLE_OUTBOUND_MESSAGES=1 for this script AND for the `next start` server it talks to.");
  process.exit(2);
}

/** Which admin the admin-side checks sign in as (a throwaway one works; defaults to the real owner login). */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "amplecleaner@gmail.com";
const BASE = process.env.E2E_BASE ?? "http://localhost:3120";
const WEBHOOK_SECRET = "whsec_e2e_test";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const anon = () => createClient(URL_, ANON, { auth: { persistSession: false } });

let failures = 0;
let fwdN = Math.floor(Math.random() * 200);
/** Distinct client IP per call, so the per-IP rate limiter does not trip the test itself. */
const fwd = () => ({ "x-forwarded-for": `198.51.100.${++fwdN % 250}` });
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  → ${detail}` : ""}`);
}

const stamp = Date.now().toString(36);
const ids = { applicationEmails: [] as string[], auth: [] as string[], cleaners: [] as string[], customers: [] as string[], addresses: [] as string[], bookings: [] as string[], photos: [] as string[] };

async function makeCleaner(label: string, opts: { dbs: boolean }) {
  const email = `delivered+e2e-${label}-${stamp}@resend.dev`;
  const password = `E2e-${stamp}-pw!`;
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !u.user) throw new Error(`createUser: ${error?.message}`);
  ids.auth.push(u.user.id);
  const { data: c, error: cErr } = await admin
    .from("cleaners")
    .insert({ auth_user_id: u.user.id, full_name: `E2E ${label}`, email, phone: "07700900123", dbs_verified: opts.dbs, pay_rate_per_hour: 12 })
    .select("id")
    .single();
  if (cErr || !c) throw new Error(`cleaner: ${cErr?.message}`);
  ids.cleaners.push(c.id);
  const dow = new Date(`${todayInLondon()}T00:00:00Z`).getUTCDay();
  await admin.from("cleaner_coverage_areas").insert({ cleaner_id: c.id, postcode_prefix: "SW1" });
  await admin.from("cleaner_availability").insert({ cleaner_id: c.id, day_of_week: dow, start_time: "07:00", end_time: "20:00" });
  return { id: c.id as string, authId: u.user.id, email, password };
}

async function makeBooking(over: Record<string, unknown> = {}) {
  const { data: cust } = await admin.from("customers").insert({ full_name: "E2E Customer", email: `delivered+e2e-cust-${stamp}@resend.dev`, phone: "07700900999" }).select("id").single();
  const { data: addr } = await admin.from("addresses").insert({ line_1: "1 Test Street", postcode: "SW1A 1AA" }).select("id").single();
  ids.customers.push(cust!.id); ids.addresses.push(addr!.id);
  const { data: b, error } = await admin
    .from("bookings")
    .insert({
      reference: `E2E-${stamp}-${ids.bookings.length}`, service_type: "regular_cleaning", status: "booking_confirmed",
      customer_id: cust!.id, address_id: addr!.id, clean_date: todayInLondon(), clean_time: "09:00", frequency: "one_off",
      quote_line_items: [{ description: "Regular cleaning — 3 hours", quantity: 3, unit_price: 15, total: 45 }],
      quote_subtotal: 45, quote_total: 45, deposit_percentage: 20, tasks: defaultTasks("regular_cleaning"), source: "e2e", ...over,
    })
    .select("id, reference")
    .single();
  if (error || !b) throw new Error(`booking: ${error?.message}`);
  ids.bookings.push(b.id);
  return b as { id: string; reference: string };
}

async function http(path: string, init: { method?: string; token?: string; body?: unknown; raw?: string; headers?: Record<string, string> } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: { ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}), ...init.headers },
    body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
  const text = await res.text();
  let json: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  try { json = JSON.parse(text); } catch { /* binary/other */ }
  return { status: res.status, json, text };
}

async function stripeWebhook(invoiceId: string) {
  const stripe = new Stripe("sk_test_dummy");
  const payload = JSON.stringify({ id: `evt_e2e_${stamp}`, object: "event", type: "payment_intent.succeeded", data: { object: { id: `pi_e2e_${stamp}_${Math.random().toString(36).slice(2, 6)}`, object: "payment_intent", amount_received: 4500, metadata: { invoice_id: invoiceId } } } });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return http("/api/webhooks/stripe", { method: "POST", raw: payload, headers: { "Content-Type": "application/json", "stripe-signature": header } });
}

let priorPaused = false;

async function main() {
  console.log(`\nE2E against ${URL_} via ${BASE}\n`);
  // The live 5-minute email timer shares this database. Pause it for the run so it can never pick up throwaway test rows.
  priorPaused = !!(await admin.from("settings").select("email_paused").eq("id", 1).single()).data?.email_paused;
  await admin.from("settings").update({ email_paused: true }).eq("id", 1);
  await sweepStale("before the run");

  // ── 1. RLS hardening ───────────────────────────────────────────────────
  console.log("— RLS / hardening");
  const a = anon();
  const ins = await a.from("bookings").insert({ reference: `E2E-ANON-${stamp}`, service_type: "regular_cleaning", customer_id: "00000000-0000-0000-0000-000000000000" });
  check("anon can NOT insert a booking directly", !!ins.error);
  const sel = await a.from("server_logs").select("id").limit(1);
  check("anon sees no server_logs", !sel.error && (sel.data ?? []).length === 0);
  const rl = await a.rpc("check_rate_limit", { p_key: "x", p_limit: 1, p_window_seconds: 60 });
  check("anon can NOT call check_rate_limit", !!rl.error);

  // ── 2. Cleaner session + RLS reads ─────────────────────────────────────
  console.log("— cleaner login & RLS");
  const amy = await makeCleaner("amy", { dbs: true });
  const bob = await makeCleaner("bob", { dbs: true });
  const noDbs = await makeCleaner("nodbs", { dbs: false });
  const amyClient = anon();
  const { data: sess, error: signErr } = await amyClient.auth.signInWithPassword({ email: amy.email, password: amy.password });
  check("cleaner can sign in", !signErr && !!sess.session, signErr?.message);
  const amyToken = sess.session!.access_token;
  const own = await amyClient.from("cleaners").select("id").eq("auth_user_id", amy.authId).maybeSingle();
  check("cleaner can read OWN cleaner row (mobile login check)", own.data?.id === amy.id, own.error?.message);
  const others = await amyClient.from("cleaners").select("id").eq("id", bob.id).maybeSingle();
  check("cleaner can NOT read another cleaner", !others.data);

  // ── 3. Auto-assign ─────────────────────────────────────────────────────
  console.log("— auto-assign");
  const job = await makeBooking();
  const res = await autoAssignBooking(job.id, "system");
  check("auto-assign assigns someone", res.assigned === true, JSON.stringify(res));
  const assigned = res.assigned ? res.cleanerId : null;
  check("never picks the non-DBS cleaner", assigned !== noDbs.id);
  const { data: afterAssign } = await admin.from("bookings").select("status, assigned_cleaner_id").eq("id", job.id).single();
  check("booking → cleaner_assigned", afterAssign?.status === "cleaner_assigned");

  // Whoever got it is "the cleaner" for the rest; work out their token.
  const worker = assigned === bob.id ? bob : amy;
  const workerClient = anon();
  const { data: wsess } = await workerClient.auth.signInWithPassword({ email: worker.email, password: worker.password });
  const token = wsess.session!.access_token;
  const outsider = worker.id === amy.id ? bob : amy;
  const outsiderClient = anon();
  const { data: osess } = await outsiderClient.auth.signInWithPassword({ email: outsider.email, password: outsider.password });
  const outsiderToken = osess.session!.access_token;

  const seen = await workerClient.from("bookings").select("id, customer:customers(full_name), address:addresses(postcode)").eq("id", job.id).maybeSingle();
  const seenCust = Array.isArray(seen.data?.customer) ? seen.data?.customer[0] : seen.data?.customer;
  check("assigned cleaner can read job + customer + address via RLS", !!seen.data && !!seenCust?.full_name, seen.error?.message);
  const hidden = await outsiderClient.from("bookings").select("id").eq("id", job.id).maybeSingle();
  check("other cleaner can NOT see the job", !hidden.data);
  const direct = await workerClient.from("bookings").update({ quote_total: 1 }).eq("id", job.id).select("id");
  const { data: priceCheck } = await admin.from("bookings").select("quote_total").eq("id", job.id).single();
  check("cleaner can NOT edit price directly", Number(priceCheck?.quote_total) === 45 && !(direct.data ?? []).length);

  // ── 4. Cleaner API ─────────────────────────────────────────────────────
  console.log("— cleaner API");
  check("no token → 401", (await http(`/api/cleaner/jobs/${job.id}/clock-in`, { method: "POST" })).status === 401);
  check("other cleaner clock-in → 404", (await http(`/api/cleaner/jobs/${job.id}/clock-in`, { method: "POST", token: outsiderToken, body: {} })).status === 404);
  const ci = await http(`/api/cleaner/jobs/${job.id}/clock-in`, { method: "POST", token, body: { lat: 51.5, lng: -0.14 } });
  check("clock-in ok", ci.status === 200 && ci.json.success, ci.text.slice(0, 120));
  const { data: afterIn } = await admin.from("bookings").select("status, clock_in_lat").eq("id", job.id).single();
  check("status in_progress + location stamped", afterIn?.status === "in_progress" && Number(afterIn.clock_in_lat) === 51.5);
  check("double clock-in is harmless", (await http(`/api/cleaner/jobs/${job.id}/clock-in`, { method: "POST", token, body: {} })).json.success === true);

  const firstTask = defaultTasks("regular_cleaning")[0];
  const tk = await http(`/api/cleaner/jobs/${job.id}/tasks`, { method: "PUT", token, body: { tasks: [{ key: firstTask.key, done: true }, { key: "evil-new-task", done: true }] } });
  const savedTasks = (tk.json.tasks ?? []) as { key: string; done: boolean }[];
  check("task tick saved, injected task ignored", tk.json.success && savedTasks.find((t) => t.key === firstTask.key)?.done === true && !savedTasks.some((t) => t.key === "evil-new-task"));

  // photo: upload as the cleaner (storage RLS), then register
  const jpeg = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
  const path = `${job.id}/after-${stamp}.jpg`;
  const up = await workerClient.storage.from("job-photos").upload(path, jpeg, { contentType: "image/jpeg" });
  check("cleaner can upload a photo to own job folder", !up.error, up.error?.message);
  ids.photos.push(path);
  const badUp = await outsiderClient.storage.from("job-photos").upload(`${job.id}/evil-${stamp}.jpg`, jpeg, { contentType: "image/jpeg" });
  check("other cleaner can NOT upload into that job's folder", !!badUp.error);
  if (!badUp.error) ids.photos.push(`${job.id}/evil-${stamp}.jpg`);
  const reg = await http(`/api/cleaner/jobs/${job.id}/photos`, { method: "POST", token, body: { kind: "after", path } });
  check("photo registered on job", reg.json.success && reg.json.photos?.includes(path), reg.text.slice(0, 120));
  check("photo path outside job folder rejected", (await http(`/api/cleaner/jobs/${job.id}/photos`, { method: "POST", token, body: { kind: "after", path: "other-folder/x.jpg" } })).status === 400);

  const push = await http("/api/cleaner/push-token", { method: "POST", token, body: { token: `ExponentPushToken[e2e${stamp}]`, platform: "ios" } });
  check("push token registered", push.json.success === true, push.text.slice(0, 100));
  await admin.from("cleaner_push_tokens").delete().eq("cleaner_id", worker.id);

  const co = await http(`/api/cleaner/jobs/${job.id}/clock-out`, { method: "POST", token, body: { lat: 51.5, lng: -0.14 } });
  check("clock-out ok + invoiced", co.status === 200 && co.json.success && co.json.invoiced === true, co.text.slice(0, 160));

  // ── 5. Completion → invoice ────────────────────────────────────────────
  console.log("— completion → invoice");
  const { data: afterOut } = await admin.from("bookings").select("status, completion_processed_at").eq("id", job.id).single();
  check("booking → invoice_sent", afterOut?.status === "invoice_sent");
  const { data: invs } = await admin.from("invoices").select("id, type, total, status, invoice_number").eq("booking_id", job.id);
  const balance = invs?.find((i) => i.type === "full_balance");
  check("full_balance invoice for £45 created", !!balance && Number(balance.total) === 45 && balance.status === "sent", JSON.stringify(invs));

  const earn = await http("/api/cleaner/earnings", { token });
  check("earnings endpoint works (rate £12)", earn.json.success && earn.json.payRate === 12 && earn.json.allTime.hours >= 0, earn.text.slice(0, 120));

  if (balance) {
    const t = generateInvoiceToken(balance.id)!;
    const pdf = await http(`/api/invoices/${balance.id}/pdf?token=${t}`);
    check("invoice PDF downloads (valid %PDF)", pdf.status === 200 && pdf.text.startsWith("%PDF"));
    check("PDF with bad token → 401", (await http(`/api/invoices/${balance.id}/pdf?token=deadbeef`)).status === 401);
    const det = await http("/api/invoices/details", { method: "POST", body: { invoiceId: balance.id, token: t } });
    check("pay-page details load", det.json.success && det.json.total === 45 && det.json.status === "sent");
    check("details with bad token → 401", (await http("/api/invoices/details", { method: "POST", body: { invoiceId: balance.id, token: "nope-nope-nope" } })).status === 401);

    // ── 6. Stripe webhook (forged but correctly signed) ─────────────────
    console.log("— stripe webhook → settle");
    check("unsigned webhook rejected", (await http("/api/webhooks/stripe", { method: "POST", raw: "{}", headers: { "Content-Type": "application/json", "stripe-signature": "t=1,v1=bad" } })).status === 400);
    const w1 = await stripeWebhook(balance.id);
    check("signed webhook accepted", w1.status === 200, w1.text.slice(0, 100));
    const { data: paidInv } = await admin.from("invoices").select("status, paid_at").eq("id", balance.id).single();
    const { data: paidBk } = await admin.from("bookings").select("status").eq("id", job.id).single();
    check("invoice paid + booking → paid", paidInv?.status === "paid" && !!paidInv.paid_at && paidBk?.status === "paid");
    const { count: logsBefore } = await admin.from("activity_log").select("id", { count: "exact", head: true }).eq("booking_id", job.id).ilike("action", "Payment received%");
    await stripeWebhook(balance.id);
    const { count: logsAfter } = await admin.from("activity_log").select("id", { count: "exact", head: true }).eq("booking_id", job.id).ilike("action", "Payment received%");
    check("webhook replay is idempotent (no duplicate payment log)", logsBefore === 1 && logsAfter === 1, `${logsBefore}/${logsAfter}`);
  }

  // ── 7. Deposit paid → confirmed → auto-assigned ────────────────────────
  console.log("— deposit → confirm → assign");
  const nextWeek = new Date(`${todayInLondon()}T00:00:00Z`); nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);
  const dep = await makeBooking({ status: "quote_sent", clean_date: nextWeek.toISOString().slice(0, 10) });
  const depInv = await getOrCreateBookingInvoice(admin, { bookingId: dep.id, customerId: (await admin.from("bookings").select("customer_id").eq("id", dep.id).single()).data!.customer_id, type: "deposit", net: 9, description: "E2E deposit" });
  const w2 = await stripeWebhook(depInv.invoiceId);
  check("deposit webhook ok", w2.status === 200);
  const { data: depAfter } = await admin.from("bookings").select("status, assigned_cleaner_id, deposit_status").eq("id", dep.id).single();
  check("deposit paid → booking_confirmed → cleaner_assigned", depAfter?.status === "cleaner_assigned" && !!depAfter.assigned_cleaner_id && depAfter.deposit_status === "verified", JSON.stringify(depAfter));

  // ── 8. No match → flagged ──────────────────────────────────────────────
  console.log("— unmatched booking is flagged");
  const far = await makeBooking({ clean_date: nextWeek.toISOString().slice(0, 10), clean_time: "09:00" });
  await admin.from("addresses").update({ postcode: "ZZ9 9ZZ" }).eq("id", (await admin.from("bookings").select("address_id").eq("id", far.id).single()).data!.address_id);
  const miss = await autoAssignBooking(far.id, "system");
  const { data: farAfter } = await admin.from("bookings").select("is_flagged, flag_reason").eq("id", far.id).single();
  check("no eligible cleaner → not assigned, flagged with reason", miss.assigned === false && farAfter?.is_flagged === true && /cover ZZ9 9ZZ/.test(farAfter.flag_reason ?? ""), farAfter?.flag_reason ?? "");

  // ── 9. Recurrence ──────────────────────────────────────────────────────
  console.log("— recurring series");
  const root = await makeBooking({ frequency: "weekly", status: "cleaner_assigned", assigned_cleaner_id: amy.id });
  const gen1 = await generateRecurringVisits(todayInLondon());
  const { data: kids } = await admin.from("bookings").select("id, clean_date, status, assigned_cleaner_id, deposit_required").eq("parent_booking_id", root.id).order("clean_date");
  ids.bookings.push(...(kids ?? []).map((k) => k.id));
  const d7 = new Date(`${todayInLondon()}T00:00:00Z`); d7.setUTCDate(d7.getUTCDate() + 7);
  check("weekly series generated next visit (+7 days), no deposit", (kids?.length ?? 0) >= 1 && kids![0].clean_date === d7.toISOString().slice(0, 10) && kids![0].deposit_required === false, JSON.stringify(kids));
  check("child visit auto-assigned", !!kids?.[0]?.assigned_cleaner_id, JSON.stringify(kids?.[0]));
  const gen2 = await generateRecurringVisits(todayInLondon());
  const { data: kids2 } = await admin.from("bookings").select("id").eq("parent_booking_id", root.id);
  check("generator is idempotent (no duplicate visits)", (kids2?.length ?? 0) === (kids?.length ?? 0), `${gen1.created}/${gen2.created}`);

  // ── 10. Rate limiter ───────────────────────────────────────────────────
  console.log("— rate limiter");
  const key = `e2e-${stamp}`;
  const r = [] as unknown[];
  for (let i = 0; i < 3; i++) r.push((await admin.rpc("check_rate_limit", { p_key: key, p_limit: 2, p_window_seconds: 60 })).data);
  check("allows 2 then blocks the 3rd", r[0] === true && r[1] === true && r[2] === false, JSON.stringify(r));
  await admin.from("rate_limits").delete().eq("key", key);

  // ── 11. Public booking route seeds checklist (and is rate-limit safe) ─
  console.log("— public booking route");
  const pb = await http("/api/bookings", { method: "POST", headers: fwd(), body: { serviceType: "regular_cleaning", fullName: "E2E Public", email: `delivered+e2e-pub-${stamp}@resend.dev`, phone: "07700900888", propertyType: "flat", frequency: "one_off", hours: 3, line1: "9 Test Road", postcode: "SW1A 1AA", cleanDate: todayInLondon() } });
  check("public booking accepted", pb.json.success === true && pb.json.total === 45, pb.text.slice(0, 140));
  check("priced booking returns a quote path for the deposit CTA", typeof pb.json.quotePath === "string" && /^\/quote\/[0-9a-f-]{36}\//.test(pb.json.quotePath), String(pb.json.quotePath));
  if (pb.json.reference) {
    const { data: pub } = await admin.from("bookings").select("id, customer_id, address_id, tasks").eq("reference", pb.json.reference).single();
    if (pub) { ids.bookings.push(pub.id); ids.customers.push(pub.customer_id); ids.addresses.push(pub.address_id); }
    check("checklist seeded on creation", Array.isArray(pub?.tasks) && pub!.tasks.length > 5);
    const { data: sent } = await admin.from("bookings").select("status").eq("reference", pb.json.reference).single();
    check("priced booking auto-sent its quote (status quote_sent, no admin step)", sent?.status === "quote_sent", sent?.status);
  }

  const deep = await http("/api/bookings", { method: "POST", headers: fwd(), body: { serviceType: "deep_cleaning", fullName: "E2E Deep", email: `delivered+e2e-deep-${stamp}@resend.dev`, phone: "07700900777", propertyType: "house", line1: "2 Test Road", postcode: "SW1A 1AA", quoteTotal: 1 } });
  check("unpriced service: no instant quote, and a public quoteTotal is ignored", deep.json.success === true && deep.json.total === null && deep.json.quotePath === null, deep.text.slice(0, 140));
  if (deep.json.reference) {
    const { data: d } = await admin.from("bookings").select("id, status, customer_id, address_id, quote_total").eq("reference", deep.json.reference).single();
    if (d) { ids.bookings.push(d.id); ids.customers.push(d.customer_id); ids.addresses.push(d.address_id); }
    check("unpriced booking stays an inquiry with no price", d?.status === "inquiry" && d.quote_total === null);
  }

  await phase7();
  await phase8();
  await phase9();
  await phase10();
  await phase11();
  await phase12();
  await phase13();
  await phase14();
}

/**
 * Email engine: scheduling, de-duplication, stop-on-pay, unsubscribe, suppression, the delivery webhook,
 * the unsubscribe page API, lead capture and the admin Automations API. Runs with outbound mail disabled
 * (nothing leaves the building) and restricts the dispatcher to this run's own e2e addresses.
 */
async function phase13() {
  console.log("— phase 13: email system");
  const MINE = `%e2e-%${stamp}@resend.dev`;
  const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();
  // The dispatcher only sends 08:00-20:00 London. Move the test clock forward into that window if we're outside it.
  // Run the test clock 90 minutes ahead so rows queued "now" are already due, then move into sending hours if needed.
  let now = new Date(Date.now() + 90 * 60_000);
  for (let i = 0; i < 24 && !withinSendHours(now); i++) now = new Date(now.getTime() + 3_600_000);
  const mkCust = async (label: string) => {
    const email = `delivered+e2e-mail-${label}-${stamp}@resend.dev`;
    const { data } = await admin.from("customers").insert({ full_name: `E2E ${label} Person`, email, phone: "07700900555" }).select("id").single();
    ids.customers.push(data!.id);
    return { id: data!.id as string, email };
  };
  const mkBk = async (customerId: string, over: Record<string, unknown>) => {
    const { data: addr } = await admin.from("addresses").insert({ line_1: "2 Mail Street", postcode: "SW1A 1AA" }).select("id").single();
    ids.addresses.push(addr!.id);
    const { data: b, error } = await admin.from("bookings").insert({
      reference: `E2E-${stamp}-m${ids.bookings.length}`, service_type: "deep_cleaning", status: "quote_sent", customer_id: customerId, address_id: addr!.id,
      frequency: "one_off", quote_total: 90, quote_subtotal: 90, deposit_percentage: 20, quote_line_items: [], source: "e2e", ...over,
    }).select("id, reference").single();
    if (error || !b) throw new Error(`mail booking: ${error?.message}`);
    ids.bookings.push(b.id);
    return b as { id: string; reference: string };
  };
  const rowsFor = async (email: string) => (await admin.from("email_outbox").select("template_key, category, status, status_note, resend_id, delivered_at, bounced_at, subject").ilike("to_email", email)).data ?? [];
  const one = async (email: string, template: string) => (await rowsFor(email)).find((r) => r.template_key === template);
  const run = async () => { await scanJourneys(now); return dispatchDue(now, { onlyEmailLike: MINE }); };

  // ── defaults seeded, address in the footer ──
  await ensureSeeded();
  const { data: tpls } = await admin.from("email_templates").select("key");
  check("default templates are seeded", (tpls ?? []).length >= 14, String(tpls?.length));
  const co = await loadCompany();
  check("company address is in the email footer", co.address.includes("363 Heathway"));
  const { data: tq } = await admin.from("email_templates").select("*").eq("key", "quote_close_file").single();
  const shell = renderTemplate(tq, { firstName: "Sam", quoteLink: "https://www.amplecleaners.com/quote/x" }, co, "someone@example.com");
  check("service email: address, no unsubscribe link", shell.html.includes("363 Heathway") && !shell.html.includes("/unsubscribe/") && shell.oneClickHref === null);
  const { data: tm } = await admin.from("email_templates").select("*").eq("key", "rebook_nudge").single();
  const mk = renderTemplate(tm, { firstName: "Sam", bookingLink: "https://www.amplecleaners.com/booking/deep_cleaning" }, co, "someone@example.com");
  check("marketing email: unsubscribe link + one-click header URL", mk.html.includes("/unsubscribe/") && !!mk.oneClickHref?.includes("/api/unsubscribe/"));

  // ── quote went quiet → "close your file", exactly once ──
  const quiet = await mkCust("quiet");
  const qb = await mkBk(quiet.id, { status: "quote_sent", quote_sent_at: hours(-9 * 24) });
  await run();
  let r = await one(quiet.email, "quote_close_file");
  check("a quote untouched for 9 days gets the 'close your file' email", r?.status === "sent", JSON.stringify(r));
  await run(); await run();
  check("scanning again never sends it twice", (await rowsFor(quiet.email)).filter((x) => x.template_key === "quote_close_file").length === 1);

  // ── customer pays before the email goes out → cancelled ──
  const payer = await mkCust("payer");
  const pb = await mkBk(payer.id, { status: "quote_sent", quote_sent_at: hours(-9 * 24) });
  await scanJourneys(now);
  await admin.from("bookings").update({ status: "booking_confirmed" }).eq("id", pb.id);
  await dispatchDue(now, { onlyEmailLike: MINE });
  r = await one(payer.email, "quote_close_file");
  check("if they pay before it sends, the email is cancelled (stop-on-pay)", r?.status === "cancelled" && /booking_confirmed/.test(r.status_note ?? ""), JSON.stringify(r));

  // ── unsubscribed: marketing blocked, booking emails still delivered ──
  const unsub = await mkCust("unsub");
  await admin.from("email_suppressions").upsert({ email: unsub.email, scope: "marketing", reason: "e2e" }, { onConflict: "email" });
  await mkBk(unsub.id, { status: "quote_sent", quote_sent_at: hours(-9 * 24) });         // service: close file
  await mkBk(unsub.id, { status: "quote_sent", quote_sent_at: hours(-31 * 24) });        // marketing: winback
  await run();
  const ur = await rowsFor(unsub.email);
  check("unsubscribed customer: marketing email skipped", ur.find((x) => x.template_key === "quote_winback")?.status === "skipped", JSON.stringify(ur));
  check("unsubscribed customer: booking email still sent", ur.find((x) => x.template_key === "quote_close_file")?.status === "sent");

  // ── hard bounce blocks everything ──
  const bounced = await mkCust("bounced");
  await admin.from("email_suppressions").upsert({ email: bounced.email, scope: "all", reason: "e2e hard bounce" }, { onConflict: "email" });
  await mkBk(bounced.id, { status: "quote_sent", quote_sent_at: hours(-9 * 24) });
  await run();
  check("bounced address: even booking emails are skipped", (await one(bounced.email, "quote_close_file"))?.status === "skipped");

  // ── marketing frequency cap ──
  const cap = await mkCust("cap");
  await mkBk(cap.id, { status: "quote_sent", quote_sent_at: hours(-31 * 24) });   // two old quotes → two marketing emails due at once
  await mkBk(cap.id, { status: "quote_sent", quote_sent_at: hours(-32 * 24) });
  await run();
  const cr = (await rowsFor(cap.email)).filter((x) => x.category === "marketing");
  check("never two marketing emails within 3 days", cr.filter((x) => x.status === "sent").length === 1 && cr.some((x) => x.status === "skipped" && /within 3 days/.test(x.status_note ?? "")), JSON.stringify(cr));

  // ── erased (GDPR) customers are never emailed ──
  const { data: erasedCust } = await admin.from("customers").insert({ full_name: "Erased customer", email: `erased+e2e${stamp}@invalid.local`, phone: "00000000000" }).select("id").single();
  ids.customers.push(erasedCust!.id);
  await mkBk(erasedCust!.id, { status: "quote_sent", quote_sent_at: hours(-9 * 24) });
  await scanJourneys(now);
  const { count: erasedRows } = await admin.from("email_outbox").select("id", { count: "exact", head: true }).ilike("to_email", `erased+e2e${stamp}@invalid.local`);
  check("erased customers are never queued for email", erasedRows === 0, String(erasedRows));

  // ── switches: template off / journey off ──
  const sw = await mkCust("switch");
  await mkBk(sw.id, { status: "quote_sent", quote_sent_at: hours(-9 * 24) });
  await admin.from("email_automations").update({ enabled: false }).eq("key", "quote_close_file");
  await scanJourneys(now);
  check("a journey that is switched off schedules nothing", (await rowsFor(sw.email)).length === 0);
  await admin.from("email_automations").update({ enabled: true }).eq("key", "quote_close_file");

  // ── after the clean: rating ask; a rating stops it; a low rating triggers recovery ──
  const done = await mkCust("done");
  const db1 = await mkBk(done.id, { status: "job_completed", clean_date: todayInLondon(), service_type: "regular_cleaning" });
  await admin.from("status_history").insert({ booking_id: db1.id, previous_status: "in_progress", new_status: "job_completed", changed_by: "e2e", created_at: hours(-5) });
  await run();
  check("after a clean, the rating email goes out", (await one(done.email, "post_clean_thanks"))?.status === "sent");
  const rated = await mkCust("rated");
  const db2 = await mkBk(rated.id, { status: "job_completed", clean_date: todayInLondon(), service_type: "regular_cleaning" });
  await admin.from("status_history").insert({ booking_id: db2.id, previous_status: "in_progress", new_status: "job_completed", changed_by: "e2e", created_at: hours(-5) });
  await scanJourneys(now);
  await admin.from("ratings").insert({ booking_id: db2.id, rating: 2, feedback: "e2e" });
  await dispatchDue(now, { onlyEmailLike: MINE });
  check("already rated: the rating email is cancelled", (await one(rated.email, "post_clean_thanks"))?.status === "cancelled");
  await run();
  check("a 2-star rating triggers the recovery email", (await one(rated.email, "rating_recovery"))?.status === "sent");

  // ── abandoned form → reminder; booking afterwards cancels ──
  const ab = await mkCust("abandon");
  await admin.from("abandoned_leads").upsert({ email: ab.email, full_name: "E2E Abandon", service_type: "deep_cleaning", updated_at: hours(-2), created_at: hours(-2) }, { onConflict: "email" });
  await run();
  check("unfinished booking form → reminder sent", (await one(ab.email, "abandoned_1"))?.status === "sent");
  const ab2email = `delivered+e2e-mail-abandon2-${stamp}@resend.dev`;
  const ab2 = await mkCust("abandon2");
  const { data: lead2 } = await admin.from("abandoned_leads").upsert({ email: ab2email, full_name: "E2E Abandon2", service_type: "deep_cleaning", updated_at: hours(-2), created_at: hours(-3) }, { onConflict: "email" }).select("id").single();
  await scanJourneys(now);
  await mkBk(ab2.id, { status: "inquiry" });
  await dispatchDue(now, { onlyEmailLike: MINE });
  check("if they finish the booking, the reminder is cancelled", (await one(ab2email, "abandoned_1"))?.status === "cancelled" && !!lead2);

  // ── prep checklist 3 days out ──
  const prep = await mkCust("prep");
  await mkBk(prep.id, { status: "booking_confirmed", clean_date: dayShift(3), service_type: "end_of_tenancy" });
  await run();
  const pr = await one(prep.email, "prep_checklist");
  check("prep checklist goes out 3 days before the first clean", pr?.status === "sent" && /on /.test(pr.subject ?? ""), JSON.stringify(pr));

  // ── one-off customer, no repeat booking: upsell is due ──
  const up = await mkCust("upsell");
  await mkBk(up.id, { status: "paid", clean_date: dayShift(-3), service_type: "deep_cleaning" });
  await run();
  check("one-off customer gets the 'make it regular' email 2 days after the clean", (await one(up.email, "upsell_recurring"))?.status === "sent");
  const back = await mkCust("back");
  await mkBk(back.id, { status: "paid", clean_date: dayShift(-3), service_type: "deep_cleaning" });
  await mkBk(back.id, { status: "booking_confirmed", clean_date: dayShift(10), service_type: "deep_cleaning" });
  await run();
  check("a customer who has already booked again is not nagged", !(await rowsFor(back.email)).some((x) => x.category === "marketing"));

  // ── unsubscribe API (the page + Gmail's one-click) ──
  const tok = unsubscribeToken(`delivered+e2e-mail-link-${stamp}@resend.dev`)!;
  const g1 = await http(`/api/unsubscribe/${tok}`);
  check("unsubscribe link validates and masks the address", g1.json.success && /•••@/.test(g1.json.email) && g1.json.unsubscribed === false, g1.text.slice(0, 120));
  check("a forged unsubscribe link is rejected", (await http(`/api/unsubscribe/${tok.slice(0, -4)}beef`)).status === 400);
  const p1 = await http(`/api/unsubscribe/${tok}`, { method: "POST", headers: fwd() });
  const sup = await admin.from("email_suppressions").select("scope").eq("email", `delivered+e2e-mail-link-${stamp}@resend.dev`).maybeSingle();
  check("one-click unsubscribe (no cookies, no body) works", p1.json.success && sup.data?.scope === "marketing");
  const p2 = await http(`/api/unsubscribe/${tok}?undo=1`, { method: "POST", headers: fwd() });
  const sup2 = await admin.from("email_suppressions").select("scope").eq("email", `delivered+e2e-mail-link-${stamp}@resend.dev`).maybeSingle();
  check("'I changed my mind' re-subscribes", p2.json.success && !sup2.data);
  const page = await http(`/unsubscribe/${tok}`);
  check("unsubscribe page loads", page.status === 200);

  // ── Resend webhook: signature, tracking, bounce → suppression, replay-safe ──
  const wh = await mkCust("hook");
  const resendId = `re_e2e_${stamp}`;
  await admin.from("email_outbox").insert({ template_key: "e2e hook", category: "system", to_email: wh.email, status: "sent", sent_at: new Date().toISOString(), resend_id: resendId });
  const whsec = process.env.RESEND_WEBHOOK_SECRET_E2E ?? "whsec_ZTJlLXdlYmhvb2stc2VjcmV0";
  const send = async (type: string, id: string, extra: Record<string, unknown> = {}, secret = whsec) => {
    const payload = JSON.stringify({ type, created_at: new Date().toISOString(), data: { email_id: resendId, to: [wh.email], ...extra } });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = crypto.createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${payload}`).digest("base64");
    return http("/api/webhooks/resend", { method: "POST", raw: payload, headers: { "Content-Type": "application/json", "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${sig}` } });
  };
  const bad = await send("email.delivered", `msg_bad_${stamp}`, {}, "whsec_d3Jvbmctc2VjcmV0");
  check("webhook with a wrong signature is rejected", bad.status === 400 || bad.status === 503, `${bad.status}`);
  if (bad.status === 503) {
    console.log("SKIP  webhook checks (start the server with RESEND_WEBHOOK_SECRET=whsec_ZTJlLXdlYmhvb2stc2VjcmV0)");
  } else {
    check("signed 'delivered' event is accepted", (await send("email.delivered", `msg_d_${stamp}`)).json.success === true);
    await send("email.opened", `msg_o_${stamp}`);
    await send("email.opened", `msg_o_${stamp}`); // replay of the same event id
    const row = (await admin.from("email_outbox").select("delivered_at, opened_at").eq("resend_id", resendId).single()).data;
    check("delivery + open are recorded on the send log", !!row?.delivered_at && !!row?.opened_at);
    const { count: ev } = await admin.from("email_events").select("id", { count: "exact", head: true }).eq("resend_id", resendId);
    check("a replayed event is stored once", ev === 2, String(ev));
    await send("email.bounced", `msg_b_${stamp}`, { bounce: { type: "Permanent" } });
    const bs = await admin.from("email_suppressions").select("scope").eq("email", wh.email).maybeSingle();
    check("a hard bounce blocks the address from all email", bs.data?.scope === "all");
    const wh2 = await mkCust("hook2");
    await admin.from("email_outbox").insert({ template_key: "e2e hook", category: "system", to_email: wh2.email, status: "sent", sent_at: new Date().toISOString(), resend_id: `${resendId}_t` });
    const payload = JSON.stringify({ type: "email.bounced", data: { email_id: `${resendId}_t`, to: [wh2.email], bounce: { type: "Transient" } } });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = crypto.createHmac("sha256", Buffer.from(whsec.replace(/^whsec_/, ""), "base64")).update(`msg_t_${stamp}.${ts}.${payload}`).digest("base64");
    await http("/api/webhooks/resend", { method: "POST", raw: payload, headers: { "Content-Type": "application/json", "svix-id": `msg_t_${stamp}`, "svix-timestamp": ts, "svix-signature": `v1,${sig}` } });
    check("a temporary bounce (full mailbox) does NOT block the address", !(await admin.from("email_suppressions").select("scope").eq("email", wh2.email).maybeSingle()).data);
  }

  // ── cron endpoint is locked ──
  check("email cron endpoint rejects callers without the secret", (await http("/api/cron/email-dispatch")).status === 401);
  check("email cron endpoint rejects a wrong secret", (await http("/api/cron/email-dispatch", { token: "nope" })).status === 401);

  // ── lead capture API ──
  const leadEmail = `delivered+e2e-lead-${stamp}@resend.dev`;
  const lc = await http("/api/leads/capture", { method: "POST", headers: fwd(), body: { email: leadEmail, fullName: "E2E Lead", serviceType: "deep_cleaning" } });
  const stored = await admin.from("abandoned_leads").select("service_type, converted_at").eq("email", leadEmail).maybeSingle();
  check("booking form lead capture stores the lead", lc.json.success && stored.data?.service_type === "deep_cleaning" && !stored.data.converted_at);
  check("lead capture ignores garbage input", (await http("/api/leads/capture", { method: "POST", headers: fwd(), body: { email: "nope", serviceType: "x" } })).json.success === true && !(await admin.from("abandoned_leads").select("id").eq("email", "nope").maybeSingle()).data);
  const sub = await http("/api/bookings", { method: "POST", headers: fwd(), body: { serviceType: "deep_cleaning", fullName: "E2E Lead", email: leadEmail, phone: "07700900777", propertyType: "flat", bedrooms: 1, bathrooms: 1, line1: "9 Lead Street", postcode: "SW1A 1AA", isFlexibleDate: true } });
  if (sub.json.reference) {
    const { data: lb } = await admin.from("bookings").select("id, customer_id, address_id").eq("reference", sub.json.reference).single();
    if (lb) { ids.bookings.push(lb.id); ids.customers.push(lb.customer_id); ids.addresses.push(lb.address_id); }
  }
  const conv = await admin.from("abandoned_leads").select("converted_at").eq("email", leadEmail).maybeSingle();
  check("submitting the booking marks the lead converted", sub.json.success === true && !!conv.data?.converted_at, sub.text.slice(0, 120));

  // ── admin API ──
  const ADMIN_PW = process.env.E2E_ADMIN_PW;
  if (!ADMIN_PW) { console.log("SKIP  email admin API checks (set E2E_ADMIN_PW)"); return; }
  const adm = anon();
  const { data: as } = await adm.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PW });
  const at = as!.session!.access_token;
  const cl = await makeCleaner("mailauthz", { dbs: true });
  const cs = await signInAs(cl);
  check("email admin API: anonymous → 401", (await http("/api/admin/email/overview")).status === 401);
  check("email admin API: a cleaner → 403", (await http("/api/admin/email/overview", { token: cs.token })).status === 403);
  const ov = await http("/api/admin/email/overview", { token: at });
  check("overview lists every journey with its emails", ov.json.success && ov.json.journeys.length === AUTOMATIONS.length && ov.json.journeys.every((j: { steps: unknown[] }) => j.steps.length > 0), ov.text.slice(0, 120));
  const tl = await http("/api/admin/email/templates", { token: at });
  check("template list loads", tl.json.success && tl.json.templates.length >= 14);
  const bad1 = await http("/api/admin/email/templates/rebook_nudge", { method: "PATCH", token: at, body: { subject: "Hi {{nonsense}}", heading: "Heading here", body: "Hello there {{firstName}} friend" } });
  check("a template using an unknown {{variable}} is rejected", bad1.status === 400 && /nonsense/.test(bad1.json.error ?? ""), bad1.text.slice(0, 120));
  const bad2 = await http("/api/admin/email/templates/rebook_nudge", { method: "PATCH", token: at, body: { subject: "Hi {{firstName}}", heading: "Heading here", body: "Hello there {{firstName}} friend", cta_label: "Go", cta_url: "javascript:alert(1)" } });
  check("a button link that isn't https or a variable is rejected", bad2.status === 400);
  const orig = tl.json.templates.find((t: { key: string }) => t.key === "rebook_nudge");
  const ok1 = await http("/api/admin/email/templates/rebook_nudge", { method: "PATCH", token: at, body: { subject: "E2E edit for {{firstName}}", heading: orig.heading, body: orig.body, cta_label: orig.cta_label, cta_url: orig.cta_url } });
  const pv = await http("/api/admin/email/templates/rebook_nudge/preview", { method: "POST", token: at, body: {} });
  check("saved edits show up in the preview (sample data filled in)", ok1.json.success && pv.json.subject === "E2E edit for Sam" && pv.json.html.includes("363 Heathway") && pv.json.html.includes("/unsubscribe/"), pv.text.slice(0, 160));
  const live = renderTemplate((await admin.from("email_templates").select("*").eq("key", "rebook_nudge").single()).data, { firstName: "Pat" }, co, "x@example.com");
  check("the sender uses the edited text", live.subject === "E2E edit for Pat");
  await http("/api/admin/email/templates/rebook_nudge", { method: "PATCH", token: at, body: { reset: true } });
  const rs = (await admin.from("email_templates").select("subject").eq("key", "rebook_nudge").single()).data;
  check("'Restore default' puts the original wording back", rs?.subject === "Time for another clean, {{firstName}}?");
  const testSend = await http("/api/admin/email/templates/rebook_nudge/preview", { method: "POST", token: at, body: { send: true } });
  check("'Send me a test' works (mail is disabled in this run)", testSend.json.success === true && !!testSend.json.sentTo, testSend.text.slice(0, 120));
  const aut = await http("/api/admin/email/automations/winback", { method: "PATCH", token: at, body: { hours: [2000, 5000] } });
  const autRow = (await admin.from("email_automations").select("steps").eq("key", "winback").single()).data;
  check("journey timing can be changed", aut.json.success && autRow?.steps?.[0]?.hours === 2000 && autRow?.steps?.[1]?.hours === 5000);
  check("wrong number of timing values is rejected", (await http("/api/admin/email/automations/winback", { method: "PATCH", token: at, body: { hours: [1] } })).status === 400);
  await http("/api/admin/email/automations/winback", { method: "PATCH", token: at, body: { hours: [1440, 4320] } });
  const seg = await http("/api/admin/email/campaigns", { method: "POST", token: at, body: { name: "E2E count", templateKey: "campaign_spring", segment: "customers_all", dryRun: true } });
  check("campaign audience can be counted before sending", seg.json.success && typeof seg.json.count === "number", seg.text.slice(0, 120));
  check("a campaign can't use a non-marketing template", (await http("/api/admin/email/campaigns", { method: "POST", token: at, body: { name: "E2E bad", templateKey: "prep_checklist", segment: "customers_all", dryRun: true } })).status === 400);
  const addSup = await http("/api/admin/email/suppressions", { method: "POST", token: at, body: { email: `delivered+e2e-mail-manual-${stamp}@resend.dev` } });
  const lift = await http(`/api/admin/email/suppressions?email=${encodeURIComponent(`delivered+e2e-mail-manual-${stamp}@resend.dev`)}`, { method: "DELETE", token: at });
  check("admin can stop and re-allow marketing to an address", addSup.json.success && lift.json.success);
  const liftBounce = await http(`/api/admin/email/suppressions?email=${encodeURIComponent(bounced.email)}`, { method: "DELETE", token: at });
  check("a bounced address cannot be un-blocked from the screen", liftBounce.status === 400);
  const lg = await http("/api/admin/email/log?status=sent", { token: at });
  check("send log loads and filters", lg.json.success && Array.isArray(lg.json.rows));
  const fn = await http("/api/admin/email/funnel?days=30", { token: at });
  check("funnel report loads", fn.json.success && fn.json.stages.length === 5 && typeof fn.json.conversion === "number", fn.text.slice(0, 120));
}

/**
 * Email gaps: replies (inbound webhook → inbox + pause), the ladder's pause/suppression rules, text twins,
 * send-limit reserve, consent log, speed-to-lead alerts, quote-view tracking, lost reasons, subject A/B,
 * skipped-visit and anniversary journeys, the global pause switch. Outbound mail stays disabled.
 */
async function phase14() {
  console.log("— phase 14: email gaps");
  const MINE = `%e2e-%${stamp}@resend.dev`;
  const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();
  // Run the test clock 90 minutes ahead so rows queued "now" are already due, then move into sending hours if needed.
  let now = new Date(Date.now() + 90 * 60_000);
  for (let i = 0; i < 24 && !withinSendHours(now); i++) now = new Date(now.getTime() + 3_600_000);
  const mkCust = async (label: string) => {
    const email = `delivered+e2e-gap-${label}-${stamp}@resend.dev`;
    const { data } = await admin.from("customers").insert({ full_name: `E2E ${label} Person`, email, phone: "07700900666" }).select("id").single();
    ids.customers.push(data!.id);
    return { id: data!.id as string, email };
  };
  const mkBk = async (customerId: string, over: Record<string, unknown>) => {
    const { data: addr } = await admin.from("addresses").insert({ line_1: "3 Gap Street", postcode: "SW1A 1AA" }).select("id").single();
    ids.addresses.push(addr!.id);
    const { data: b, error } = await admin.from("bookings").insert({
      reference: `E2E-${stamp}-g${ids.bookings.length}`, service_type: "deep_cleaning", status: "quote_sent", customer_id: customerId, address_id: addr!.id,
      frequency: "one_off", quote_total: 90, quote_subtotal: 90, deposit_percentage: 20, quote_line_items: [], source: "e2e", ...over,
    }).select("id, reference").single();
    if (error || !b) throw new Error(`gap booking: ${error?.message}`);
    ids.bookings.push(b.id);
    return b as { id: string; reference: string };
  };
  const rowsFor = async (email: string) => (await admin.from("email_outbox").select("template_key, category, status, status_note, variant, subject, customer_id, vars").ilike("to_email", email)).data ?? [];
  const one = async (email: string, template: string) => (await rowsFor(email)).find((r) => r.template_key === template);
  const run = async () => { await scanJourneys(now); return dispatchDue(now, { onlyEmailLike: MINE }); };
  const whsec = "whsec_ZTJlLXdlYmhvb2stc2VjcmV0";
  const hook = async (type: string, id: string, data: Record<string, unknown>) => {
    const payload = JSON.stringify({ type, created_at: new Date().toISOString(), data });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = crypto.createHmac("sha256", Buffer.from(whsec.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${payload}`).digest("base64");
    return http("/api/webhooks/resend", { method: "POST", raw: payload, headers: { "Content-Type": "application/json", "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${sig}` } });
  };

  // ── global pause switch (the suite keeps it ON for the whole run) ──
  const eng = await runEmailEngine();
  check("with all automatic email paused, the engine does nothing", "paused" in eng && eng.paused === true);

  // ── a reply pauses the sales follow-ups ──
  const replier = await mkCust("replier");
  await mkBk(replier.id, { status: "quote_sent", quote_sent_at: hours(-9 * 24) });
  await scanJourneys(now);
  check("setup: a close-the-file email is queued for the customer", (await one(replier.email, "quote_close_file"))?.status === "scheduled");
  const rcv = await hook("email.received", `msg_r1_${stamp}`, { email_id: `rcv_${stamp}_1`, from: `Pat Replier <${replier.email}>`, to: ["replies@example.resend.app"], subject: "Re: your fixed price", message_id: "<m1@example>" });
  check("inbound reply webhook is accepted", rcv.json.success === true, rcv.text.slice(0, 120));
  const inRow = (await admin.from("inbox_messages").select("customer_id, direction, auto_reply, body_available").ilike("email", replier.email)).data ?? [];
  check("the reply is filed in the inbox against the right customer", inRow.length === 1 && inRow[0].direction === "in" && inRow[0].customer_id === replier.id && inRow[0].auto_reply === false, JSON.stringify(inRow));
  check("a queued sales email is cancelled when the customer replies", (await one(replier.email, "quote_close_file"))?.status === "cancelled" && /replied/.test((await one(replier.email, "quote_close_file"))?.status_note ?? ""));
  const pc = (await admin.from("customers").select("followups_paused_until").eq("id", replier.id).single()).data;
  check("the customer's sales follow-ups are paused for about a week", !!pc?.followups_paused_until && new Date(pc.followups_paused_until).getTime() > Date.now() + 6 * 86_400_000);
  await hook("email.received", `msg_r1b_${stamp}`, { email_id: `rcv_${stamp}_1`, from: `Pat Replier <${replier.email}>`, to: ["replies@example.resend.app"], subject: "Re: your fixed price" });
  check("the same received email delivered twice is stored once", ((await admin.from("inbox_messages").select("id").ilike("email", replier.email)).data ?? []).length === 1);

  const ooo = await mkCust("ooo");
  await hook("email.received", `msg_r2_${stamp}`, { email_id: `rcv_${stamp}_2`, from: ooo.email, to: ["replies@example.resend.app"], subject: "Out of office: back Monday" });
  const oooRow = (await admin.from("inbox_messages").select("auto_reply").ilike("email", ooo.email)).data ?? [];
  const oooCust = (await admin.from("customers").select("followups_paused_until").eq("id", ooo.id).single()).data;
  check("an out-of-office reply is stored but does NOT pause follow-ups", oooRow[0]?.auto_reply === true && !oooCust?.followups_paused_until);

  const stranger = `delivered+e2e-gap-stranger-${stamp}@resend.dev`;
  const sr = await hook("email.received", `msg_r3_${stamp}`, { email_id: `rcv_${stamp}_3`, from: stranger, to: ["replies@example.resend.app"], subject: "Hello" });
  check("a message from someone who isn't a customer is still kept", sr.json.success === true && ((await admin.from("inbox_messages").select("customer_id").ilike("email", stranger)).data ?? [])[0]?.customer_id === null);

  // ── paused customers are not nudged; booking-critical email still goes ──
  const paused = await mkCust("paused");
  await admin.from("customers").update({ followups_paused_until: hours(24) }).eq("id", paused.id);
  await mkBk(paused.id, { status: "quote_sent", quote_sent_at: hours(-9 * 24) });
  await mkBk(paused.id, { status: "booking_confirmed", clean_date: dayShift(3), service_type: "end_of_tenancy" });
  await run();
  check("paused customer: the sales nudge is cancelled", (await one(paused.email, "quote_close_file"))?.status === "cancelled");
  check("paused customer: the prep checklist still goes out", (await one(paused.email, "prep_checklist"))?.status === "sent");
  const unsubbed = await mkCust("unsubbed2");
  await admin.from("email_suppressions").upsert({ email: unsubbed.email, scope: "marketing", reason: "e2e" }, { onConflict: "email" });
  check("the 7-day ladder stays quiet for an unsubscribed customer", (await mayChase(unsubbed.email)) === false);
  check("the 7-day ladder stays quiet for a customer in conversation", (await mayChase(paused.email)) === false);
  check("the 7-day ladder continues for everyone else", (await mayChase(`nobody-${stamp}@example.com`)) === true);

  // ── text twins ──
  const lr = await admin.from("email_templates").select("sms_body, whatsapp_body").eq("key", "lead_not_answered").single();
  check("booking-critical templates carry SMS and WhatsApp wording", !!lr.data?.sms_body && !!lr.data?.whatsapp_body);
  const mk = await admin.from("email_templates").select("sms_body, whatsapp_body").eq("key", "rebook_nudge").single();
  check("marketing templates have no text version", !mk.data?.sms_body && !mk.data?.whatsapp_body);

  // ── consent log ──
  const leadEmail = `delivered+e2e-lead-${stamp}@resend.dev`;
  const cons = (await admin.from("email_consents").select("source, notice_text").ilike("email", leadEmail)).data ?? [];
  check("the reminder notice shown on the form is logged with the form's exact wording", cons.some((c) => c.source === "booking_form_reminder" && c.notice_text === REMINDER_NOTICE) && cons.some((c) => c.source === "booking_form_submit"), JSON.stringify(cons));

  // ── send limit leaves room for booking emails ──
  const { data: lim0 } = await admin.from("settings").select("email_daily_limit").eq("id", 1).single();
  await admin.from("settings").update({ email_daily_limit: 20 }).eq("id", 1);
  const filler = await mkCust("filler");
  await admin.from("email_outbox").insert(Array.from({ length: 12 }, (_, i) => ({ template_key: `e2e filler ${i}`, category: "system", to_email: filler.email, status: "sent", sent_at: new Date().toISOString() })));
  const budget = await emailBudget(admin, now);
  check("automation stops short of the daily limit (a reserve is kept)", budget.reserve === 10 && budget.remaining === 0, JSON.stringify(budget));
  check("when out of room the dispatcher waits instead of sending", (await dispatchDue(now, { onlyEmailLike: MINE })).waiting?.includes("limit") === true);
  await admin.from("email_outbox").delete().ilike("to_email", filler.email);
  await admin.from("settings").update({ email_daily_limit: lim0?.email_daily_limit ?? 100 }).eq("id", 1);

  // ── speed-to-lead alert ──
  const sla = await mkCust("sla");
  const slaBk = await mkBk(sla.id, { status: "inquiry", quote_total: null, quote_subtotal: null, created_at: hours(-0.4) });
  await scanJourneys(now);
  const slaAll = (await admin.from("email_outbox").select("to_email, customer_id, vars, status, category").eq("booking_id", slaBk.id).eq("template_key", "lead_sla_alert")).data ?? [];
  check("both alerts (15 and 60 minutes) are queued; the later one waits", slaAll.length === 2);
  const slaRow = slaAll.filter((r) => Number(r.vars?.minutesWaiting) === 15);
  check("an uncontacted enquiry triggers a team alert at 15 minutes", slaRow.length === 1 && slaRow[0].to_email === resendAdminEmail.toLowerCase() && Number(slaRow[0].vars?.minutesWaiting) === 15, JSON.stringify(slaRow));
  check("the team alert is addressed to the team, never tied to the customer", slaRow[0]?.customer_id === null);
  const called = await mkBk(sla.id, { status: "called", quote_total: null, quote_subtotal: null, created_at: hours(-0.4) });
  await scanJourneys(now);
  check("a lead that has been called gets no alert", ((await admin.from("email_outbox").select("id").eq("booking_id", called.id)).data ?? []).length === 0);

  // ── quote views ──
  const viewer = await mkCust("viewer");
  const vb = await mkBk(viewer.id, { status: "quote_sent", quote_sent_at: hours(-30) });
  const vtoken = generateQuoteConfirmToken(vb.id)!;
  const qv = () => http("/api/quote/details", { method: "POST", headers: fwd(), body: { bookingId: vb.id, token: vtoken } });
  await qv();
  const v1 = (await admin.from("bookings").select("quote_view_count, quote_first_viewed_at").eq("id", vb.id).single()).data;
  check("opening the quote page is counted", v1?.quote_view_count === 1 && !!v1.quote_first_viewed_at, JSON.stringify(v1));
  await qv();
  check("reloading within 30 minutes is the same visit", (await admin.from("bookings").select("quote_view_count").eq("id", vb.id).single()).data?.quote_view_count === 1);
  await admin.from("bookings").update({ quote_last_viewed_at: hours(-0.6) }).eq("id", vb.id);
  await qv();
  check("coming back later counts as a new visit", (await admin.from("bookings").select("quote_view_count").eq("id", vb.id).single()).data?.quote_view_count === 2);
  await admin.from("bookings").update({ quote_last_viewed_at: hours(-4) }).eq("id", vb.id);
  await run();
  check("opened-but-unpaid quote gets a friendly 'any questions?' email", (await one(viewer.email, "quote_viewed_nudge"))?.status === "sent");
  const busy = await mkCust("busy");
  const bb = await mkBk(busy.id, { status: "quote_sent", quote_sent_at: hours(-30), quote_view_count: 1, quote_last_viewed_at: hours(-4) });
  await admin.from("email_outbox").insert({ template_key: "quote follow-up day 1", category: "system", to_email: busy.email, status: "sent", sent_at: hours(-2), booking_id: bb.id });
  await run();
  check("…but not if another email just went to them", (await one(busy.email, "quote_viewed_nudge"))?.status === "cancelled" && /already emailed/.test((await one(busy.email, "quote_viewed_nudge"))?.status_note ?? ""));

  // ── subject-line test ──
  const abc = await mkCust("ab");
  await mkBk(abc.id, { status: "paid", clean_date: dayShift(-22), service_type: "deep_cleaning" });
  const ADMIN_PW = process.env.E2E_ADMIN_PW;
  let at = "";
  let rebookOrig: { subject: string; heading: string; body: string; cta_label: string | null; cta_url: string | null } | null = null;
  if (ADMIN_PW) {
    const { data: as } = await anon().auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PW });
    at = as!.session!.access_token;
    rebookOrig = (await admin.from("email_templates").select("subject, heading, body, cta_label, cta_url").eq("key", "rebook_nudge").single()).data;
    const put = await http("/api/admin/email/templates/rebook_nudge", { method: "PATCH", token: at, body: { ...rebookOrig, subject_b: "E2E B subject for {{firstName}}" } });
    check("a second subject line can be saved", put.json.success === true, put.text.slice(0, 120));
  }
  await run();
  const abRow = await one(abc.email, "rebook_nudge");
  if (ADMIN_PW) {
    const arm = abArm(`${abc.email}|rebook_nudge`);
    check("each recipient is assigned an arm and sees that arm's subject", abRow?.variant === arm && (arm === "B" ? /^E2E B subject/.test(abRow.subject ?? "") : !/^E2E B subject/.test(abRow?.subject ?? "")), JSON.stringify(abRow));
    await http("/api/admin/email/templates/rebook_nudge", { method: "PATCH", token: at, body: { reset: true } });
  } else check("rebook email sent (A/B admin checks skipped without E2E_ADMIN_PW)", abRow?.status === "sent");

  // ── retention ──
  const skipper = await mkCust("skipper");
  const series = await mkBk(skipper.id, { status: "booking_confirmed", frequency: "weekly", service_type: "regular_cleaning", clean_date: dayShift(2) });
  const visit = await mkBk(skipper.id, { status: "cancelled", frequency: "weekly", service_type: "regular_cleaning", clean_date: dayShift(9), parent_booking_id: series.id });
  await admin.from("status_history").insert({ booking_id: visit.id, previous_status: "cleaner_assigned", new_status: "cancelled", changed_by: "customer", created_at: hours(-3) });
  const ended = await mkCust("ended");
  const deadSeries = await mkBk(ended.id, { status: "cancelled", frequency: "weekly", service_type: "regular_cleaning", clean_date: dayShift(2) });
  const deadVisit = await mkBk(ended.id, { status: "cancelled", frequency: "weekly", service_type: "regular_cleaning", clean_date: dayShift(9), parent_booking_id: deadSeries.id });
  await admin.from("status_history").insert({ booking_id: deadVisit.id, previous_status: "booking_confirmed", new_status: "cancelled", changed_by: "customer", created_at: hours(-3) });
  const anniv = await mkCust("anniv");
  await mkBk(anniv.id, { status: "paid", clean_date: dayShift(-366), frequency: "weekly", service_type: "regular_cleaning" });
  await mkBk(anniv.id, { status: "paid", clean_date: dayShift(-20), frequency: "weekly", service_type: "regular_cleaning" });
  await run();
  check("a regular customer cancelling one visit gets a check-in", (await one(skipper.email, "visit_skipped"))?.status === "sent");
  check("ending the whole series is NOT treated as a skipped visit", !(await one(ended.email, "visit_skipped")));
  check("a regular customer gets a thank-you on their first anniversary", (await one(anniv.email, "anniversary_thanks"))?.status === "sent");

  // ── lost reasons + inbox admin API ──
  if (!ADMIN_PW) { console.log("SKIP  inbox / lost-reason admin checks (set E2E_ADMIN_PW)"); return; }
  const cl = await makeCleaner("gapauthz", { dbs: true });
  const cs = await signInAs(cl);
  check("inbox API: anonymous → 401", (await http("/api/admin/inbox")).status === 401);
  check("inbox API: a cleaner → 403", (await http("/api/admin/inbox", { token: cs.token })).status === 403);
  const inbox = await http("/api/admin/inbox?filter=all", { token: at });
  const conv = (inbox.json.conversations ?? []).find((c: { email: string }) => c.email === replier.email);
  check("inbox lists the conversation as unread with the customer's name", !!conv && conv.unread >= 1 && /replier/i.test(conv.name ?? ""), JSON.stringify(conv));
  check("inbox says whether replies can reach it yet", typeof inbox.json.receiving?.configured === "boolean");
  const th = await http(`/api/admin/inbox/thread?email=${encodeURIComponent(replier.email)}`, { token: at });
  check("thread shows the customer, their message and the automatic emails sent to them", th.json.success && th.json.items.some((i: { kind: string }) => i.kind === "in") && th.json.customer?.id === replier.id && th.json.customer?.paused === true, th.text.slice(0, 160));
  await http("/api/admin/inbox/thread", { method: "POST", token: at, body: { email: replier.email, action: "read" } });
  check("opening a conversation marks it read", ((await admin.from("inbox_messages").select("read_at").ilike("email", replier.email).eq("direction", "in")).data ?? []).every((m) => !!m.read_at));
  const rep = await http("/api/admin/inbox/reply", { method: "POST", token: at, body: { email: replier.email, body: "Thursday works. See you then!" } });
  const outMsg = (await admin.from("inbox_messages").select("direction, body_text, subject").ilike("email", replier.email).eq("direction", "out")).data ?? [];
  check("replying from the inbox sends and records the message", rep.json.success === true && outMsg.length === 1 && /^Re:/.test(outMsg[0].subject ?? ""), rep.text.slice(0, 120));
  check("replying marks their message as handled", ((await admin.from("inbox_messages").select("handled_at").ilike("email", replier.email).eq("direction", "in")).data ?? []).every((m) => !!m.handled_at));
  check("an empty reply is rejected", (await http("/api/admin/inbox/reply", { method: "POST", token: at, body: { email: replier.email, body: "  " } })).status === 400);
  await http("/api/admin/inbox/thread", { method: "POST", token: at, body: { email: replier.email, action: "resume" } });
  check("follow-ups can be resumed by hand", !(await admin.from("customers").select("followups_paused_until").eq("id", replier.id).single()).data?.followups_paused_until);
  await http("/api/admin/inbox/thread", { method: "POST", token: at, body: { email: replier.email, action: "pause" } });
  check("…and paused by hand", !!(await admin.from("customers").select("followups_paused_until").eq("id", replier.id).single()).data?.followups_paused_until);

  const tx1 = await http("/api/admin/email/templates/rebook_nudge", { method: "PATCH", token: at, body: { ...rebookOrig, sms_body: "Hi {{firstName}}" } });
  check("a marketing email can't be given a text-message version", tx1.status === 400, tx1.text.slice(0, 100));
  const pv = await http("/api/admin/email/templates/lead_not_answered/preview", { method: "POST", token: at, body: {} });
  check("the preview shows the SMS and WhatsApp wording with sample details", /Ample Cleaners/.test(pv.json.sms ?? "") && /REG-2026/.test(pv.json.whatsapp ?? ""), pv.text.slice(0, 160));
  check("send limit below the minimum is rejected", (await http("/api/admin/settings", { method: "PATCH", token: at, body: { email_daily_limit: 5 } })).status === 400);
  const pauseApi = await http("/api/admin/email/pause", { method: "POST", token: at, body: { paused: true } });
  const ov = await http("/api/admin/email/overview", { token: at });
  check("pause switch API works and the overview reports it", pauseApi.json.success === true && ov.json.health.paused === true && typeof ov.json.health.sendLimit.remaining === "number");

  const lost1 = await mkCust("lost1");
  const lb1 = await mkBk(lost1.id, { status: "quote_sent", quote_sent_at: hours(-30) });
  const l1 = await http(`/api/admin/bookings/${lb1.id}/status`, { method: "PATCH", token: at, body: { status: "not_a_good_fit", reason: "Too expensive" } });
  const lb1row = (await admin.from("bookings").select("lost_reason").eq("id", lb1.id).single()).data;
  const lh = (await admin.from("status_history").select("reason").eq("booking_id", lb1.id).eq("new_status", "not_a_good_fit")).data ?? [];
  check("moving a lead to Lost records why", l1.json.success === true && lb1row?.lost_reason === "Too expensive" && lh[0]?.reason === "Too expensive", l1.text.slice(0, 120));
  const lb2 = await mkBk(lost1.id, { status: "quote_sent", quote_sent_at: hours(-30) });
  await http(`/api/admin/bookings/${lb2.id}/status`, { method: "PATCH", token: at, body: { status: "cancelled", reason: "Chose someone else" } });
  check("cancelling a lead records why too", (await admin.from("bookings").select("lost_reason").eq("id", lb2.id).single()).data?.lost_reason === "Chose someone else");
  const fn = await http("/api/admin/email/funnel?days=30", { token: at });
  check("the Results funnel breaks lost leads down by reason", (fn.json.lostReasons ?? []).some((r: { reason: string }) => r.reason === "Too expensive") && (fn.json.lostReasons ?? []).some((r: { reason: string }) => r.reason === "Chose someone else"), JSON.stringify(fn.json.lostReasons));
  const bd = await http(`/api/admin/bookings/${vb.id}`, { token: at });
  check("the booking shows how many times the customer opened the quote", (bd.json.booking?.quote_view_count ?? 0) >= 2, bd.text.slice(0, 100));
}

async function phase12() {
  console.log("— phase 12: local SEO pages");
  const { AREAS } = await import("../lib/seo/areas");
  const { SEO_SERVICES } = await import("../lib/seo/services");
  const urls = SEO_SERVICES.flatMap((s) => AREAS.map((a) => `/${s.slug}/${a.slug}`));
  const titles = new Set<string>();
  let bad = 0;
  for (let i = 0; i < urls.length; i += 20) {
    const batch = await Promise.all(urls.slice(i, i + 20).map((u) => http(u, { headers: fwd() })));
    batch.forEach((r, j) => {
      const title = /<title>([^<]*)<\/title>/.exec(r.text)?.[1] ?? "";
      const ld = [...r.text.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].every((m) => { try { JSON.parse(m[1]); return true; } catch { return false; } });
      if (r.status !== 200 || !title || !ld || titles.has(title)) { bad++; console.log("   bad:", urls[i + j], r.status, title); }
      titles.add(title);
    });
  }
  check(`all ${urls.length} service × area pages load with unique titles and valid JSON-LD`, bad === 0, `${bad} bad`);
  check("service hub pages load", (await Promise.all(SEO_SERVICES.map((s) => http(`/${s.slug}`, { headers: fwd() })))).every((r) => r.status === 200));
  check("unknown area / service return 404", (await http("/house-cleaning/atlantis", { headers: fwd() })).status === 404 && (await http("/not-a-service", { headers: fwd() })).status === 404);
  const sm = await http("/sitemap.xml", { headers: fwd() });
  check("sitemap lists every area page", urls.every((u) => sm.text.includes(u)));
  const { GUIDES } = await import("../lib/seo/guides");
  const gp = await Promise.all(["/guides", ...GUIDES.map((g) => `/guides/${g.slug}`)].map((u) => http(u, { headers: fwd() })));
  check(`guides index + ${GUIDES.length} guides load`, gp.every((r) => r.status === 200 && /<h1/.test(r.text)));
  check("guides are in the sitemap", GUIDES.every((g) => sm.text.includes(`/guides/${g.slug}`)));
  check("unknown guide returns 404", (await http("/guides/not-a-guide", { headers: fwd() })).status === 404);
  const { POSTS, POST_CATEGORIES } = await import("../lib/seo/posts");
  const bp = await Promise.all(["/blog", "/blog/feed.xml", ...POSTS.map((p) => `/blog/${p.slug}`), ...Object.keys(POST_CATEGORIES).filter((c) => POSTS.some((p) => p.category === c)).map((c) => `/blog/category/${c}`)].map((u) => http(u, { headers: fwd() })));
  check(`blog index, feed, ${POSTS.length} posts and categories load`, bp.every((r) => r.status === 200));
  check("blog feed is RSS listing every post", /<rss/.test(bp[1].text) && POSTS.every((p) => bp[1].text.includes(`/blog/${p.slug}`)));
  check("blog posts are in the sitemap", POSTS.every((p) => sm.text.includes(`/blog/${p.slug}`)));
  check("unknown post and category return 404", (await http("/blog/nope", { headers: fwd() })).status === 404 && (await http("/blog/category/nope", { headers: fwd() })).status === 404);
  const ar = await http("/areas", { headers: fwd() });
  check("areas hub lists every area", ar.status === 200 && AREAS.every((a) => ar.text.includes(`/cleaning-services/${a.slug}`)));
  check("areas hub is in the sitemap", sm.text.includes("/areas<"));
  check("static pages still win over the dynamic service route", (await http("/privacy", { headers: fwd() })).status === 200);
}

async function phase11() {
  console.log("— phase 11: marketing measurement & A/B testing");
  const { variantFor } = await import("../lib/experiments");
  const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1 E2E";
  // Find one IP per variant using the real assignment function (deterministic).
  let ipA = "", ipB = "";
  for (let i = 1; i < 400 && (!ipA || !ipB); i++) {
    const ip = `192.0.2.${i}`;
    const v = variantFor(ip, UA);
    if (v === "a" && !ipA) ipA = ip;
    if (v === "b" && !ipB) ipB = ip;
  }
  const home = async (ip: string, ua = UA) => {
    const res = await fetch(`${BASE}/`, { headers: { "x-forwarded-for": ip, "user-agent": ua } });
    return { status: res.status, body: await res.text() };
  };
  const a1 = await home(ipA);
  const b1 = await home(ipB);
  check("variant A visitor sees the control hero", a1.status === 200 && /Come home to a spotless house/.test(a1.body) && !/Get your weekends back\. Fixed-price/.test(a1.body));
  check("variant B visitor sees the test hero at the SAME url (rewrite)", b1.status === 200 && /Get your weekends back\. Fixed-price cleaning/.test(b1.body) && /Check my price/.test(b1.body));
  check("the assignment is sticky for the same visitor", /Get your weekends back/.test((await home(ipB)).body) && /Come home to a spotless/.test((await home(ipA)).body));
  const bot = await home(ipB, "Googlebot/2.1 (+http://www.google.com/bot.html)");
  check("bots always get the control (never skew the test)", /Come home to a spotless house/.test(bot.body));
  const direct = await fetch(`${BASE}/lp/b`);
  const directBody = await direct.text();
  check("/lp/b is not indexable on its own URL", direct.status === 200 && /noindex/.test(directBody));

  // ── tracking endpoint ──
  const track = (body: unknown, ip: string, ua = UA) => fetch(`${BASE}/api/track`, { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": ip, "user-agent": ua, "x-e2e-track": "1" }, body: JSON.stringify(body) });
  const countEvents = async (extra: (q: any) => any = (q) => q) => (await extra(admin.from("site_events").select("id", { count: "exact", head: true }).eq("utm_campaign", "e2e"))).count ?? 0; // eslint-disable-line @typescript-eslint/no-explicit-any
  const t0 = await countEvents();
  const ok = await track({ path: "/", utm_source: "e2e-source", utm_campaign: "e2e", referrer_host: "www.google.com" }, ipB);
  const t1 = await countEvents();
  check("page view is recorded (204)", ok.status === 204 && t1 === t0 + 1, `${t0}→${t1}`);
  const { data: ev } = await admin.from("site_events").select("*").eq("utm_campaign", "e2e").order("created_at", { ascending: false }).limit(1).single();
  check("event stores the variant and a hashed id — never the IP", ev?.variant === "b" && ev.visitor_hash.length === 32 && !JSON.stringify(ev).includes(ipB), JSON.stringify(ev));
  await track({ path: "/", utm_campaign: "e2e" }, ipB, "Googlebot/2.1");
  await track({ path: "/quote/00000000-0000-0000-0000-000000000000/secret-token", utm_campaign: "e2e" }, ipB);
  await track({ nonsense: true }, ipB);
  check("bots, tokenised paths and junk are NOT recorded", (await countEvents()) === t1);
  const hashDay1 = ev!.visitor_hash;
  const { dailyVisitorHash } = await import("../lib/tracking");
  check("the visitor id changes every day (can't follow a person across days)", dailyVisitorHash(ipB, UA, new Date("2026-10-05T12:00:00Z")) !== dailyVisitorHash(ipB, UA, new Date("2026-10-06T12:00:00Z")) && dailyVisitorHash(ipB, UA, new Date("2026-10-05T01:00:00Z")) === dailyVisitorHash(ipB, UA, new Date("2026-10-05T23:00:00Z")) && hashDay1.length === 32);

  // ── attribution on a booking + funnel event ──
  const bk = await http("/api/bookings", { method: "POST", headers: { ...fwd(), "x-forwarded-for": ipB, "user-agent": UA, "x-e2e-track": "1" }, body: { serviceType: "regular_cleaning", fullName: "E2E Attrib", email: `delivered+e2e-attr-${stamp}@resend.dev`, phone: "07700900222", propertyType: "flat", frequency: "one_off", hours: 3, line1: "5 Attr St", postcode: "SW1A 1AA", cleanDate: dayShift(50), attribution: { utm_source: "facebook", utm_medium: "paid", utm_campaign: "e2e", gclid: "g123" } } });
  check("booking accepted with attribution", bk.json.success === true, bk.text.slice(0, 120));
  if (bk.json.reference) {
    const { data: row } = await admin.from("bookings").select("id, customer_id, address_id, utm_source, utm_medium, utm_campaign, gclid").eq("reference", bk.json.reference).single();
    if (row) { ids.bookings.push(row.id); ids.customers.push(row.customer_id); ids.addresses.push(row.address_id); }
    check("utm_source/medium/campaign and gclid are stored on the booking", row?.utm_source === "facebook" && row.utm_medium === "paid" && row.utm_campaign === "e2e" && row.gclid === "g123", JSON.stringify(row));
  }
  const { count: subs } = await admin.from("site_events").select("id", { count: "exact", head: true }).eq("event", "booking_submit").eq("utm_campaign", "e2e");
  check("a booking_submit event is recorded for the funnel", (subs ?? 0) >= 1);

  // ── marketing report: seed a known funnel and check the maths ──
  const ADMIN_PW = process.env.E2E_ADMIN_PW;
  if (!ADMIN_PW) { console.log("SKIP  marketing report checks (set E2E_ADMIN_PW)"); await cleanupEvents(); return; }
  check("marketing report needs admin", (await http("/api/admin/marketing")).status === 401);
  const { data: as } = await anon().auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PW });
  const at = as!.session!.access_token;
  const before = await http("/api/admin/marketing?days=30", { token: at });
  check("marketing report loads for admin", before.json.success === true && before.json.experiment?.a && before.json.experiment?.b, before.text.slice(0, 160));
  const now = new Date().toISOString();
  const seed = (hash: string, event: string, path: string, variant: string) => ({ visitor_hash: `e2eseed-${hash}`, event, path, variant, utm_campaign: "e2e", utm_source: "e2e-seed", created_at: now });
  const rows = [
    ...[1, 2, 3, 4, 5].flatMap((i) => [seed(`a${i}`, "page_view", "/", "a")]),
    ...[1, 2].flatMap((i) => [seed(`a${i}`, "page_view", "/booking/regular_cleaning", "a")]),
    seed("a1", "booking_submit", "/booking", "a"),
    ...[1, 2, 3, 4, 5].flatMap((i) => [seed(`b${i}`, "page_view", "/", "b")]),
    ...[1, 2, 3].flatMap((i) => [seed(`b${i}`, "page_view", "/booking/regular_cleaning", "b")]),
    ...[1, 2].flatMap((i) => [seed(`b${i}`, "booking_submit", "/booking", "b")]),
    seed("z1", "booking_submit", "/booking", "a"), // a booking by someone who never saw the homepage: must NOT count toward the test
  ];
  await admin.from("site_events").insert(rows);
  const after = await http("/api/admin/marketing?days=30", { token: at });
  const d = (k: "a" | "b", f: "visitors" | "bookingPageViews" | "bookings") => after.json.experiment[k][f] - before.json.experiment[k][f];
  check("funnel counts only people who SAW a hero version (A: 5 visitors, 2 reached the form, 1 booked)", d("a", "visitors") === 5 && d("a", "bookingPageViews") === 2 && d("a", "bookings") === 1, JSON.stringify(after.json.experiment.a));
  check("B funnel: 5 visitors, 3 reached the form, 2 booked", d("b", "visitors") === 5 && d("b", "bookingPageViews") === 3 && d("b", "bookings") === 2, JSON.stringify(after.json.experiment.b));
  check("small samples are never declared a winner", after.json.experiment.result.significant === false);
  check("the report says how many visitors are needed", typeof after.json.experiment.visitorsNeededPerVariant === "number" || after.json.experiment.visitorsNeededPerVariant === null);
  const fb = (after.json.channels ?? []).find((c: { channel: string }) => c.channel === "facebook");
  check("channel table shows facebook with its campaign", !!fb && fb.bookings >= 1 && fb.campaigns.includes("e2e"), JSON.stringify(after.json.channels).slice(0, 200));
  await cleanupEvents();
}

/**
 * Removes anything an earlier (crashed or older) run left in the REAL database. Keyed only on unmistakable test
 * markers: `…e2e-…@resend.dev` emails and `E2E-` references. The per-run cleanup below only knows what THIS run
 * created, so a crashed run used to leave fake bookings behind for days while still reporting "left-over: 0".
 * Realistic demo data carries neither marker, so it is never touched. Returns how many rows it removed.
 */
async function sweepStale(label: string): Promise<number> {
  const EMAIL = "%e2e-%@resend.dev";
  const MAX = 300; // a pattern mistake must never be able to wipe real data
  const { data: custs } = await admin.from("customers").select("id").ilike("email", EMAIL);
  const custIds = (custs ?? []).map((c) => c.id as string);
  const { data: byRef } = await admin.from("bookings").select("id, address_id").ilike("reference", "E2E-%");
  const { data: byCust } = custIds.length ? await admin.from("bookings").select("id, address_id").in("customer_id", custIds) : { data: [] };
  const bookings = new Map<string, string | null>();
  for (const b of [...(byRef ?? []), ...(byCust ?? [])]) bookings.set(b.id as string, (b.address_id as string | null) ?? null);
  const { data: cls } = await admin.from("cleaners").select("id").ilike("email", EMAIL);
  const cleanerIds = (cls ?? []).map((c) => c.id as string);
  if (custIds.length > MAX || bookings.size > MAX || cleanerIds.length > MAX) throw new Error(`sweep(${label}) refused: ${custIds.length} customers / ${bookings.size} bookings / ${cleanerIds.length} cleaners match — more than expected for test data`);

  const bookingIds = [...bookings.keys()];
  const addressIds = [...new Set([...bookings.values()].filter((a): a is string => !!a))];
  if (bookingIds.length) {
    await admin.from("bookings").delete().in("parent_booking_id", bookingIds);
    await admin.from("bookings").delete().in("id", bookingIds);
  }
  if (custIds.length) await admin.from("customers").delete().in("id", custIds);
  if (addressIds.length) await admin.from("addresses").delete().in("id", addressIds);
  if (cleanerIds.length) await admin.from("cleaners").delete().in("id", cleanerIds);
  await admin.from("cleaner_applications").delete().ilike("email", EMAIL);
  await admin.from("email_outbox").delete().ilike("to_email", EMAIL);
  if (bookingIds.length) await admin.from("email_outbox").delete().in("booking_id", bookingIds); // team alerts about test leads go to the admin address
  await admin.from("inbox_messages").delete().ilike("email", EMAIL);
  await admin.from("email_consents").delete().ilike("email", EMAIL);
  await admin.from("email_suppressions").delete().ilike("email", EMAIL);
  await admin.from("abandoned_leads").delete().ilike("email", EMAIL);
  await admin.from("server_logs").delete().ilike("metadata->>to", "%e2e-%");

  // test logins (cleaners, admins) — paged, matched strictly by the same email marker
  let authRemoved = 0;
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = data?.users ?? [];
    for (const u of users) {
      if (/e2e-[^@]*@resend\.dev$/i.test(u.email ?? "")) { await admin.auth.admin.deleteUser(u.id); authRemoved++; }
    }
    if (users.length < 200) break;
  }
  await cleanupEvents();
  const removed = custIds.length + bookingIds.length + cleanerIds.length + authRemoved;
  console.log(`sweep (${label}): removed ${custIds.length} customers, ${bookingIds.length} bookings, ${cleanerIds.length} cleaners, ${authRemoved} test logins`);
  return removed;
}

async function cleanupEvents() {
  await admin.from("site_events").delete().eq("utm_campaign", "e2e");
  await admin.from("site_events").delete().like("visitor_hash", "e2eseed-%");
}

async function phase10() {
  console.log("— phase 10: launch readiness");
  const text = async (path: string, headers: Record<string, string> = {}) => {
    const res = await fetch(`${BASE}${path}`, { headers });
    // React inserts <!-- --> markers between adjacent text nodes; strip them so text assertions are readable.
    return { status: res.status, type: res.headers.get("content-type") ?? "", body: (await res.text()).replace(/<!-- -->/g, "") };
  };

  const health = await http("/api/health");
  check("health endpoint reports the database up", health.status === 200 && health.json.ok === true && health.json.database === "up", health.text.slice(0, 120));
  const privacy = await text("/privacy");
  const terms = await text("/terms");
  check("privacy policy page is served", privacy.status === 200 && /Privacy Policy/.test(privacy.body) && /ico\.org\.uk/.test(privacy.body));
  check("terms page is served with the live pricing and the 48-hour rule", terms.status === 200 && /48 hours/.test(terms.body) && /£15 per hour/.test(terms.body));
  const missing = await text("/definitely-not-a-page");
  check("unknown URLs get the branded 404", missing.status === 404 && /couldn&#x27;t find that page|couldn&apos;t find that page|couldn't find that page/.test(missing.body));
  const sitemap = await text("/sitemap.xml");
  check("sitemap lists the legal pages and no admin URLs", /\/privacy</.test(sitemap.body) && /\/terms</.test(sitemap.body) && !/\/admin/.test(sitemap.body));
  const robots = await text("/robots.txt");
  check("robots.txt blocks admin, api and tokenised pages", /Disallow: \/admin/.test(robots.body) && /Disallow: \/api/.test(robots.body) && /Disallow: \/manage\//.test(robots.body));
  if (process.platform === "win32") {
    console.log("SKIP  social share card render (next/og cannot load its font from a Windows path; verified on the live Linux site instead)");
  } else {
    const og = await fetch(`${BASE}/opengraph-image`);
    check("social share card is a PNG", og.status === 200 && (og.headers.get("content-type") ?? "").includes("image/png"));
  }
  const home = await text("/");
  check("homepage advertises the share card + twitter card", /og:image/.test(home.body) && /summary_large_image/.test(home.body));
  const img = await fetch(`${BASE}/_next/image?url=%2Flogo-full.png&w=640&q=75`, { headers: { Accept: "image/avif,image/webp,*/*" } });
  check("image optimiser never serves AVIF (advisory mitigation)", img.status === 200 && !(img.headers.get("content-type") ?? "").includes("avif"), img.headers.get("content-type") ?? "");
  const csp = (await fetch(`${BASE}/`)).headers.get("content-security-policy") ?? "";
  check("CSP header present", /default-src 'self'/.test(csp));

  // ── erase personal data ──
  const ADMIN_PW = process.env.E2E_ADMIN_PW;
  if (!ADMIN_PW) { console.log("SKIP  erase checks (set E2E_ADMIN_PW)"); return; }
  const { data: as } = await anon().auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PW });
  const at = as!.session!.access_token;

  const done = await makeBooking({ status: "paid", special_instructions: "Key is under the blue pot, dog is friendly", clean_date: dayShift(-3) });
  const { data: dRow } = await admin.from("bookings").select("customer_id, address_id").eq("id", done.id).single();
  await admin.from("addresses").update({ line_1: "42 Secret Lane", city: "Londontown", postcode: "SW1A 1AA" }).eq("id", dRow!.address_id);
  const photo = `${done.id}/before-${stamp}.jpg`;
  await admin.storage.from("job-photos").upload(photo, Buffer.from("/9j/4AAQSkZJRgAB", "base64"), { contentType: "image/jpeg" });
  await admin.from("bookings").update({ before_photos: [photo] }).eq("id", done.id);
  const inv = await getOrCreateBookingInvoice(admin, { bookingId: done.id, customerId: dRow!.customer_id, type: "full_balance", net: 45, description: "E2E" });
  await admin.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", inv.invoiceId);

  check("customer detail needs admin", (await http(`/api/admin/customers/${dRow!.customer_id}`)).status === 401);
  const detail = await http(`/api/admin/customers/${dRow!.customer_id}`, { token: at });
  check("customer detail shows history and lifetime spend", detail.json.success && detail.json.stats.bookings === 1 && detail.json.stats.paid === 45, detail.text.slice(0, 140));
  check("erase needs admin", (await http(`/api/admin/customers/${dRow!.customer_id}/erase`, { method: "POST" })).status === 401);

  const live = await makeBooking({ status: "booking_confirmed", clean_date: dayShift(9) });
  const { data: lRow } = await admin.from("bookings").select("customer_id").eq("id", live.id).single();
  const blocked = await http(`/api/admin/customers/${lRow!.customer_id}/erase`, { method: "POST", token: at });
  check("erase is refused while a booking is still live (409, names it)", blocked.status === 409 && (blocked.json.blockedBy ?? []).includes(live.reference), blocked.text.slice(0, 140));

  const er = await http(`/api/admin/customers/${dRow!.customer_id}/erase`, { method: "POST", token: at });
  check("erase succeeds for a finished customer", er.status === 200 && er.json.success && er.json.photosDeleted === 1, er.text.slice(0, 140));
  const { data: cAfter } = await admin.from("customers").select("full_name, email, phone").eq("id", dRow!.customer_id).single();
  const { data: aAfter } = await admin.from("addresses").select("line_1, city, postcode").eq("id", dRow!.address_id).single();
  const { data: bAfter } = await admin.from("bookings").select("special_instructions, before_photos").eq("id", done.id).single();
  check("name/email/phone anonymised", cAfter?.full_name === "Erased customer" && /^erased\+/.test(cAfter.email) && cAfter.phone === "erased", JSON.stringify(cAfter));
  check("address erased, only the outward postcode kept", aAfter?.line_1 === "Erased" && aAfter.city === null && aAfter.postcode === "SW1A", JSON.stringify(aAfter));
  check("notes cleared and photo list emptied", bAfter?.special_instructions === null && (bAfter?.before_photos ?? []).length === 0);
  const { data: files } = await admin.storage.from("job-photos").list(done.id);
  check("the photo file itself is deleted from storage", (files ?? []).length === 0);
  const { data: invAfter } = await admin.from("invoices").select("total, status").eq("id", inv.invoiceId).single();
  check("the invoice (a legal record) is kept untouched", Number(invAfter?.total) === 45 && invAfter?.status === "paid");
  check("erasing twice is refused", (await http(`/api/admin/customers/${dRow!.customer_id}/erase`, { method: "POST", token: at })).status === 409);
}

async function signInAs(c: { email: string; password: string }) {
  const client = anon();
  const { data } = await client.auth.signInWithPassword({ email: c.email, password: c.password });
  return { client, token: data.session!.access_token };
}

async function phase9() {
  console.log("— phase 9: pricing settings, decline, time off, availability");
  const ADMIN_PW = process.env.E2E_ADMIN_PW;

  // ── cleaners: decline ──
  const a = await makeCleaner("p9a", { dbs: true });
  const b = await makeCleaner("p9b", { dbs: true });
  const sa = await signInAs(a);
  const sb = await signInAs(b);
  const job = await makeBooking({ status: "cleaner_assigned", clean_date: dayShift(21), clean_time: "13:00", assigned_cleaner_id: a.id });

  check("decline needs a reason", (await http(`/api/cleaner/jobs/${job.id}/decline`, { method: "POST", token: sa.token, body: {} })).status === 400);
  check("another cleaner can NOT decline someone else's job (404)", (await http(`/api/cleaner/jobs/${job.id}/decline`, { method: "POST", token: sb.token, body: { reason: "nope nope" } })).status === 404);
  const dec = await http(`/api/cleaner/jobs/${job.id}/decline`, { method: "POST", token: sa.token, body: { reason: "I'm unwell" } });
  check("cleaner can decline a job", dec.status === 200 && dec.json.success, dec.text.slice(0, 140));
  const { data: afterDec } = await admin.from("bookings").select("status, assigned_cleaner_id").eq("id", job.id).single();
  check("declined job is re-matched to a DIFFERENT cleaner", !!afterDec?.assigned_cleaner_id && afterDec.assigned_cleaner_id !== a.id && afterDec.status === "cleaner_assigned", JSON.stringify(afterDec));
  const { data: declineRow } = await admin.from("booking_declines").select("reason").eq("booking_id", job.id).eq("cleaner_id", a.id).maybeSingle();
  check("decline recorded with reason", declineRow?.reason === "I'm unwell");
  check("declining the same job again is refused (it isn't theirs any more)", (await http(`/api/cleaner/jobs/${job.id}/decline`, { method: "POST", token: sa.token, body: { reason: "again again" } })).status === 404);
  const started = await makeBooking({ status: "in_progress", clean_date: todayInLondon(), assigned_cleaner_id: a.id });
  check("a started job can't be declined (409)", (await http(`/api/cleaner/jobs/${started.id}/decline`, { method: "POST", token: sa.token, body: { reason: "too late" } })).status === 409);

  // ── time off ──
  const past = await http("/api/cleaner/time-off", { method: "POST", token: sb.token, body: { startDate: dayShift(-2), endDate: dayShift(1) } });
  check("time off can't start in the past", past.status === 400);
  check("end before start is refused", (await http("/api/cleaner/time-off", { method: "POST", token: sb.token, body: { startDate: dayShift(30), endDate: dayShift(29) } })).status === 400);
  check("over 90 days is refused", (await http("/api/cleaner/time-off", { method: "POST", token: sb.token, body: { startDate: dayShift(30), endDate: dayShift(130) } })).status === 400);
  check("time off needs a login", (await http("/api/cleaner/time-off")).status === 401);

  const away = await makeBooking({ status: "cleaner_assigned", clean_date: dayShift(28), clean_time: "13:00", assigned_cleaner_id: b.id });
  const safe = await makeBooking({ status: "cleaner_assigned", clean_date: dayShift(35), clean_time: "13:00", assigned_cleaner_id: b.id });
  const to = await http("/api/cleaner/time-off", { method: "POST", token: sb.token, body: { startDate: dayShift(27), endDate: dayShift(29), reason: "Holiday" } });
  check("time off booked; the job inside it is released", to.status === 200 && to.json.success && to.json.released === 1, to.text.slice(0, 140));
  const { data: awayRow } = await admin.from("bookings").select("assigned_cleaner_id").eq("id", away.id).single();
  const { data: safeRow } = await admin.from("bookings").select("assigned_cleaner_id").eq("id", safe.id).single();
  check("released job is NOT given back to the cleaner who is away", awayRow?.assigned_cleaner_id !== b.id);
  check("a job outside the time off is untouched", safeRow?.assigned_cleaner_id === b.id);
  const listed = await http("/api/cleaner/time-off", { token: sb.token });
  check("time off is listed", (listed.json.timeOff ?? []).length === 1 && listed.json.timeOff[0].reason === "Holiday");
  const ownRead = await sb.client.from("cleaner_time_off").select("id");
  const otherRead = await sa.client.from("cleaner_time_off").select("id");
  check("RLS: a cleaner reads only their OWN time off", (ownRead.data ?? []).length === 1 && (otherRead.data ?? []).length === 0);
  const offId = listed.json.timeOff[0].id;
  await http(`/api/cleaner/time-off?id=${offId}`, { method: "DELETE", token: sa.token });
  const { count: stillThere } = await admin.from("cleaner_time_off").select("id", { count: "exact", head: true }).eq("id", offId);
  check("another cleaner can't delete your time off", stillThere === 1);
  await http(`/api/cleaner/time-off?id=${offId}`, { method: "DELETE", token: sb.token });
  const { count: gone } = await admin.from("cleaner_time_off").select("id", { count: "exact", head: true }).eq("id", offId);
  check("you can delete your own time off", gone === 0);

  // ── weekly availability ──
  const slots = [{ dayOfWeek: 1, startTime: "08:00", endTime: "12:00" }, { dayOfWeek: 1, startTime: "14:00", endTime: "18:00" }, { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" }];
  const put = await http("/api/cleaner/availability", { method: "PUT", token: sa.token, body: { slots } });
  const get = await http("/api/cleaner/availability", { token: sa.token });
  check("availability saved and read back (HH:MM)", put.json.success && JSON.stringify(get.json.slots) === JSON.stringify(slots), get.text.slice(0, 160));
  check("overlapping slots are refused", (await http("/api/cleaner/availability", { method: "PUT", token: sa.token, body: { slots: [{ dayOfWeek: 2, startTime: "09:00", endTime: "13:00" }, { dayOfWeek: 2, startTime: "12:00", endTime: "16:00" }] } })).status === 400);
  check("slots under an hour are refused", (await http("/api/cleaner/availability", { method: "PUT", token: sa.token, body: { slots: [{ dayOfWeek: 2, startTime: "09:00", endTime: "09:30" }] } })).status === 400);
  const unchanged = await http("/api/cleaner/availability", { token: sa.token });
  check("a refused save leaves the old availability intact", JSON.stringify(unchanged.json.slots) === JSON.stringify(slots));
  check("availability needs a login", (await http("/api/cleaner/availability")).status === 401);
  const ownAvail = await sa.client.from("cleaner_availability").select("id");
  check("RLS: a cleaner reads their own availability in the app", (ownAvail.data ?? []).length === 3);

  // ── admin pricing settings ──
  if (!ADMIN_PW) { console.log("SKIP  admin pricing checks (set E2E_ADMIN_PW)"); return; }
  const { data: as } = await anon().auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PW });
  const at = as!.session!.access_token;
  const detail = await http(`/api/admin/cleaners/${a.id}`, { token: at });
  check("admin sees the decline count on the cleaner", detail.json.success && detail.json.declines30d === 1, String(detail.json.declines30d));

  const orig = (await http("/api/admin/settings", { token: at })).json.settings;
  check("pricing columns present in settings", orig.hourly_rate !== undefined && orig.min_hours !== undefined && orig.deposit_percentage !== undefined);
  check("absurd pricing is refused", (await http("/api/admin/settings", { method: "PATCH", token: at, body: { hourly_rate: 1 } })).status === 400 && (await http("/api/admin/settings", { method: "PATCH", token: at, body: { deposit_percentage: 500 } })).status === 400);
  const before = await http("/api/bookings", { method: "POST", headers: fwd(), body: { serviceType: "regular_cleaning", fullName: "E2E Price", email: `delivered+e2e-price1-${stamp}@resend.dev`, phone: "07700900111", propertyType: "flat", frequency: "one_off", hours: 3, line1: "1 Price St", postcode: "SW1A 1AA", cleanDate: dayShift(40) } });
  const sv = await http("/api/admin/settings", { method: "PATCH", token: at, body: { hourly_rate: 20, min_hours: 4, deposit_percentage: 25 } });
  check("owner can change rate, minimum hours and deposit", sv.json.success === true);
  const after = await http("/api/bookings", { method: "POST", headers: fwd(), body: { serviceType: "regular_cleaning", fullName: "E2E Price", email: `delivered+e2e-price2-${stamp}@resend.dev`, phone: "07700900112", propertyType: "flat", frequency: "one_off", hours: 3, line1: "2 Price St", postcode: "SW1A 1AA", cleanDate: dayShift(41) } });
  for (const r of [before.json.reference, after.json.reference]) {
    const { data: row } = await admin.from("bookings").select("id, customer_id, address_id").eq("reference", r).maybeSingle();
    if (row) { ids.bookings.push(row.id); ids.customers.push(row.customer_id); ids.addresses.push(row.address_id); }
  }
  check("new booking uses the new rate and enforces the new 4h minimum (3h asked → 4h × £20 = £80)", after.json.total === 80, String(after.json.total));
  const { data: oldRow } = await admin.from("bookings").select("deposit_percentage, quote_total").eq("reference", before.json.reference).single();
  const { data: newRow } = await admin.from("bookings").select("deposit_percentage, quote_total").eq("reference", after.json.reference).single();
  check("old booking keeps its price and 20% deposit; new one stamps 25%", Number(oldRow?.quote_total) === 45 && Number(oldRow?.deposit_percentage) === 20 && Number(newRow?.deposit_percentage) === 25, JSON.stringify({ oldRow, newRow }));
  await http("/api/admin/settings", { method: "PATCH", token: at, body: { hourly_rate: Number(orig.hourly_rate), min_hours: Number(orig.min_hours), deposit_percentage: Number(orig.deposit_percentage) } });
  const restored = (await http("/api/admin/settings", { token: at })).json.settings;
  check("pricing restored after the test", Number(restored.hourly_rate) === Number(orig.hourly_rate) && Number(restored.deposit_percentage) === Number(orig.deposit_percentage));
}

const dayShift = (n: number) => {
  const d = new Date(`${todayInLondon()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function phase8() {
  console.log("— phase 8: booking changes & self-service");
  const ADMIN_PW = process.env.E2E_ADMIN_PW;
  const { generateBookingToken } = await import("../lib/tokens");
  const worker = await makeCleaner("p8", { dbs: true });

  // ── customer reschedule ──
  const job = await makeBooking({ status: "booking_confirmed", clean_date: dayShift(7) });
  await autoAssignBooking(job.id, "system");
  const tok = generateBookingToken(job.id)!;
  const det = await http("/api/booking/manage/details", { method: "POST", headers: fwd(), body: { bookingId: job.id, token: tok } });
  check("manage page details load (changeable, in free window)", det.json.success && det.json.changeable === true && det.json.withinFreeWindow === true, det.text.slice(0, 140));
  check("manage details with a bad token → 401", (await http("/api/booking/manage/details", { method: "POST", headers: fwd(), body: { bookingId: job.id, token: "bad-bad-bad-bad" } })).status === 401);
  check("a token for another booking does not work", (await http("/api/booking/manage/details", { method: "POST", headers: fwd(), body: { bookingId: job.id, token: generateBookingToken(ids.bookings[0])! } })).status === 401);
  check("reschedule to a date < 2 days away is refused", (await http("/api/booking/manage/reschedule", { method: "POST", headers: fwd(), body: { bookingId: job.id, token: tok, cleanDate: dayShift(1) } })).status === 400);
  const rs = await http("/api/booking/manage/reschedule", { method: "POST", headers: fwd(), body: { bookingId: job.id, token: tok, cleanDate: dayShift(14) } });
  check("customer can reschedule", rs.status === 200 && rs.json.success, rs.text.slice(0, 140));
  const { data: moved } = await admin.from("bookings").select("clean_date, status, assigned_cleaner_id").eq("id", job.id).single();
  check("new date saved and a cleaner re-matched automatically", moved?.clean_date === dayShift(14) && moved.status === "cleaner_assigned" && !!moved.assigned_cleaner_id, JSON.stringify(moved));

  // ── 48h rule is enforced server-side ──
  const soon = await makeBooking({ status: "booking_confirmed", clean_date: dayShift(1) });
  const soonTok = generateBookingToken(soon.id)!;
  const soonDet = await http("/api/booking/manage/details", { method: "POST", headers: fwd(), body: { bookingId: soon.id, token: soonTok } });
  check("inside 48h the page says withinFreeWindow=false", soonDet.json.withinFreeWindow === false);
  check("inside 48h: reschedule refused (409)", (await http("/api/booking/manage/reschedule", { method: "POST", headers: fwd(), body: { bookingId: soon.id, token: soonTok, cleanDate: dayShift(10) } })).status === 409);
  check("inside 48h: cancel refused (409)", (await http("/api/booking/manage/cancel", { method: "POST", headers: fwd(), body: { bookingId: soon.id, token: soonTok } })).status === 409);

  // ── customer cancel with money paid ──
  const paidJob = await makeBooking({ status: "booking_confirmed", clean_date: dayShift(7) });
  await autoAssignBooking(paidJob.id, "system");
  const { data: pj } = await admin.from("bookings").select("customer_id").eq("id", paidJob.id).single();
  const dep = await getOrCreateBookingInvoice(admin, { bookingId: paidJob.id, customerId: pj!.customer_id, type: "deposit", net: 9, description: "E2E deposit" });
  await admin.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", dep.invoiceId);
  const open = await getOrCreateBookingInvoice(admin, { bookingId: paidJob.id, customerId: pj!.customer_id, type: "full_balance", net: 36, description: "E2E balance" });
  const cx = await http("/api/booking/manage/cancel", { method: "POST", headers: fwd(), body: { bookingId: paidJob.id, token: generateBookingToken(paidJob.id)!, reason: "e2e" } });
  check("customer can cancel (outside 48h)", cx.status === 200 && cx.json.success && cx.json.refundDue === 9, cx.text.slice(0, 140));
  const { data: cxRow } = await admin.from("bookings").select("status, assigned_cleaner_id, is_flagged, flag_reason").eq("id", paidJob.id).single();
  check("cancelled: cleaner released, refund flagged for admin", cxRow?.status === "cancelled" && cxRow.assigned_cleaner_id === null && cxRow.is_flagged === true && /refund/i.test(cxRow.flag_reason ?? ""), JSON.stringify(cxRow));
  const { data: openAfter } = await admin.from("invoices").select("status").eq("id", open.invoiceId).single();
  check("unpaid invoice voided on cancel", openAfter?.status === "cancelled");
  check("cancelling twice is refused", (await http("/api/booking/manage/cancel", { method: "POST", headers: fwd(), body: { bookingId: paidJob.id, token: generateBookingToken(paidJob.id)!, } })).status === 409);

  // ── stop a recurring series (the root is long finished — the normal case) ──
  const root = await makeBooking({ frequency: "weekly", status: "paid", clean_date: dayShift(-7), assigned_cleaner_id: worker.id });
  await generateRecurringVisits(todayInLondon());
  const { data: kids } = await admin.from("bookings").select("id, status, clean_date").eq("parent_booking_id", root.id).order("clean_date", { ascending: false });
  ids.bookings.push(...(kids ?? []).map((k) => k.id));
  check("series generated upcoming visits", (kids?.length ?? 0) >= 1, String(kids?.length));
  const stop = await http("/api/booking/manage/cancel", { method: "POST", headers: fwd(), body: { bookingId: kids![0].id, token: generateBookingToken(kids![0].id)!, scope: "series" } });
  check("customer can stop the whole series from a visit", stop.status === 200 && stop.json.success, stop.text.slice(0, 140));
  const { data: rootAfter } = await admin.from("bookings").select("frequency, next_occurrence_date").eq("id", root.id).single();
  const { data: kidsAfter } = await admin.from("bookings").select("status, clean_date").eq("parent_booking_id", root.id);
  check("root stops generating; visits ≥2 days away cancelled, those inside 48h kept", rootAfter?.frequency === "one_off" && (kidsAfter ?? []).filter((k) => k.clean_date >= dayShift(2)).every((k) => k.status === "cancelled") && (kidsAfter ?? []).filter((k) => k.clean_date <= dayShift(1)).every((k) => k.status !== "cancelled"), JSON.stringify({ rootAfter, kidsAfter }));
  const regen = await generateRecurringVisits(todayInLondon());
  const { count: kidCount } = await admin.from("bookings").select("id", { count: "exact", head: true }).eq("parent_booking_id", root.id);
  check("no new visits are generated after the series is stopped", kidCount === (kids?.length ?? 0), `${kidCount} vs ${kids?.length} (created ${regen.created})`);

  // ── admin side ──
  if (!ADMIN_PW) { console.log("SKIP  admin edit checks (set E2E_ADMIN_PW)"); return; }
  const { data: as } = await anon().auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PW });
  const at = as!.session!.access_token;
  const eb = await makeBooking({ status: "booking_confirmed", clean_date: dayShift(7) });
  await autoAssignBooking(eb.id, "system");
  const ed = await http(`/api/admin/bookings/${eb.id}`, { method: "PATCH", token: at, body: { cleanDate: dayShift(14), cleanTime: "16:00", notifyCustomer: false } });
  const { data: edRow } = await admin.from("bookings").select("clean_date, clean_time, assigned_cleaner_id, status").eq("id", eb.id).single();
  check("admin can move a booking; cleaner is re-matched", ed.json.success && edRow?.clean_date === dayShift(14) && String(edRow.clean_time).startsWith("16:00") && edRow.status === "cleaner_assigned", ed.text.slice(0, 140) + JSON.stringify(edRow));
  const edNotes = await http(`/api/admin/bookings/${eb.id}`, { method: "PATCH", token: at, body: { specialInstructions: "Key under the mat", bedrooms: 3 } });
  const { data: nRow } = await admin.from("bookings").select("special_instructions, bedrooms").eq("id", eb.id).single();
  check("admin can edit notes and rooms without touching the schedule", edNotes.json.success && nRow?.special_instructions === "Key under the mat" && nRow.bedrooms === 3);
  const badAddr = await http(`/api/admin/bookings/${eb.id}`, { method: "PATCH", token: at, body: { address: { line1: "9 New Road", postcode: "ZZ9 9ZZ" }, notifyCustomer: false } });
  const { data: bRow } = await admin.from("bookings").select("assigned_cleaner_id, status").eq("id", eb.id).single();
  check("moving the address out of every cleaner's area un-assigns (no one covers ZZ9)", badAddr.json.success && bRow?.assigned_cleaner_id === null && bRow.status === "booking_confirmed", JSON.stringify(bRow));
  const started = await makeBooking({ status: "in_progress", clean_date: todayInLondon() });
  check("a job in progress cannot be rescheduled by admin (409)", (await http(`/api/admin/bookings/${started.id}`, { method: "PATCH", token: at, body: { cleanDate: dayShift(9) } })).status === 409);
  check("booking edit needs admin", (await http(`/api/admin/bookings/${eb.id}`, { method: "PATCH", body: {} })).status === 401);

  // admin cancel via the pipeline status route uses the same engine
  const adminCancel = await makeBooking({ status: "booking_confirmed", clean_date: dayShift(8) });
  await autoAssignBooking(adminCancel.id, "system");
  const ac = await http(`/api/admin/bookings/${adminCancel.id}/status`, { method: "PATCH", token: at, body: { status: "cancelled" } });
  const { data: acRow } = await admin.from("bookings").select("status, assigned_cleaner_id").eq("id", adminCancel.id).single();
  check("admin 'cancelled' releases the cleaner too", ac.json.success && acRow?.status === "cancelled" && acRow.assigned_cleaner_id === null);

  // logs
  check("system log needs admin", (await http("/api/admin/logs")).status === 401);
  const lg = await http("/api/admin/logs?level=all&days=1", { token: at });
  check("system log loads for admin", lg.status === 200 && Array.isArray(lg.json.logs));
}

async function phase7() {
  console.log("— phase 7: applications, manual booking, settings");
  const ADMIN_PW = process.env.E2E_ADMIN_PW;
  if (!ADMIN_PW) { console.log("SKIP  admin checks (set E2E_ADMIN_PW)"); return; }
  const adminClient = anon();
  const { data: as, error: ae } = await adminClient.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PW });
  check("admin can sign in", !ae && !!as.session, ae?.message);
  const at = as!.session!.access_token;

  // applications
  const email = `delivered+e2e-app-${stamp}@resend.dev`;
  ids.applicationEmails.push(email);
  const body = { fullName: "E2E Applicant", email, phone: "07700900321", postcode: "SW1A 1AA", areas: "SW1, sw3", experienceYears: 3, hasRightToWork: true, hasDbs: false };
  const a1 = await http("/api/cleaners/apply", { method: "POST", headers: fwd(), body });
  check("public cleaner application accepted", a1.json.success === true, a1.text.slice(0, 120));
  const a2 = await http("/api/cleaners/apply", { method: "POST", headers: fwd(), body });
  const { count: appCount } = await admin.from("cleaner_applications").select("id", { count: "exact", head: true }).ilike("email", email);
  check("duplicate pending application is not stored twice", a2.json.success === true && appCount === 1, String(appCount));
  const bot = await http("/api/cleaners/apply", { method: "POST", headers: fwd(), body: { ...body, email: `delivered+e2e-bot-${stamp}@resend.dev`, website: "http://spam" } });
  const { count: botCount } = await admin.from("cleaner_applications").select("id", { count: "exact", head: true }).ilike("email", `%e2e-bot-${stamp}%`);
  check("honeypot submission silently dropped", bot.json.success === true && botCount === 0);
  const anonRead = await anon().from("cleaner_applications").select("id").limit(1);
  check("anon can NOT read applications", !anonRead.error && (anonRead.data ?? []).length === 0);
  check("applications list needs admin", (await http("/api/admin/applications")).status === 401);
  const list = await http("/api/admin/applications?status=new", { token: at });
  const mine = (list.json.applications ?? []).find((x: { email: string }) => x.email === email);
  check("admin sees the application", !!mine);
  const ap = await http(`/api/admin/applications/${mine?.id}/approve`, { method: "POST", token: at, body: {} });
  check("approve creates the cleaner", ap.status === 200 && ap.json.success, ap.text.slice(0, 140));
  if (ap.json.cleanerId) {
    ids.cleaners.push(ap.json.cleanerId);
    const { data: cl } = await admin.from("cleaners").select("auth_user_id, dbs_verified, cleaner_coverage_areas(postcode_prefix)").eq("id", ap.json.cleanerId).single();
    if (cl?.auth_user_id) ids.auth.push(cl.auth_user_id);
    const prefixes = ((cl?.cleaner_coverage_areas ?? []) as { postcode_prefix: string }[]).map((c) => c.postcode_prefix).sort();
    check("login created, coverage areas copied (uppercased), DBS left unverified", !!cl?.auth_user_id && cl.dbs_verified === false && prefixes.join() === "SW1,SW3", prefixes.join());
  }
  check("second approve is refused (409)", (await http(`/api/admin/applications/${mine?.id}/approve`, { method: "POST", token: at, body: {} })).status === 409);
  const email2 = `delivered+e2e-app2-${stamp}@resend.dev`;
  ids.applicationEmails.push(email2);
  await http("/api/cleaners/apply", { method: "POST", headers: fwd(), body: { ...body, email: email2 } });
  const l2 = await http("/api/admin/applications?status=new", { token: at });
  const m2 = (l2.json.applications ?? []).find((x: { email: string }) => x.email === email2);
  const rj = await http(`/api/admin/applications/${m2?.id}/reject`, { method: "POST", token: at, body: { note: "e2e" } });
  const { data: rejRow } = await admin.from("cleaner_applications").select("status").eq("id", m2?.id).single();
  check("reject marks it rejected", rj.json.success === true && rejRow?.status === "rejected");
  const again = await http("/api/cleaners/apply", { method: "POST", headers: fwd(), body });
  check("an existing cleaner cannot re-apply (409)", again.status === 409);

  // manual booking
  const mb = await http("/api/admin/bookings", { method: "POST", token: at, body: { serviceType: "end_of_tenancy", fullName: "E2E Phone", email: `delivered+e2e-phone-${stamp}@resend.dev`, phone: "07700900654", propertyType: "flat", line1: "3 Test Lane", postcode: "SW1A 1AA", quoteTotal: 220, sendQuote: false } });
  check("admin can create a booking by hand", mb.json.success === true && mb.json.total === 220, mb.text.slice(0, 140));
  if (mb.json.id) {
    const { data: m } = await admin.from("bookings").select("id, source, status, customer_id, address_id, quote_total").eq("id", mb.json.id).single();
    if (m) { ids.bookings.push(m.id); ids.customers.push(m.customer_id); ids.addresses.push(m.address_id); }
    check("manual booking tagged source=phone, price set, quote NOT auto-sent", m?.source === "phone" && Number(m.quote_total) === 220 && m.status === "inquiry");
  }
  check("manual booking route needs admin", (await http("/api/admin/bookings", { method: "POST", body: {} })).status === 401);

  // settings
  const before = await http("/api/admin/settings", { token: at });
  const orig = before.json.settings;
  const sv = await http("/api/admin/settings", { method: "PATCH", token: at, body: { customer_sms_enabled: false, google_review_link: "https://g.page/r/e2e" } });
  const after = await http("/api/admin/settings", { token: at });
  check("settings save and read back", sv.json.success && after.json.settings.customer_sms_enabled === false && after.json.settings.google_review_link === "https://g.page/r/e2e");
  check("invalid review link rejected", (await http("/api/admin/settings", { method: "PATCH", token: at, body: { google_review_link: "not a url" } })).status === 400);
  await http("/api/admin/settings", { method: "PATCH", token: at, body: { customer_sms_enabled: orig.customer_sms_enabled, google_review_link: orig.google_review_link ?? "" } });
}

async function cleanup() {
  console.log("\n— cleanup");
  try {
    if (ids.photos.length) await admin.storage.from("job-photos").remove(ids.photos);
    // children of series first (FK is SET NULL, but delete explicitly)
    await admin.from("email_outbox").delete().in("booking_id", ids.bookings);
    await admin.from("bookings").delete().in("parent_booking_id", ids.bookings);
    await admin.from("bookings").delete().in("id", ids.bookings);
    await admin.from("customers").delete().in("id", ids.customers);
    await cleanupEvents();
    for (const e of ids.applicationEmails) await admin.from("cleaner_applications").delete().ilike("email", e);
    await admin.from("cleaner_applications").delete().ilike("email", `%e2e-bot-${stamp}%`);
    await admin.from("addresses").delete().in("id", ids.addresses);
    await admin.from("cleaners").delete().in("id", ids.cleaners);
    for (const id of ids.auth) await admin.auth.admin.deleteUser(id);
    await admin.from("server_logs").delete().ilike("metadata->>to", `%e2e-%${stamp}%`);
    const { count } = await admin.from("bookings").select("id", { count: "exact", head: true }).ilike("reference", `E2E-${stamp}%`);
    console.log(`left-over E2E bookings: ${count ?? 0}`);
  } catch (e) {
    console.log("cleanup error:", e);
  }
}

main()
  .catch((e) => { failures++; console.error("E2E crashed:", e); })
  .finally(async () => {
    await cleanup();
    await admin.from("settings").update({ email_paused: priorPaused }).eq("id", 1);
    // Belt and braces: anything this run's own cleanup missed is a bug in the test — remove it AND fail loudly.
    try {
      const missed = await sweepStale("after the run");
      if (missed > 0) { failures++; console.log(`FAIL  this run's cleanup left ${missed} test rows behind (now swept) — fix the tracking in scripts/e2e.ts`); }
    } catch (e) { failures++; console.log("FAIL  final sweep:", e instanceof Error ? e.message : e); }
    console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} FAILED`}`);
    process.exit(failures === 0 ? 0 : 1);
  });
