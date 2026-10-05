/**
 * Day-by-day copy for the quote & deposit follow-up drips (see engine.ts for
 * the sender). Direct-response structure: every message has ONE job (answer a
 * question, show value, build trust, remove a friction, handle price, create
 * honest urgency, close gracefully), a single clear next step, and a human
 * tone — compelling, never pushy.
 *
 * HONESTY RULES (these are conversion assets, not just ethics — one false
 * claim ruins trust): only claim what is true.
 *  - DBS-checked: auto-assign only ever picks DBS-verified cleaners.
 *  - OWNER-CONFIRMED facts (stated by the owner, 2026-10-05 — do not remove):
 *    "we're fully insured", "popular slots fill up", "get your full deposit back"
 *    (end of tenancy), "most people pay within a day or two".
 *  - Also true: a slot is only held once the deposit is paid.
 *  - Do NOT invent anything else: no review counts, statistics, fake deadlines or scarcity.
 *  - Never "confirm your quote" — the CTA is always "pay a small deposit to
 *    secure your date" (tasks/lessons.md Lesson 3).
 *
 * SMS only exists for days 1-5 (channel drops after that); WhatsApp stands
 * alone with every detail a customer needs.
 */

export interface FollowupVars {
  firstName: string;
  total: string; // formatted, e.g. "£85.00"
  reference: string;
  actionLink: string;
  phone: string;
}

export interface DayContent {
  emailSubject: (v: FollowupVars) => string;
  emailBody: (v: FollowupVars) => string;
  sms?: (v: FollowupVars) => string;
  whatsapp: (v: FollowupVars) => string;
}

const p = (...lines: string[]) => lines.map((l) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">${l}</p>`).join("");

// ── QUOTE sequence — they haven't paid their deposit yet ───────────────────
export const QUOTE_FOLLOWUP_DAYS: Record<number, DayContent> = {
  // Day 1 — be helpful, lower the barrier to replying.
  1: {
    emailSubject: (v) => `${v.firstName}, quick question about your clean`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Did your fixed price (<strong>${v.total}</strong>, ref ${v.reference}) cover everything you were hoping for? If anything's unclear — or you'd like something added — just reply or call us on ${v.phone} and we'll sort it.`,
      `When you're happy, a small deposit holds your date. The rest is only due after the clean.`
    ),
    sms: (v) => `Hi ${v.firstName}, it's Ample Cleaners — does your ${v.total} price cover everything you wanted? Reply or call ${v.phone} and we'll sort it.`,
    whatsapp: (v) => `Hi ${v.firstName}! Quick question — does your fixed price (*${v.total}*, ref ${v.reference}) cover everything you wanted? Ask me anything and I'll sort it.\n\nReady to go? A small deposit holds your date: ${v.actionLink}`,
  },
  // Day 2 — certainty: the price is the price.
  2: {
    emailSubject: (v) => `${v.firstName}, no surprises — your price is final`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Here's the thing about your ${v.total} price: it's final. No "that'll be extra" on the day, no travel fee, no upcharge for a dirtier-than-expected oven.`,
      `You see the full cost before you pay a penny — and you only pay the balance once the job's done.`
    ),
    sms: (v) => `Ample Cleaners: your ${v.total} price is final — no extras on the day, ever. Secure your date: ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}, a quick one: your *${v.total}* price is final. No extras on the day, no travel fee, no surprises.\n\nYou only pay the balance after the clean. Secure your date: ${v.actionLink}`,
  },
  // Day 3 — trust: who's coming into your home.
  3: {
    emailSubject: (v) => `Who's actually coming into your home, ${v.firstName}?`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `It's a fair question, and it matters. Every Ample Cleaners cleaner is <strong>DBS-checked</strong> before they're ever matched to a job — you'll know their first name before they arrive — and <strong>we're fully insured</strong>.`,
      `If anything isn't right, tell us within 24 hours and we'll put it right. Your quote (ref ${v.reference}) is waiting whenever you are.`
    ),
    sms: (v) => `Hi ${v.firstName}, every Ample Cleaners cleaner is DBS-checked and we're fully insured. Your quote: ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}, who comes into your home matters. Every cleaner is *DBS-checked* before they're matched to you, you'll know their first name before the day, and we're *fully insured*.\n\nNot happy with anything? Tell us within 24 hours and we'll put it right.\n\nYour quote (ref ${v.reference}, *${v.total}*): ${v.actionLink}`,
  },
  // Day 4 — friction: how little effort this is.
  4: {
    emailSubject: (v) => `Booking takes about a minute, ${v.firstName}`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Here's all that's left: tap the button, pay a small deposit by card or bank transfer, and your date is held. Your cleaner does the rest and you come home to a clean house.`,
      `Pets, tricky access, something specific you'd like us to focus on? Tell us and we'll add it to your cleaner's notes.`
    ),
    sms: (v) => `Hi ${v.firstName}, all that's left is a small deposit — about a minute — and your date is held: ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}, all that's left is a small deposit — about a minute, card or bank transfer — and your date is held.\n\nAnything we should know (pets, access, focus areas)? Just tell me.\n\nSecure your date: ${v.actionLink}`,
  },
  // Day 5 — price objection + risk reversal.
  5: {
    emailSubject: (v) => `${v.firstName}, is it the price? Here's how we make it low-risk`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `If ${v.total} feels like a lot to commit to, here's how we keep the risk low: you only pay a small deposit now (and it comes <em>off</em> your total, not on top), you can move or cancel free up to 48 hours before, and the balance is only due after the clean.`,
      `Still not right? Tell us what would make it work — we're happy to talk it through on ${v.phone}.`
    ),
    sms: (v) => `Hi ${v.firstName}, small deposit now, free changes up to 48h before, balance only after the clean. Low-risk: ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}, if the price (*${v.total}*) is giving you pause, here's how we keep it low-risk:\n\n• Small deposit now — it comes *off* your total\n• Free changes/cancellation up to 48h before\n• Balance only after the clean\n\nSecure your date: ${v.actionLink}\nOr tell me what would make it work: ${v.phone}`,
  },
  // Day 6 — honest urgency: the only real constraint.
  6: {
    emailSubject: (v) => `${v.firstName}, your date isn't held yet`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `A straight heads-up: popular slots fill up, and until your deposit is paid your date isn't reserved — we book first-come, first-served, and we can't hold a slot for you without it.`,
      `If your date matters, securing it today takes a minute. Ref ${v.reference}, ${v.total}.`
    ),
    whatsapp: (v) => `Hi ${v.firstName}, a straight heads-up: popular slots fill up, and your date isn't held until the deposit's paid — we book first-come, first-served and can't reserve a slot without it.\n\nRef ${v.reference}, *${v.total}*: ${v.actionLink}`,
  },
  // Day 7 — a graceful breakup (often the highest-reply message in a sequence).
  7: {
    emailSubject: (v) => `Should I close your quote, ${v.firstName}?`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `This is my last note about quote ${v.reference}, so I don't clutter your inbox. If the time isn't right, no hard feelings at all — and if you'd like a fresh quote later, we're one message away.`,
      `If you do still want a spotless home, your price is here whenever you are.`
    ),
    whatsapp: (v) => `Hi ${v.firstName}, last note from me on quote ${v.reference} (*${v.total}*) — I don't want to clog your phone! If the time's not right, no hard feelings.\n\nStill want it? ${v.actionLink} or ${v.phone}.`,
  },
};

// ── DEPOSIT sequence — they've reserved, just need to pay ──────────────────
export const DEPOSIT_FOLLOWUP_DAYS: Record<number, DayContent> = {
  1: {
    emailSubject: (v) => `One step left to lock in your date, ${v.firstName}`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `You're one step from booked. Pay your deposit (<strong>${v.total}</strong>, ref ${v.reference}) and your date is held — it comes straight off your final balance, so it's not an extra cost.`,
      `Card or bank transfer, whichever's easier — about a minute.`
    ),
    sms: (v) => `Hi ${v.firstName}, one step left: pay your ${v.total} deposit to hold your date (it comes off your total): ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}! One step left to lock in your date — your deposit of *${v.total}* (ref ${v.reference}). It comes *off* your total, not on top.\n\nCard or bank: ${v.actionLink}\nQuestions: ${v.phone}`,
  },
  2: {
    emailSubject: (v) => `${v.firstName}, your deposit isn't an extra cost`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Just so it's clear: your ${v.total} deposit (ref ${v.reference}) isn't on top of anything — it's deducted from what you owe after the clean. Pay by card, or by bank transfer with no fee.`
    ),
    sms: (v) => `Ample Cleaners: your ${v.total} deposit comes OFF your total — it's not extra. Card or bank transfer: ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}, quick reassurance — your deposit (*${v.total}*, ref ${v.reference}) comes straight *off* your total, not on top.\n\nPay here: ${v.actionLink}`,
  },
  3: {
    emailSubject: (v) => `${v.firstName}, here's what your deposit locks in`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `The moment ref ${v.reference} is paid, your date is reserved and we match you with a DBS-checked cleaner — no chasing, no last-minute juggling on your side.`,
      `The deposit is ${v.total}. If anything's stopping you from paying today, tell us and we'll help.`
    ),
    sms: (v) => `Hi ${v.firstName}, once your ${v.total} deposit is in, your date is held and we match you with a DBS-checked cleaner. ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}, once your deposit is in (*${v.total}*, ref ${v.reference}), your date is reserved and we match you with a DBS-checked cleaner.\n\nPay here: ${v.actionLink}\nAnything stopping you? ${v.phone}`,
  },
  4: {
    emailSubject: (v) => `${v.firstName}, prefer to pay by bank transfer?`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `If you'd rather not use a card online, you can pay ref ${v.reference} (${v.total}) by bank transfer — no fee. The details are on your booking page; just use your reference as the payment reference.`
    ),
    whatsapp: (v) => `Hi ${v.firstName}, if you'd rather not pay by card, you can use bank transfer — no fee. Details for ref ${v.reference} (*${v.total}*) are on your booking page.\n\nOr pay online: ${v.actionLink}`,
  },
  5: {
    emailSubject: (v) => `${v.firstName}, did this slip down your list?`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Easily done — most people pay within a day or two, so if ref ${v.reference} (${v.total}) slipped down your to-do list, here's your nudge. It takes a minute to pay, and then your date is held and you can forget about it.`
    ),
    sms: (v) => `Hi ${v.firstName}, did this slip down your list? ${v.total} holds your date — a minute to pay: ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}, if ref ${v.reference} (*${v.total}*) slipped down your list — easily done! Here's the link, a minute to pay: ${v.actionLink}\n\nAnything unclear, just ask — ${v.phone}`,
  },
  6: {
    emailSubject: (v) => `${v.firstName}, your date still isn't held`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `A straight heads-up: popular slots fill up, and your date is only reserved once the deposit is paid — we book first-come, first-served, so we can't hold it without that. If your date matters to you, it's worth doing today.`,
      `Ref ${v.reference}, ${v.total}.`
    ),
    whatsapp: (v) => `Hi ${v.firstName}, a straight heads-up: popular slots fill up, and your date is only reserved once the deposit's paid — first-come, first-served.\n\nRef ${v.reference}, *${v.total}*: ${v.actionLink}`,
  },
  7: {
    emailSubject: (v) => `Last note about your booking, ${v.firstName}`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `This is my last reminder about ref ${v.reference}. If your plans have changed, no hard feelings at all. If you'd still like a spotless home, you can secure your date any time — or message us and we'll help.`
    ),
    whatsapp: (v) => `Hi ${v.firstName}, last note from me on ref ${v.reference} (*${v.total}*). Plans changed? No hard feelings. Still want to go ahead? ${v.actionLink} or ${v.phone}`,
  },
};
