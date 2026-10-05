const fs = require("fs");
function edit(f, pairs) {
  let s = fs.readFileSync(f, "utf8");
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error(f + " missing: " + a.slice(0, 80));
    s = s.replace(a, b);
  }
  fs.writeFileSync(f, s);
}

/* ── follow-up sequences ── */
edit("lib/followups/content.ts", [
  // Day 3 (quote): trust + insurance
  [
    "Every Ample Cleaners cleaner is <strong>DBS-checked</strong> before they're ever matched to a job — and you'll know their first name before they arrive.`,\n      `If anything isn't right, tell us within 24 hours and we'll put it right.",
    "Every Ample Cleaners cleaner is <strong>DBS-checked</strong> before they're ever matched to a job — you'll know their first name before they arrive — and <strong>we're fully insured</strong>.`,\n      `If anything isn't right, tell us within 24 hours and we'll put it right.",
  ],
  [
    "sms: (v) => `Hi ${v.firstName}, every Ample Cleaners cleaner is DBS-checked, and you'll know their name before they arrive. Your quote: ${v.actionLink}`,",
    "sms: (v) => `Hi ${v.firstName}, every Ample Cleaners cleaner is DBS-checked and we're fully insured. Your quote: ${v.actionLink}`,",
  ],
  [
    "Every cleaner is *DBS-checked* before they're matched to you, and you'll know their first name before the day.",
    "Every cleaner is *DBS-checked* before they're matched to you, you'll know their first name before the day, and we're *fully insured*.",
  ],
  // Day 6 (quote): popular slots fill up
  [
    "A straight heads-up: until your deposit is paid, your date isn't reserved — we book on a first-come, first-served basis, and we can't hold a slot for you without it.`,\n      `If your date matters, securing it today takes a minute.",
    "A straight heads-up: popular slots fill up, and until your deposit is paid your date isn't reserved — we book first-come, first-served, and we can't hold a slot for you without it.`,\n      `If your date matters, securing it today takes a minute.",
  ],
  [
    "a straight heads-up: your date isn't held until the deposit's paid — we book first-come, first-served and can't reserve a slot without it.",
    "a straight heads-up: popular slots fill up, and your date isn't held until the deposit's paid — we book first-come, first-served and can't reserve a slot without it.",
  ],
  // Deposit day 5: most people pay within a day or two
  [
    "Easily done — if ref ${v.reference} (${v.total}) slipped down your to-do list, here's your nudge. It takes a minute to pay,",
    "Easily done — most people pay within a day or two, so if ref ${v.reference} (${v.total}) slipped down your to-do list, here's your nudge. It takes a minute to pay,",
  ],
  // Deposit day 6: popular slots fill up
  [
    "A straight heads-up: your date is only reserved once the deposit is paid — we book first-come, first-served, so we can't hold it without that.",
    "A straight heads-up: popular slots fill up, and your date is only reserved once the deposit is paid — we book first-come, first-served, so we can't hold it without that.",
  ],
  [
    "a straight heads-up: your date is only reserved once the deposit's paid — first-come, first-served.",
    "a straight heads-up: popular slots fill up, and your date is only reserved once the deposit's paid — first-come, first-served.",
  ],
]);

/* ── header comment: the honesty rules now reflect the owner's confirmed facts ── */
edit("lib/followups/content.ts", [
  [
    " *  - No insurance, review-count or \"most customers\" claims — none are backed by data.\n",
    " *  - OWNER-CONFIRMED facts (2026-10-05, stated by the owner — do not remove): \"we're fully insured\",\n *    \"popular slots fill up\", \"get your full deposit back\" (end of tenancy), \"most people pay within a\n *    day or two\". Do NOT invent further claims, review counts or statistics.\n",
  ],
  [
    " *  - Urgency is REAL and limited to: a slot is only held once the deposit is paid. Never \"slots fill up\", never invented scarcity or deadlines.\n",
    " *  - Urgency: popular slots fill up (owner-confirmed) and a slot is only held once the deposit is paid. No invented deadlines.\n",
  ],
]);

/* ── homepage ── */
edit("app/(public)/page.tsx", [
  [
    "description: \"A clean built around your check-out list, so you hand the keys back with confidence.\"",
    "description: \"Get your full deposit back — a clean built around your check-out list, so you hand the keys back with confidence.\"",
  ],
  [
    "    { icon: ShieldCheck, label: \"DBS-checked cleaners\" },\n",
    "    { icon: ShieldCheck, label: \"DBS-checked & fully insured\" },\n",
  ],
  [
    "a: \"Every cleaner is DBS-checked before they're ever matched to a job. You'll know who's coming — we tell you your cleaner's first name before the day.\"",
    "a: \"Every cleaner is DBS-checked before they're ever matched to a job, and we're fully insured. You'll know who's coming — we tell you your cleaner's first name before the day.\"",
  ],
  [
    "Your slot is only reserved once it's paid.",
    "Popular slots fill up, and yours is only reserved once the deposit's paid.",
  ],
]);

/* ── quote email: add the insurance line to the "what you get" list ── */
edit("lib/bookings/quoteDelivery.ts", [
  [
    "<li>A DBS-checked cleaner — you'll know their first name before the day</li>",
    "<li>A DBS-checked cleaner — you'll know their first name before the day — and we're fully insured</li>",
  ],
]);

console.log("claims restored");
