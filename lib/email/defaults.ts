/**
 * Default email templates and journey definitions. The database is the source of truth once a row exists
 * (the owner edits them in Admin → Automations); these are only inserted for keys that don't exist yet,
 * and are what "Reset to default" restores.
 *
 * HONESTY RULES (same as lib/followups/content.ts): only claim what is true. Owner-confirmed facts:
 * "we're fully insured", "popular slots fill up", "get your full deposit back" (end of tenancy),
 * "most people pay within a day or two"; cleaners are DBS-checked. No invented offers, discounts, review
 * counts, statistics or deadlines. The deposit call-to-action is always "secure your date" (never "confirm").
 *
 * Markup: blank line = paragraph · "- " = bullet · **bold** · [text](url) · {{variable}}.
 */

export type EmailCategory = "service" | "marketing";

export interface TemplateDef {
  key: string;
  name: string;
  category: EmailCategory;
  description: string;
  subject: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  /** A URL variable such as {{quoteLink}} (or a literal https URL). */
  ctaUrl?: string;
  /** Appears in the Campaigns picker. */
  campaign?: boolean;
}

/** Variables every template can use (the Templates screen lists them). Journey-specific extras are noted per journey. */
export const COMMON_VARIABLES: Record<string, string> = {
  firstName: "Customer's first name",
  reference: "Booking reference, e.g. REG-2026-X8K4P",
  serviceLabel: "Service name, e.g. Deep Cleaning",
  serviceLower: "Service name in lower case",
  cleanDate: "Date of the clean",
  quoteTotal: "Quoted price, e.g. £85.00",
  quoteLink: "Link to the customer's quote page (pay deposit)",
  manageLink: "Link to reschedule or cancel the booking",
  rateLink: "Link to rate the clean",
  bookingLink: "Link to the booking form for the same service",
  regularLink: "Link to the regular-cleaning booking form",
  googleReviewLink: "Your Google review link (Settings)",
  prepTips: "Service-specific preparation checklist",
  rating: "The star rating the customer gave",
  phone: "Company phone number",
  siteUrl: "Website address",
};

export const TEMPLATES: TemplateDef[] = [
  {
    key: "lead_not_answered",
    name: "Missed call — we tried to reach you",
    category: "service",
    description: "Sent when a lead is marked 'not answered' after a call attempt.",
    subject: "Sorry we missed you, {{firstName}}",
    heading: "We tried to reach you",
    body: `Hi {{firstName}},

We tried to call you about your {{serviceLower}} request ({{reference}}) but couldn't get through.

No problem. The quickest way forward is to **reply to this email** with a good time to call, or call us on {{phone}}.

Your request stays open, so we can pick up exactly where we left off.`,
  },
  {
    key: "quote_close_file",
    name: "Quote — should we close your file?",
    category: "service",
    description: "Sent once the follow-up ladder has finished and the quote is still unpaid.",
    subject: "{{firstName}}, shall we close your quote?",
    heading: "Your price is still waiting",
    body: `Hi {{firstName}},

We haven't heard back about your {{serviceLower}} ({{quoteTotal}}, ref {{reference}}), so unless we hear from you we'll close your quote for now.

If you'd still like it, a small deposit secures your date. Our popular slots do fill up, so if you have a particular day in mind it's best to book soon.

Not the right time, or something not quite right? Just reply and tell us. We'd genuinely like to know.`,
    ctaLabel: "Secure my date",
    ctaUrl: "{{quoteLink}}",
  },
  {
    key: "quote_winback",
    name: "Old quote — still need a clean?",
    category: "marketing",
    description: "A gentle nudge a month after a quote that was never taken up.",
    subject: "Still need your {{serviceLower}}, {{firstName}}?",
    heading: "Still thinking about a clean?",
    body: `Hi {{firstName}},

A while ago we sent you a price for a {{serviceLower}}. If you still need it, we'd be happy to refresh the quote for today's date.

It takes about two minutes, with no card needed and no obligation.`,
    ctaLabel: "Get my price",
    ctaUrl: "{{bookingLink}}",
  },
  {
    key: "abandoned_1",
    name: "Unfinished booking — reminder",
    category: "marketing",
    description: "An hour after someone started the booking form but didn't finish.",
    subject: "{{firstName}}, you're one step from your price",
    heading: "Pick up where you left off",
    body: `Hi {{firstName}},

You started a {{serviceLower}} booking on our website but didn't get to the end.

Your price only takes about two minutes. No card needed and no obligation.`,
    ctaLabel: "Finish my booking",
    ctaUrl: "{{bookingLink}}",
  },
  {
    key: "abandoned_2",
    name: "Unfinished booking — anything we can help with?",
    category: "marketing",
    description: "The morning after an unfinished booking. The last reminder, then we stop.",
    subject: "Anything we can help with, {{firstName}}?",
    heading: "Can we answer anything?",
    body: `Hi {{firstName}},

If something wasn't clear when you were looking at a {{serviceLower}} (the price, the timing, what's included), just **reply to this email** and a real person will answer.

Or if you're ready, your price is a couple of minutes away.`,
    ctaLabel: "Get my price",
    ctaUrl: "{{bookingLink}}",
  },
  {
    key: "prep_checklist",
    name: "Before your clean — how to prepare",
    category: "service",
    description: "Three days before the first clean, with tips for that service.",
    subject: "Getting ready for your clean on {{cleanDate}}",
    heading: "Your clean is coming up",
    body: `Hi {{firstName}},

Your {{serviceLower}} is booked for **{{cleanDate}}** (ref {{reference}}). A little preparation helps us do the best job:

{{prepTips}}

Need to change something? You can reschedule or cancel from the link below.`,
    ctaLabel: "Manage my booking",
    ctaUrl: "{{manageLink}}",
  },
  {
    key: "post_clean_thanks",
    name: "After the clean — how did we do?",
    category: "marketing",
    description: "A few hours after the clean is finished. Asks for a quick rating.",
    subject: "How was your clean, {{firstName}}?",
    heading: "How did we do?",
    body: `Hi {{firstName}},

Thank you for choosing Ample Cleaners for your {{serviceLower}}.

It takes ten seconds to tell us how it went. Your rating goes straight to the team and helps us look after you (and your cleaner) properly.`,
    ctaLabel: "Rate my clean",
    ctaUrl: "{{rateLink}}",
  },
  {
    key: "review_google",
    name: "Happy customer — Google review ask",
    category: "marketing",
    description: "Sent after a 4 or 5 star rating, if a Google review link is set in Settings.",
    subject: "Thank you, {{firstName}}. Could you share it on Google?",
    heading: "Thank you for the {{rating}} stars",
    body: `Hi {{firstName}},

Thank you for rating your clean {{rating}}/5. It really makes the team's day.

If you have a minute, a Google review helps other people in your area find a cleaner they can trust.`,
    ctaLabel: "Leave a Google review",
    ctaUrl: "{{googleReviewLink}}",
  },
  {
    key: "rating_recovery",
    name: "Unhappy customer — we'll put it right",
    category: "service",
    description: "Sent after a rating of 3 or below. The admin is alerted separately.",
    subject: "We're sorry, {{firstName}}. Let us put it right",
    heading: "We'd like to put this right",
    body: `Hi {{firstName}},

You rated your recent clean {{rating}}/5 and we're sorry we missed the mark.

Please **reply to this email** and tell us what happened. We'll come back to you personally and sort it out.`,
  },
  {
    key: "upsell_recurring",
    name: "One-off customer — make it regular",
    category: "marketing",
    description: "Two days after a one-off clean, suggests a regular clean instead.",
    subject: "Keep it this fresh, {{firstName}}",
    heading: "Keep your home this fresh",
    body: `Hi {{firstName}},

We hope you're enjoying your freshly cleaned home.

A regular clean (weekly, fortnightly or monthly) keeps it that way without you having to think about it. You'll see your exact price in about two minutes, and there's no card needed and no obligation.`,
    ctaLabel: "See my regular price",
    ctaUrl: "{{regularLink}}",
  },
  {
    key: "rebook_nudge",
    name: "Time for another clean?",
    category: "marketing",
    description: "Three weeks after a one-off clean with nothing booked since.",
    subject: "Time for another clean, {{firstName}}?",
    heading: "Ready for another clean?",
    body: `Hi {{firstName}},

It's been a few weeks since your {{serviceLower}}. If you'd like us back, booking again takes about two minutes. Our popular slots do fill up, so earlier is easier.`,
    ctaLabel: "Book again",
    ctaUrl: "{{bookingLink}}",
  },
  {
    key: "winback_60",
    name: "Win-back — two months on",
    category: "marketing",
    description: "About 60 days after the last clean, if nothing has been booked since.",
    subject: "We'd love to look after your home again, {{firstName}}",
    heading: "We've missed you",
    body: `Hi {{firstName}},

It's been a couple of months since we cleaned for you. If your home could use another visit, we'd be glad to help, and the booking form takes about two minutes.

If something about your last clean wasn't right, **reply to this email** and tell us. We'd rather know.`,
    ctaLabel: "Book a clean",
    ctaUrl: "{{bookingLink}}",
  },
  {
    key: "winback_180",
    name: "Win-back — six months on",
    category: "marketing",
    description: "About six months after the last clean, if nothing has been booked since.",
    subject: "Still here when you need us, {{firstName}}",
    heading: "Still here when you need us",
    body: `Hi {{firstName}},

It's been a while since your last clean with us. Whenever you need a hand (a deep clean, a regular clean, or help before a move) we're here, and we're fully insured.

Booking takes about two minutes.`,
    ctaLabel: "Get a price",
    ctaUrl: "{{bookingLink}}",
  },
  {
    key: "campaign_spring",
    name: "Campaign — spring clean",
    category: "marketing",
    description: "A seasonal one-off email for Campaigns. Edit before sending.",
    subject: "Spring clean time, {{firstName}}?",
    heading: "Ready for a spring clean?",
    body: `Hi {{firstName}},

Spring is the time most people give their home a proper reset. If you'd like a deep clean, our team can do it for you, and you'll see your price in about two minutes.

Our popular slots do fill up in busy weeks, so book early if you have a date in mind.`,
    ctaLabel: "Get my price",
    ctaUrl: "{{bookingLink}}",
    campaign: true,
  },
  {
    key: "campaign_christmas",
    name: "Campaign — before Christmas",
    category: "marketing",
    description: "A seasonal one-off email for Campaigns. Edit before sending.",
    subject: "Ready for Christmas, {{firstName}}?",
    heading: "Get your home ready for Christmas",
    body: `Hi {{firstName}},

Guests coming over? A clean before the festive rush means you can enjoy it instead of scrubbing. Our popular slots do fill up in December, so it's best to book early.

You'll see your exact price in about two minutes.`,
    ctaLabel: "Book my clean",
    ctaUrl: "{{bookingLink}}",
    campaign: true,
  },
];

/**
 * Journeys. `steps[].hours` means different things per journey (see `timing`); the owner can change the
 * numbers and switch a journey off. Which customers qualify is decided in lib/email/journeys.ts.
 */
export interface AutomationDef {
  key: string;
  name: string;
  description: string;
  /** What the step timing counts from, shown beside the numbers in the admin. */
  timing: string;
  steps: { template: string; hours: number }[];
}

export const AUTOMATIONS: AutomationDef[] = [
  { key: "lead_not_answered", name: "Missed call", description: "A lead didn't pick up. Tell them the easy ways to reach us.", timing: "hours after the lead was marked 'not answered'", steps: [{ template: "lead_not_answered", hours: 0 }] },
  { key: "abandoned_form", name: "Unfinished booking form", description: "Someone gave their details but didn't finish. Two reminders, then we stop.", timing: "hours after they last typed on the form", steps: [{ template: "abandoned_1", hours: 1 }, { template: "abandoned_2", hours: 24 }] },
  { key: "quote_close_file", name: "Quote: close the file", description: "After the 7-day follow-up ladder, one last honest message.", timing: "hours after the quote was sent", steps: [{ template: "quote_close_file", hours: 192 }] },
  { key: "quote_winback", name: "Old quote win-back", description: "A month after a quote nobody took up.", timing: "hours after the quote was sent", steps: [{ template: "quote_winback", hours: 720 }] },
  { key: "prep_checklist", name: "Before your clean", description: "How to prepare, tailored to the service. First clean only.", timing: "sent once the clean is this many hours away", steps: [{ template: "prep_checklist", hours: 72 }] },
  { key: "post_clean", name: "After the clean: ask for a rating", description: "Thank them and ask how it went.", timing: "hours after the clean was completed", steps: [{ template: "post_clean_thanks", hours: 3 }] },
  { key: "review_request", name: "Happy customer: Google review", description: "Only after a 4 or 5 star rating.", timing: "hours after the rating", steps: [{ template: "review_google", hours: 1 }] },
  { key: "rating_recovery", name: "Unhappy customer: recovery", description: "After a rating of 3 or below, reach out personally.", timing: "hours after the rating", steps: [{ template: "rating_recovery", hours: 1 }] },
  { key: "upsell_recurring", name: "One-off → regular clean", description: "Suggest a regular clean to one-off customers.", timing: "hours after the clean", steps: [{ template: "upsell_recurring", hours: 48 }] },
  { key: "rebook", name: "Rebook nudge", description: "Three weeks on, nothing booked since.", timing: "hours after the clean", steps: [{ template: "rebook_nudge", hours: 504 }] },
  { key: "winback", name: "Win-back", description: "Bring lapsed customers back. Stops as soon as they book.", timing: "hours after their last clean", steps: [{ template: "winback_60", hours: 1440 }, { template: "winback_180", hours: 4320 }] },
];

/** Preparation tips per service, inserted as {{prepTips}}. */
export const PREP_TIPS: Record<string, string> = {
  regular_cleaning: `- Make sure we can get in (someone home, or a key safe)
- Tidy away personal items and valuables so every surface can be cleaned
- Tell us about pets, and anything you'd like us to focus on`,
  deep_cleaning: `- Make sure we can get in (someone home, or a key safe)
- Clear worktops, bathroom shelves and floors of personal items
- Point out any heavily soiled areas (oven, hob, limescale) so we can plan the time`,
  end_of_tenancy: `- Remove your belongings and empty wardrobes, cupboards and the fridge, so we can clean every surface
- Keep your agent's or landlord's checklist handy and tell us if there is one
- A thorough clean is the best way to get your full deposit back`,
  office_cleaning: `- Agree how we'll access the building. Please don't email alarm codes; call us instead
- Clear desks of loose papers and valuables
- Tell us about any areas that need special care`,
  after_builders: `- Remove tools, materials and large debris first
- Make sure water and electricity are on
- Tell us about new surfaces that need special care (worktops, glass, flooring)`,
};
