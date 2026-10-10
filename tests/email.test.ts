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
