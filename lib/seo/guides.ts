import type { SeoServiceSlug } from "@/lib/seo/services";
import { MORE_GUIDES } from "@/lib/seo/guides-more";

/**
 * Cleaning guides (the blog). Written to be genuinely useful and shareable:
 * practical steps, UK-specific where it matters, no invented statistics and no
 * "best company" claims. Each guide points to the matching service page.
 */
export interface GuideSection {
  h: string;
  p?: string[];
  ul?: string[];
  ol?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  /** Meta description / share text (<= 158 chars). */
  description: string;
  /** Short line shown on cards. */
  summary: string;
  published: string;
  /** Minutes to read. */
  minutes: number;
  intro: string;
  sections: GuideSection[];
  faqs: { q: string; a: string }[];
  /** The service page this guide leads to. */
  service: SeoServiceSlug;
  /** Offer a print-friendly version (checklists). */
  printable?: boolean;
}

const CORE_GUIDES: Guide[] = [
  {
    slug: "end-of-tenancy-cleaning-checklist",
    title: "End of Tenancy Cleaning Checklist: Room by Room (UK Renters)",
    description: "A room-by-room end of tenancy cleaning checklist for UK renters: what landlords and agents check at check-out, and how to leave the property deposit-ready.",
    summary: "Everything letting agents look at on check-out day, room by room.",
    published: "2026-10-05", minutes: 6, service: "end-of-tenancy-cleaning", printable: true,
    intro: "At check-out, the property is usually compared with the inventory from when you moved in. The standard expected is generally the condition you received it in, allowing for fair wear and tear. This checklist covers what is most often looked at, so nothing gets missed on the last day.",
    sections: [
      { h: "Before you start", p: ["Find your check-in inventory and any photos from move-in day. They show the standard you are being measured against.", "Do the cleaning last, once your belongings are out. Cleaning around boxes means doing it twice."], ul: ["Rubber gloves, microfibre cloths, a scraper for limescale, a mop and a vacuum", "Oven cleaner and a descaler (never mix cleaning products, especially bleach with anything else)", "Bin bags, and a way to reach high shelves and the tops of cupboards"] },
      { h: "Kitchen", p: ["The kitchen is where most disputes start, so give it the most time."], ul: ["Oven: inside, racks, glass door and seals. Soak racks in hot soapy water", "Hob, extractor hood and filter: degrease thoroughly", "Fridge and freezer: empty, defrost, wipe inside and the door seals", "Inside every cupboard and drawer, and the tops of wall units", "Sink, taps and plughole: remove limescale and grease", "Dishwasher and washing machine: filter, seals and drawers", "Wipe tiles, splashbacks and the walls around the cooker", "Mop the floor, including under and behind movable appliances"] },
      { h: "Bathroom", ul: ["Toilet: base, behind the pan, under the seat and the cistern", "Bath, shower, screen and tiles: remove limescale and soap scum", "Descale the shower head and taps", "Scrub grout lines and silicone edges (mould, if present, needs bleach-free treatment and ventilation)", "Mirror, cabinet inside and out, and extractor fan cover", "Mop the floor and skirting"] },
      { h: "Living areas and bedrooms", ul: ["Dust everything high to low: light fittings, shelves, picture rails, door frames, skirting boards and radiators", "Wipe light switches, sockets and door handles", "Clean inside windows, frames and sills", "Vacuum carpets and under the furniture that stays; check for marks and treat stains early", "Wipe built-in wardrobes inside, and clean mirrored doors", "Mop hard floors and the corners"] },
      { h: "Last-day checks", ol: ["Walk the property with your inventory and tick off each item", "Take dated photos of every room once you finish", "Remove all rubbish, and check the loft, shed, garden and balcony if they are yours to leave clean", "Return all keys and take a photo or receipt of the handover"] },
      { h: "When it is worth hiring a professional", p: ["Many tenants book a professional end of tenancy clean because it is the most time-consuming part of moving out, and the oven, limescale and windows are the items most often queried. A professional clean follows a check-out standard so the work is done in one visit, which frees up your moving day."] },
    ],
    faqs: [
      { q: "Do I have to professionally clean when I move out?", a: "Your tenancy agreement says what is required. Many require the property returned to the condition it started in, allowing for fair wear and tear, and some specify professional cleaning. Check your agreement." },
      { q: "How long does an end of tenancy clean take?", a: "It depends on the size and condition of the property, from a few hours for a small flat to a full day or more for a large house. A quote is based on those factors." },
    ],
  },
  {
    slug: "how-to-get-your-deposit-back-england",
    title: "How to Get Your Tenancy Deposit Back in England: A Practical Guide",
    description: "A clear guide to getting your tenancy deposit back in England: protection rules, what landlords can deduct, evidence to keep, and what to do in a dispute.",
    summary: "Your rights, what can be deducted, and the evidence that protects you.",
    published: "2026-10-05", minutes: 6, service: "end-of-tenancy-cleaning",
    intro: "Most deposit disputes come down to evidence and expectations. This guide explains the main rules for assured shorthold tenancies in England, and the steps that make the biggest difference. It is general information, not legal advice; check gov.uk or Shelter for your situation. Scotland and Wales have different rules.",
    sections: [
      { h: "Your deposit must be protected", p: ["If you rent an assured shorthold tenancy in England and pay a deposit, your landlord or agent must protect it in a government-approved scheme (the Deposit Protection Service, MyDeposits or the Tenancy Deposit Scheme) within 30 days of receiving it, and give you the prescribed information about where it is held.", "If this is not done, you may have rights to challenge, so keep your payment records and ask your landlord for the scheme details."] },
      { h: "How much can a deposit be?", p: ["Under the Tenant Fees Act 2019, a deposit is capped at five weeks' rent where the annual rent is below £50,000, and six weeks' rent where it is £50,000 or more."] },
      { h: "What can be deducted, and what cannot", ul: ["Allowed, if you are responsible: unpaid rent, damage beyond fair wear and tear, missing items, and cleaning needed to return the property to the condition it started in", "Not allowed: ordinary fair wear and tear, such as light carpet wear or faded paint from age", "Landlords should be able to show the cost and evidence for each deduction"] },
      { h: "The evidence that protects you", ul: ["The signed check-in inventory, and any notes you made within the first days of the tenancy", "Dated photos and videos at move-in and again at move-out", "Receipts or invoices for cleaning and any repairs you arranged", "Messages and emails with your landlord or agent about the property's condition"] },
      { h: "On move-out day", ol: ["Clean the property to the standard of the check-in inventory, room by room", "Be present at the check-out inspection if you can, and take your own photos", "Return all keys and keep proof of the handover", "Give your forwarding address in writing"] },
      { h: "If there is a dispute", p: ["Once the deposit is protected in a scheme, you can raise a dispute through the scheme's free dispute resolution service if you cannot agree on deductions. Under the scheme rules, the undisputed part of the deposit should be returned promptly, so ask for it. Having dated photos and a record of cleaning makes your case much stronger."] },
    ],
    faqs: [
      { q: "How long does a landlord have to return my deposit?", a: "Under the scheme rules, once you and your landlord agree how much is returned, it should be paid back within 10 days. Check your scheme's guidance for the exact process." },
      { q: "Can my landlord deduct for normal wear and tear?", a: "No. Fair wear and tear from normal use is not a valid deduction. Damage or dirt beyond that, if you are responsible for it, can be." },
    ],
  },
  {
    slug: "deep-cleaning-checklist",
    title: "The Deep Cleaning Checklist: What to Clean That You Usually Skip",
    description: "A deep cleaning checklist for every room: the often-forgotten jobs, how often to do them, and an order of work that saves time.",
    summary: "The forgotten jobs a regular clean skips, room by room.",
    published: "2026-10-05", minutes: 5, service: "deep-cleaning", printable: true,
    intro: "A regular clean keeps a home tidy. A deep clean resets it by reaching the places that build up grease, limescale and dust over months. Doing it once or twice a year makes every regular clean easier.",
    sections: [
      { h: "The order that saves time", ol: ["Declutter and take out the rubbish first", "Work top to bottom: ceilings and light fittings, then walls and shelves, then floors", "Do one room at a time and finish it before moving on", "Leave floors for last in each room so you do not re-walk over clean ones"] },
      { h: "Kitchen", ul: ["Inside the oven, microwave and fridge", "Degrease the extractor, hob and the fronts of cupboards", "Descale the kettle and taps", "Clean behind and under appliances that can be moved safely", "Wipe the tops of wall cupboards and the inside of drawers"] },
      { h: "Bathroom", ul: ["Scrub tile grout and silicone edges", "Descale the shower head and taps", "Clean the extractor fan cover and the inside of the cabinet", "Wash the shower curtain or screen and bath mats"] },
      { h: "Living areas and bedrooms", ul: ["Wipe doors, frames, switches and skirting", "Clean inside windows and sills", "Vacuum under the sofa and bed, and the mattress", "Dust lampshades, curtains, picture frames and the tops of furniture", "Wash cushion covers and pillows where the labels allow"] },
      { h: "How often?", p: ["As a guide, kitchens and bathrooms benefit from a deep clean every three to six months, and the rest of the home once or twice a year. Homes with children, pets or smokers may need it more often."] },
    ],
    faqs: [
      { q: "What is the difference between a deep clean and a regular clean?", a: "A regular clean maintains a home that is already in good condition. A deep clean is slower and more detailed, and covers appliances, grout, windows, frames and the areas under furniture." },
    ],
  },
  {
    slug: "how-often-should-you-clean-every-room",
    title: "How Often Should You Clean Each Room? A Simple Schedule",
    description: "A realistic cleaning schedule: what to do daily, weekly, monthly and each season, so your home stays fresh without it taking over your weekend.",
    summary: "A simple daily, weekly, monthly and seasonal schedule.",
    published: "2026-10-05", minutes: 4, service: "house-cleaning", printable: true,
    intro: "There is no single right answer, but a simple rhythm keeps a home manageable. Treat this as a starting point and adjust for the size of your household, pets and how much time you are at home.",
    sections: [
      { h: "Daily (about ten minutes)", ul: ["Wash up or load the dishwasher, and wipe the worktops", "Wipe the hob after cooking", "Take out food waste", "Quick tidy of the living area"] },
      { h: "Weekly", ul: ["Clean the toilet, sink, bath or shower", "Vacuum all floors and mop hard floors", "Dust surfaces", "Change the bedding and towels", "Clean the kitchen sink and wipe the fridge handles and switches"] },
      { h: "Monthly", ul: ["Clean inside the microwave and wipe the fridge shelves", "Descale the kettle, taps and shower head", "Wipe skirting boards, doors and switches", "Vacuum the sofa and under the furniture"] },
      { h: "Every three to six months", ul: ["Clean the oven and the extractor filter", "Wash curtains and cushion covers", "Clean windows and sills", "Defrost the freezer", "Flip or rotate the mattress where advised"] },
      { h: "When a regular cleaner makes sense", p: ["If the weekly jobs are what eat your weekend, a regular visit from a cleaner covers kitchens, bathrooms and floors on a fixed day so you keep the time. Many households start with a deep clean and then keep it fresh with a weekly or fortnightly regular clean."] },
    ],
    faqs: [
      { q: "How many hours of cleaning does a home need each week?", a: "It varies with the size of the home and the number of people in it. Many one or two-bedroom homes are comfortably covered by a few hours of regular cleaning every week or two." },
    ],
  },
  {
    slug: "how-to-clean-an-oven",
    title: "How to Clean an Oven Properly (and When to Leave It to a Professional)",
    description: "Step-by-step oven cleaning: a simple method with safe products for the oven, racks, glass door and hob, plus when it is worth hiring a professional.",
    summary: "A step-by-step method, plus the mistakes to avoid.",
    published: "2026-10-05", minutes: 4, service: "deep-cleaning",
    intro: "A dirty oven is one of the most common reasons for end of tenancy deductions, and one of the most dreaded jobs. Done properly, it takes an afternoon rather than a weekend.",
    sections: [
      { h: "What you need", ul: ["Rubber gloves and a bin bag", "Oven cleaner, or bicarbonate of soda and white vinegar for lighter soiling", "A non-scratch scourer and microfibre cloths", "A large sink or bath for the racks"] },
      { h: "Method", ol: ["Make sure the oven is off and cool, then remove the racks, trays and any loose crumbs", "Soak the racks in hot water with washing-up liquid, or a bio-washing powder, for an hour or more", "Apply the oven cleaner to the interior following the label, avoiding heating elements, and leave for the recommended time (many are better left for a few hours)", "Wipe out the loosened grease with a damp cloth, repeating on stubborn spots", "Clean the glass door, including between the panes if your oven allows it, and the door seal gently", "Scrub the racks, rinse and dry them, then refit everything"] },
      { h: "Mistakes to avoid", ul: ["Never mix oven cleaner with other products, and always ventilate the room", "Do not use abrasive pads on enamel or glass", "Do not wet the fan, heating elements or electrics", "Follow the manufacturer's guidance, especially for self-cleaning ovens"] },
      { h: "When to hire a professional", p: ["If the oven has heavy, baked-on carbon, a fan oven that is hard to access, or you are moving out and short of time, a professional clean as part of a deep or end of tenancy clean is often quicker and more thorough."] },
    ],
    faqs: [
      { q: "Is bicarbonate of soda enough to clean an oven?", a: "It works well for light grease. Heavy build-up usually needs an oven cleaner or a longer soak." },
    ],
  },
  {
    slug: "after-builders-cleaning-guide",
    title: "After Builders Cleaning: What to Do and When to Do It",
    description: "A guide to cleaning after building work: why dust spreads, the right order to clean, and what to check before you call it finished.",
    summary: "Why builders' dust gets everywhere, and the order to clean in.",
    published: "2026-10-05", minutes: 4, service: "after-builders-cleaning",
    intro: "Building work, whether an extension, loft conversion or refurbishment, leaves fine dust that settles on every surface, including in rooms that were not being worked on. Cleaning in the right order avoids spreading it around.",
    sections: [
      { h: "When to clean", p: ["Wait until the builders have finished and the main rubble and waste have been removed. Cleaning too early means doing it again once work resumes."] },
      { h: "Order of work", ol: ["Remove rubbish, packaging and protective sheeting carefully so the dust does not spread", "Dust from the top down: ceilings, light fittings, tops of doors and units, shelves, windowsills and then skirting", "Clean windows and frames, removing paint and sealant splashes and stickers", "Clean and degrease the kitchen and bathrooms, including inside cupboards that were open during work", "Vacuum all floors with a good filter, then mop; repeat vacuuming after the dust settles", "Wipe switches, sockets and door handles, which collect plaster dust"] },
      { h: "What makes it harder", ul: ["Plaster and cement dust is very fine and returns as it settles", "Paint, silicone and adhesive residue need careful scraping and the right solvent", "Protective films left on for too long can leave marks"] },
      { h: "When to hire a specialist", p: ["A specialist builders' clean uses the right equipment and process for fine dust, and usually saves several days of work. It is a common final step before you move back in or hand over a property."] },
    ],
    faqs: [
      { q: "Should builders clean up after themselves?", a: "Builders normally remove waste and leave the site broom-clean. A detailed clean of dust and residue is often a separate job." },
    ],
  },
  {
    slug: "how-to-remove-limescale-and-mould-bathroom",
    title: "How to Remove Limescale and Bathroom Mould Safely",
    description: "Practical, safe ways to remove limescale and bathroom mould from taps, tiles, grout and shower screens, and how to stop them coming back.",
    summary: "Safe methods for limescale and mould, and how to stop them returning.",
    published: "2026-10-05", minutes: 4, service: "deep-cleaning",
    intro: "Limescale and mould are the two things that make a bathroom look neglected, and they are among the first things noticed at a check-out inspection. Both are easy to deal with when you use the right method.",
    sections: [
      { h: "Limescale", ul: ["Use a descaler or white vinegar, and leave it on for the time on the label", "For taps and shower heads, wrap a cloth soaked in vinegar around them, or soak a removable head in a bowl", "Wipe, rinse and dry, and use a squeegee after showers to slow it returning"] },
      { h: "Mould on tiles, silicone and grout", ul: ["Open a window or run the extractor fan during and after cleaning", "Apply a mould remover, following the label, and leave it before scrubbing with a brush", "Rinse and dry thoroughly", "If the silicone is blackened right through, it usually needs replacing rather than cleaning"] },
      { h: "Safety first", p: ["Never mix bleach with limescale removers, vinegar or other cleaning products, because it can release harmful gases. Use one product at a time, wear gloves, and ventilate the room."] },
      { h: "Stopping it coming back", ul: ["Ventilate after showers and keep the extractor fan clean", "Wipe the shower screen and tiles dry", "Fix leaks, because damp is what mould feeds on", "Keep up a weekly bathroom clean"] },
    ],
    faqs: [
      { q: "Is mould in a rented bathroom my responsibility?", a: "It depends on the cause. Damp from a leak or poor ventilation is normally the landlord's responsibility to fix, while condensation mould from daily use can be treated by regular cleaning and ventilation. Report it in writing early." },
    ],
  },
  {
    slug: "office-cleaning-checklist",
    title: "Office Cleaning Checklist: Daily, Weekly and Monthly Tasks",
    description: "An office cleaning checklist for small businesses: what to clean daily, weekly and monthly so your workplace stays hygienic and presentable.",
    summary: "What to clean daily, weekly and monthly in a small workplace.",
    published: "2026-10-05", minutes: 4, service: "office-cleaning", printable: true,
    intro: "A clean workplace is healthier, makes a better impression on visitors and is a better place to work. This checklist separates the jobs that need doing every day from those that can be done on a longer cycle.",
    sections: [
      { h: "Daily", ul: ["Empty bins and replace liners", "Wipe desks, shared surfaces, door handles and switches", "Clean and disinfect washrooms, and restock soap and paper", "Clean the kitchenette sink and worktops, and wipe appliances", "Vacuum or mop floors in the busiest areas"] },
      { h: "Weekly", ul: ["Vacuum all floors and mop hard floors", "Dust shelves, screens and window sills", "Clean the microwave, fridge exterior and kettle", "Wipe meeting-room tables and chairs"] },
      { h: "Monthly", ul: ["Clean inside windows and glass partitions", "Clean the inside of the fridge", "Dust vents, skirting and the tops of cabinets", "Spot-clean carpets and upholstery"] },
      { h: "In-house or outsourced?", p: ["Outsourcing to a cleaning company means a consistent schedule, the right equipment, and no cover to arrange when someone is off. Many offices prefer a visit outside working hours so the team arrives to a clean workplace."] },
    ],
    faqs: [
      { q: "How often should an office be cleaned?", a: "Washrooms, bins and shared surfaces benefit from daily attention. Floors and the kitchenette are usually done several times a week, and a deeper clean monthly." },
    ],
  },
];

export const GUIDES: Guide[] = [...CORE_GUIDES, ...MORE_GUIDES];

const BY_SLUG = new Map(GUIDES.map((g) => [g.slug, g]));
export const getGuide = (slug: string): Guide | undefined => BY_SLUG.get(slug);
