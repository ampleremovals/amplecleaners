/**
 * Day-by-day copy for the quote & deposit follow-up drips (see engine.ts for
 * the sender). Adapted from Ample Removals' proven pattern — compelling, not
 * pushy, "pay your deposit to secure your date" throughout (never "confirm"
 * — see tasks/lessons.md Lesson 3). Scoped to 7 days per sequence rather than
 * Removals' 14: cleaning is a lower-ticket, faster-decision service, so a
 * shorter, tighter ladder fits better — extend it later if data says otherwise.
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
  1: {
    emailSubject: (v) => `Any questions about your quote, ${v.firstName}?`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Just checking the quote we sent (ref ${v.reference}, ${v.total}) covered everything you were expecting. If anything's unclear, reply to this email or give us a call.`,
      `Whenever you're ready, a small deposit secures your date.`
    ),
    sms: (v) => `Hi ${v.firstName}, it's Ample Cleaners. Any questions on your quote? Happy to help - ${v.phone}`,
    whatsapp: (v) => `Hi ${v.firstName}! Following up on your quote (ref ${v.reference}, *${v.total}*). Happy to answer anything before you pay. Secure your date here: ${v.actionLink}\n\nOr call/message us on ${v.phone}.`,
  },
  2: {
    emailSubject: (v) => `What's included in ${v.reference}`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Quick one — your price of <strong>${v.total}</strong> is fully fixed. No "oh, that'll be extra" on the day.`,
      `We'd rather you knew exactly what you're paying for before you pay it.`
    ),
    sms: (v) => `Ample Cleaners: your quote (${v.total}, ref ${v.reference}) is fully fixed — no hidden extras. ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}, your quote (ref ${v.reference}, *${v.total}*) is fully fixed — no hidden extras on the day.\n\nSecure your date: ${v.actionLink}\nQuestions? ${v.phone}`,
  },
  3: {
    emailSubject: (v) => `${v.firstName}, why vetted cleaners matter`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Every cleaner on our books is vetted, and we're fully insured — so if something's ever not right, it's on us to sort, not you.`,
      `Your quote (ref ${v.reference}) is still open whenever you're ready to secure your date.`
    ),
    sms: (v) => `Hi ${v.firstName}, every Ample Cleaners cleaner is vetted & we're fully insured. Quote still open: ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}, every cleaner on our books is vetted, and we're fully insured.\n\nYour quote (ref ${v.reference}, *${v.total}*) is still open: ${v.actionLink}\nQuestions? ${v.phone}`,
  },
  4: {
    emailSubject: (v) => `${v.firstName}, here's how simple booking is`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Once your date's secured, that's it from you — your cleaner turns up, does the job, and you come home to a spotless space.`,
      `Tricky access, pets, specific instructions? Just tell us and we'll note it for your cleaner.`
    ),
    sms: (v) => `Hi ${v.firstName}, once your date's secured that's it from you - we handle the rest. Secure it: ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}, booking with us is genuinely simple - once your date's secured, your cleaner just turns up and does the job.\n\nAnything specific we should know? Tell us: ${v.phone}\nOr secure your date: ${v.actionLink}`,
  },
  5: {
    emailSubject: (v) => `${v.firstName}, your quote's still here`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `No rush — your quote (ref ${v.reference}) for <strong>${v.total}</strong> is ready whenever you are. Securing your date only takes a small deposit.`,
      `If price is what's holding you back, tell us — happy to talk it through.`
    ),
    sms: (v) => `Hi ${v.firstName}, your quote ${v.total} (ref ${v.reference}) is ready when you are. ${v.phone}`,
    whatsapp: (v) => `Hi ${v.firstName}, no rush - your quote (ref ${v.reference}, *${v.total}*) is ready whenever you decide.\n\nA small deposit secures your date: ${v.actionLink}\nCall/WhatsApp: ${v.phone}`,
  },
  6: {
    emailSubject: (v) => `${v.firstName}, dates do fill up`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Being straight with you: popular slots around your preferred date do fill up. If you already know you want to go ahead, it's worth securing it sooner rather than later.`,
      `Ref ${v.reference}, ${v.total} — still ready whenever you are.`
    ),
    whatsapp: (v) => `Hi ${v.firstName}, being straight with you - popular slots do fill up. If you know you want to go ahead, worth securing yours soon.\n\nRef ${v.reference}, *${v.total}*: ${v.actionLink}`,
  },
  7: {
    emailSubject: (v) => `Last note on this one, ${v.firstName}`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `This'll be our last email about this quote (ref ${v.reference}) — not giving up on helping, just not cluttering your inbox. If plans change or you'd like a fresh quote, we're one message away.`
    ),
    whatsapp: (v) => `Hi ${v.firstName}, last check-in on this quote (ref ${v.reference}, *${v.total}*) - not giving up, just not wanting to clog your phone!\n\nSecure your date any time: ${v.actionLink} or ${v.phone}.`,
  },
};

// ── DEPOSIT sequence — they've reserved, just need to pay ──────────────────
export const DEPOSIT_FOLLOWUP_DAYS: Record<number, DayContent> = {
  1: {
    emailSubject: (v) => `Let's get your date locked in, ${v.firstName}`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `The last step to lock in your date and cleaner is the deposit (${v.total}, ref ${v.reference}), which comes straight off your final balance.`,
      `Takes about a minute — card or bank transfer, whichever's easier.`
    ),
    sms: (v) => `Hi ${v.firstName}, pay your deposit (${v.total}, ${v.reference}) to lock in your date: ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}! Last step to lock in your date is the deposit - *${v.total}* (ref ${v.reference}), which comes off your final balance.\n\nPay here (card or bank): ${v.actionLink}\nQuestions: ${v.phone}`,
  },
  2: {
    emailSubject: (v) => `${v.firstName}, your deposit comes off the total`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Just a reassurance — your deposit (${v.total}, ref ${v.reference}) isn't an extra cost, it comes straight off what you owe. Card or bank transfer, your choice.`
    ),
    sms: (v) => `Ample Cleaners: deposit ${v.total} (ref ${v.reference}) comes off your total - card or bank transfer. ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}, quick reassurance - your deposit (*${v.total}*, ref ${v.reference}) comes straight off your total, not on top.\n\nPay here: ${v.actionLink}`,
  },
  3: {
    emailSubject: (v) => `${v.firstName}, here's what the deposit locks in`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Once ref ${v.reference} is paid, your date and cleaner are reserved specifically for you — no last-minute juggling.`,
      `Deposit is ${v.total} — happy to help if anything's stopping you from paying today.`
    ),
    sms: (v) => `Hi ${v.firstName}, once your deposit (${v.total}, ${v.reference}) is in, your date & cleaner are reserved for you. ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}, once your deposit is in (*${v.total}*, ref ${v.reference}) your date and cleaner are reserved specifically for you.\n\nPay here: ${v.actionLink}\nAnything stopping you? ${v.phone}`,
  },
  4: {
    emailSubject: (v) => `${v.firstName}, prefer bank transfer?`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `If you'd rather not pay by card online, the bank transfer details for ref ${v.reference} (${v.total}) are on your booking page — use your reference as the payment reference.`
    ),
    whatsapp: (v) => `Hi ${v.firstName}, if you'd rather not pay by card, bank transfer details for ref ${v.reference} (*${v.total}*) are on your booking page.\n\nOr pay online: ${v.actionLink}`,
  },
  5: {
    emailSubject: (v) => `${v.firstName}, quick nudge on your deposit`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Most people pay within a day or two of their invoice landing, so if ref ${v.reference} (${v.total}) slipped down your list, this is your nudge. A minute to pay, and your date's locked in.`
    ),
    sms: (v) => `Hi ${v.firstName}, quick nudge - deposit ${v.total} (${v.reference}) locks in your date. ${v.actionLink}`,
    whatsapp: (v) => `Hi ${v.firstName}, quick nudge - if ref ${v.reference} (*${v.total}*) slipped down your list, here's the link: ${v.actionLink}\n\nAnything unclear, just ask - ${v.phone}`,
  },
  6: {
    emailSubject: (v) => `${v.firstName}, your slot is only fully reserved once paid`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `Being honest — popular slots do fill up, and yours is only fully reserved once the deposit's in. If your date matters to you, worth not leaving it too long.`,
      `Ref ${v.reference}, ${v.total}.`
    ),
    whatsapp: (v) => `Hi ${v.firstName}, being honest - popular slots fill up, and yours is only fully reserved once the deposit's in.\n\nRef ${v.reference}, *${v.total}*: ${v.actionLink}`,
  },
  7: {
    emailSubject: (v) => `Last note on your deposit, ${v.firstName}`,
    emailBody: (v) => p(
      `Hi ${v.firstName},`,
      `This is our last reminder about ref ${v.reference}. If your plans have changed, no hard feelings — and if you'd still like to go ahead, we're one message away.`
    ),
    whatsapp: (v) => `Hi ${v.firstName}, last note from us on ref ${v.reference} (*${v.total}*). Plans changed? No hard feelings. Still want to go ahead? ${v.actionLink} or ${v.phone}`,
  },
};
