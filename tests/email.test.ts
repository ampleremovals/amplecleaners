import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { findVariables, interpolate, markupToHtml, markupToText } from "../lib/email/markup";
import { AUTOMATIONS, COMMON_VARIABLES, PREP_TIPS, TEMPLATES } from "../lib/email/defaults";
import { verifySvix } from "../lib/email/svix";

test("markup: paragraphs, bullets, bold and links render; everything else is escaped", () => {
  const html = markupToHtml("Hi **Sam**,\n\n- one\n- two\n\nSee [our site](https://www.amplecleaners.com) <script>alert(1)</script>");
  assert.match(html, /<strong>Sam<\/strong>/);
  assert.equal((html.match(/<li /g) ?? []).length, 2);
  assert.match(html, /<a href="https:\/\/www\.amplecleaners\.com"/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("markup: only http(s), mailto and tel links become links", () => {
  const html = markupToHtml("[bad](javascript:alert(1)) and [ok](mailto:a@b.co)");
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /href="mailto:a@b\.co"/);
});

test("interpolate: a customer's name can never inject markup or a link", () => {
  const out = interpolate("Hi {{firstName}}, {{quoteLink}}", { firstName: "**[x](https://evil.test)<b>**", quoteLink: "https://www.amplecleaners.com/quote/1" });
  const name = out.slice(3, out.indexOf(","));
  assert.doesNotMatch(name, /[[\]<>*]/, "markup characters are stripped from names");
  assert.doesNotMatch(markupToHtml(out), /href="https:\/\/evil\.test/, "a name never becomes a link");
  assert.match(out, /https:\/\/www\.amplecleaners\.com\/quote\/1/, "real URL variables are untouched");
});

test("interpolate: unknown or empty variables become empty, not 'undefined'", () => {
  assert.equal(interpolate("a{{nope}}b{{x}}c", { x: null }), "abc");
  assert.deepEqual(findVariables("{{a}} {{ b }} {{a}}"), ["a", "b"]);
});

test("markupToText strips markup", () => {
  assert.equal(markupToText("**Hi** [site](https://x.co)"), "Hi site: https://x.co");
});

test("defaults: every template only uses variables we provide", () => {
  for (const t of TEMPLATES) {
    const used = [t.subject, t.heading, t.body, t.ctaLabel ?? "", t.ctaUrl ?? ""].flatMap(findVariables);
    for (const v of used) assert.ok(v in COMMON_VARIABLES, `${t.key} uses unknown {{${v}}}`);
  }
});

test("defaults: every journey step points at a real template, and keys are unique", () => {
  const keys = new Set(TEMPLATES.map((t) => t.key));
  assert.equal(keys.size, TEMPLATES.length);
  assert.equal(new Set(AUTOMATIONS.map((a) => a.key)).size, AUTOMATIONS.length);
  for (const a of AUTOMATIONS) for (const s of a.steps) assert.ok(keys.has(s.template), `${a.key} → missing ${s.template}`);
});

test("defaults: a template with a button has a link for it", () => {
  for (const t of TEMPLATES) assert.equal(!!t.ctaLabel, !!t.ctaUrl, `${t.key}: button text and link must come together`);
});

test("defaults: copy honesty. No invented offers, stats or guarantees; never 'confirm your quote'", () => {
  const banned = /\b(\d+\s?%\s*off|discount|free (clean|quote)|limited time|today only|guarantee[ds]?|5-star|five-star|\d[\d,]*\+? (happy )?customers|best in)\b|confirm your quote/i;
  for (const t of TEMPLATES) for (const text of [t.subject, t.heading, t.body, t.ctaLabel ?? ""]) assert.doesNotMatch(text, banned, `${t.key}: "${text.slice(0, 60)}"`);
  for (const tip of Object.values(PREP_TIPS)) assert.doesNotMatch(tip, banned);
});

test("defaults: the copy never leans on a deadline we can't back", () => {
  for (const t of TEMPLATES) assert.doesNotMatch(`${t.subject} ${t.body}`, /expires?|last chance|hurry|only \d+ (slots|spaces)/i, t.key);
});

test("defaults: marketing mail is never the only thing standing between a customer and their booking", () => {
  // Booking-critical messages (missed call, close-file, prep, recovery) must be 'service', not suppressible marketing.
  for (const key of ["lead_not_answered", "quote_close_file", "prep_checklist", "rating_recovery"]) {
    assert.equal(TEMPLATES.find((t) => t.key === key)?.category, "service", key);
  }
  for (const key of ["abandoned_1", "abandoned_2", "post_clean_thanks", "review_google", "upsell_recurring", "rebook_nudge", "winback_60", "winback_180", "quote_winback"]) {
    assert.equal(TEMPLATES.find((t) => t.key === key)?.category, "marketing", key);
  }
});

function sign(id: string, ts: string, body: string, secret: string) {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return `v1,${crypto.createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`;
}

test("svix: accepts a correct signature, rejects tampering, replays and wrong secrets", () => {
  const secret = `whsec_${Buffer.from("super-secret-key-for-tests").toString("base64")}`;
  const now = 1_800_000_000_000;
  const ts = String(Math.floor(now / 1000));
  const body = JSON.stringify({ type: "email.delivered", data: { email_id: "abc" } });
  const sig = sign("msg_1", ts, body, secret);
  assert.equal(verifySvix(body, { id: "msg_1", timestamp: ts, signature: sig }, secret, now), true);
  assert.equal(verifySvix(body, { id: "msg_1", timestamp: ts, signature: `v1,bogus ${sig}` }, secret, now), true, "any matching signature in the list is enough");
  assert.equal(verifySvix(body + " ", { id: "msg_1", timestamp: ts, signature: sig }, secret, now), false, "body changed");
  assert.equal(verifySvix(body, { id: "msg_2", timestamp: ts, signature: sig }, secret, now), false, "id changed");
  assert.equal(verifySvix(body, { id: "msg_1", timestamp: ts, signature: sig }, `whsec_${Buffer.from("other").toString("base64")}`, now), false, "wrong secret");
  assert.equal(verifySvix(body, { id: "msg_1", timestamp: ts, signature: sig }, secret, now + 10 * 60_000), false, "replayed after 10 minutes");
  assert.equal(verifySvix(body, { id: null, timestamp: ts, signature: sig }, secret, now), false, "missing header");
});

// ── round two ───────────────────────────────────────────────────────────────
import { isAutoReply, parseAddress, stripQuotedReply } from "../lib/email/inbound-parse";
import { abArm } from "../lib/email/ab";
import { renderEmailHtml } from "../lib/email/layout";

test("inbound: sender addresses are parsed from 'Name <email>' and bare forms", () => {
  assert.deepEqual(parseAddress('"Pat Jones" <Pat@Example.com>'), { name: "Pat Jones", email: "pat@example.com" });
  assert.deepEqual(parseAddress("Pat <pat@example.com>"), { name: "Pat", email: "pat@example.com" });
  assert.deepEqual(parseAddress("pat@example.com"), { name: null, email: "pat@example.com" });
});

test("inbound: out-of-office, bounces and newsletters are recognised; a normal reply is not", () => {
  assert.equal(isAutoReply({ from: "a@b.co", subject: "Out of office: back Monday" }), true);
  assert.equal(isAutoReply({ from: "a@b.co", subject: "Automatic reply: Re: your quote" }), true);
  assert.equal(isAutoReply({ from: "mailer-daemon@x.com", subject: "hi" }), true);
  assert.equal(isAutoReply({ from: "a@b.co", subject: "Re: your quote", headers: { "Auto-Submitted": "auto-replied" } }), true);
  assert.equal(isAutoReply({ from: "a@b.co", subject: "Re: your quote", headers: { Precedence: "bulk" } }), true);
  assert.equal(isAutoReply({ from: "a@b.co", subject: "Re: your quote", headers: { "Auto-Submitted": "no" } }), false);
  assert.equal(isAutoReply({ from: "pat@gmail.com", subject: "Re: Your fixed price: £85", headers: {} }), false);
});

test("inbound: only the new text is kept, not the quoted history", () => {
  assert.equal(stripQuotedReply("Thursday works!\n\nOn Tue, 6 Oct 2026 at 10:00, Ample Cleaners <bookings@amplecleaners.com> wrote:\n> Hi Pat\n> your price"), "Thursday works!");
  assert.equal(stripQuotedReply("Yes please\n> quoted line\nand thanks"), "Yes please\nand thanks");
  assert.equal(stripQuotedReply("Just this."), "Just this.");
});

test("A/B: the same recipient always gets the same arm, and the split is roughly 50/50", () => {
  assert.equal(abArm("a@b.co|x"), abArm("a@b.co|x"));
  let b = 0;
  for (let i = 0; i < 2000; i++) if (abArm(`user${i}@example.com|rebook_nudge`) === "B") b++;
  assert.ok(b > 850 && b < 1150, `B share was ${b}/2000`);
});

test("layout: table-based, Outlook-safe button, light colour scheme, address and unsubscribe present", () => {
  const html = renderEmailHtml({
    heading: "Hello", bodyHtml: "<p>Hi</p>", cta: { label: "Go", href: "https://www.amplecleaners.com/x" },
    company: { name: "Ample Cleaners", address: "363 Heathway, Dagenham RM9 5AG", phone: "0333 000 0000", replyTo: null, googleReviewLink: null },
    unsubscribeHref: "https://www.amplecleaners.com/unsubscribe/abc",
  });
  assert.match(html, /<table role="presentation"/);
  assert.match(html, /name="color-scheme" content="light"/);
  assert.match(html, /<td[^>]*bgcolor="#15803d"[^>]*>\s*<a href="https:\/\/www\.amplecleaners\.com\/x"/);
  assert.match(html, /363 Heathway/);
  assert.match(html, /\/unsubscribe\/abc/);
  assert.doesNotMatch(html, /<script/i);
});

test("defaults: new templates are categorised so booking-critical ones can't be unsubscribed away", () => {
  const cat = (k: string) => TEMPLATES.find((t) => t.key === k)?.category;
  for (const k of ["lead_sla_alert", "quote_viewed_nudge", "visit_skipped"]) assert.equal(cat(k), "service", k);
  assert.equal(cat("anniversary_thanks"), "marketing");
});

test("defaults: text messages exist only on service templates, never marketing", () => {
  for (const t of TEMPLATES) if (t.category === "marketing") assert.ok(!t.sms && !t.whatsapp, `${t.key} is marketing and must not have a text version`);
  for (const t of TEMPLATES) for (const text of [t.sms, t.whatsapp]) if (text) assert.ok(text.length <= (text === t.sms ? 480 : 1000), t.key);
});

test("defaults: the team alert is never sent to the customer as a text", () => {
  const t = TEMPLATES.find((x) => x.key === "lead_sla_alert")!;
  assert.ok(!t.sms && !t.whatsapp);
});
