/**
 * End-to-end test against the REAL Supabase project + a local `next start`.
 * Creates clearly-marked throwaway data (emails @resend.dev test inboxes, refs
 * prefixed E2E) and deletes all of it at the end, pass or fail.
 *
 *   npx next build && npx next start -p 3120   (with STRIPE_WEBHOOK_SECRET=whsec_e2e_test)
 *   npx tsx --env-file=.env.local scripts/e2e.ts
 */
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { autoAssignBooking } from "../lib/automation/autoAssign";
import { generateRecurringVisits } from "../lib/automation/recurrence";
import { getOrCreateBookingInvoice } from "../lib/bookings/booking-invoice";
import { generateInvoiceToken } from "../lib/tokens";
import { todayInLondon } from "../lib/cleaner-auth";
import { defaultTasks } from "../lib/tasks-template";

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

async function main() {
  console.log(`\nE2E against ${URL_} via ${BASE}\n`);

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
  const pb = await http("/api/bookings", { method: "POST", body: { serviceType: "regular_cleaning", fullName: "E2E Public", email: `delivered+e2e-pub-${stamp}@resend.dev`, phone: "07700900888", propertyType: "flat", frequency: "one_off", hours: 3, line1: "9 Test Road", postcode: "SW1A 1AA", cleanDate: todayInLondon() } });
  check("public booking accepted", pb.json.success === true && pb.json.total === 45, pb.text.slice(0, 140));
  check("priced booking returns a quote path for the deposit CTA", typeof pb.json.quotePath === "string" && /^\/quote\/[0-9a-f-]{36}\//.test(pb.json.quotePath), String(pb.json.quotePath));
  if (pb.json.reference) {
    const { data: pub } = await admin.from("bookings").select("id, customer_id, address_id, tasks").eq("reference", pb.json.reference).single();
    if (pub) { ids.bookings.push(pub.id); ids.customers.push(pub.customer_id); ids.addresses.push(pub.address_id); }
    check("checklist seeded on creation", Array.isArray(pub?.tasks) && pub!.tasks.length > 5);
    const { data: sent } = await admin.from("bookings").select("status").eq("reference", pb.json.reference).single();
    check("priced booking auto-sent its quote (status quote_sent, no admin step)", sent?.status === "quote_sent", sent?.status);
  }

  const deep = await http("/api/bookings", { method: "POST", body: { serviceType: "deep_cleaning", fullName: "E2E Deep", email: `delivered+e2e-deep-${stamp}@resend.dev`, phone: "07700900777", propertyType: "house", line1: "2 Test Road", postcode: "SW1A 1AA", quoteTotal: 1 } });
  check("unpriced service: no instant quote, and a public quoteTotal is ignored", deep.json.success === true && deep.json.total === null && deep.json.quotePath === null, deep.text.slice(0, 140));
  if (deep.json.reference) {
    const { data: d } = await admin.from("bookings").select("id, status, customer_id, address_id, quote_total").eq("reference", deep.json.reference).single();
    if (d) { ids.bookings.push(d.id); ids.customers.push(d.customer_id); ids.addresses.push(d.address_id); }
    check("unpriced booking stays an inquiry with no price", d?.status === "inquiry" && d.quote_total === null);
  }

  await phase7();
}

async function phase7() {
  console.log("— phase 7: applications, manual booking, settings");
  const ADMIN_PW = process.env.E2E_ADMIN_PW;
  if (!ADMIN_PW) { console.log("SKIP  admin checks (set E2E_ADMIN_PW)"); return; }
  const adminClient = anon();
  const { data: as, error: ae } = await adminClient.auth.signInWithPassword({ email: "amplecleaner@gmail.com", password: ADMIN_PW });
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
    await admin.from("bookings").delete().in("parent_booking_id", ids.bookings);
    await admin.from("bookings").delete().in("id", ids.bookings);
    await admin.from("customers").delete().in("id", ids.customers);
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
    console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} FAILED`}`);
    process.exit(failures === 0 ? 0 : 1);
  });
